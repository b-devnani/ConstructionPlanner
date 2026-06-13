import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { z } from "zod";
import { procoreStorage as store } from "./procore-storage";
import { verifyPassword, hashPassword } from "./password";
import { insertUserSchema, FINANCIAL_ROLES, type UserRole } from "@shared/procore";
import { pool } from "./db";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Resolves the session secret. In production a strong secret MUST be provided
 * via SESSION_SECRET — a predictable fallback would let an attacker forge
 * session cookies. In dev we allow a fixed value for convenience.
 */
function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set to a strong value (>= 16 chars) in production",
    );
  }
  console.warn("[auth] SESSION_SECRET not set; using insecure dev fallback");
  return "construction-planner-dev-secret";
}

// ---------------------------------------------------------------------------
// Login rate limiting
//
// Simple in-memory sliding-window limiter keyed by client IP + email. Blocks
// brute force at the single-instance level; behind a load balancer each
// instance keeps its own counters, so for hard multi-instance guarantees move
// this to a shared store (Redis) or an edge/WAF rule. Successful logins clear
// the counter for the key.
// ---------------------------------------------------------------------------

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; firstAt: number }>();

function loginKey(req: Request, email: string): string {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";
  return `${ip}|${email.toLowerCase()}`;
}

function isRateLimited(key: string): boolean {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
}

// Opportunistic cleanup so the map can't grow unbounded
setInterval(() => {
  const now = Date.now();
  Array.from(loginAttempts.entries()).forEach(([key, entry]) => {
    if (now - entry.firstAt > LOGIN_WINDOW_MS) loginAttempts.delete(key);
  });
}, LOGIN_WINDOW_MS).unref();

/**
 * Sessions are stored in Postgres (connect-pg-simple) so they survive
 * restarts and are shared across instances.
 */
export function setupAuth(app: Express): void {
  // Required so x-forwarded-for is trusted behind a reverse proxy / LB and
  // secure cookies work when TLS is terminated upstream.
  app.set("trust proxy", 1);

  const PgStore = connectPgSimple(session);
  app.use(
    session({
      secret: resolveSessionSecret(),
      resave: false,
      saveUninitialized: false,
      store: new PgStore({
        pool, tableName: "session", createTableIfMissing: false,
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const key = loginKey(req, parsed.data.email);
    if (isRateLimited(key)) {
      return res.status(429).json({
        message: "Too many login attempts. Please wait a few minutes and try again.",
      });
    }
    const user = await store.getUserWithPassword(parsed.data.email);
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      recordFailure(key);
      return res.status(401).json({ message: "Invalid email or password" });
    }
    loginAttempts.delete(key);
    req.session.userId = user.id;
    const { passwordHash, ...safe } = user;
    return res.json(safe);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
    const user = await store.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not logged in" });
    return res.json(user);
  });

  // Everything else under /api requires a session
  app.use("/api", async (req, res, next) => {
    if (req.path.startsWith("/auth/")) return next();
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await store.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    return next();
  });
}

export async function currentUser(req: Request) {
  return req.session.userId ? store.getUser(req.session.userId) : undefined;
}

export function requireRole(roles: readonly UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await currentUser(req);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
        message: `This action requires one of the following roles: ${roles.join(", ")}`,
      });
    }
    return next();
  };
}

/** Guard for write operations on financial tools. */
export const requireFinancialRole = requireRole(FINANCIAL_ROLES);

export function registerUserRoutes(app: Express): void {
  app.get("/api/users", async (_req, res) => res.json(await store.getUsers()));

  app.post("/api/users", requireRole(["Admin", "Project Manager"]), async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      if (await store.getUserWithPassword(data.email)) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      const { password, ...rest } = data;
      const user = await store.createUser({ ...rest, passwordHash: hashPassword(password) });
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", requireRole(["Admin"]), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    if (req.session.userId === id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    if (!(await store.deleteUser(id))) return res.status(404).json({ message: "Not found" });
    return res.json({ success: true });
  });
}
