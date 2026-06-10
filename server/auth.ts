import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { z } from "zod";
import { procoreStorage as store } from "./procore-storage";
import { verifyPassword, hashPassword } from "./password";
import { insertUserSchema, FINANCIAL_ROLES, type UserRole } from "@shared/procore";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function setupAuth(app: Express): void {
  const MemoryStore = createMemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? "construction-planner-dev-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.post("/api/auth/login", (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = store.getUserWithPassword(parsed.data.email);
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    req.session.userId = user.id;
    const { passwordHash, ...safe } = user;
    return res.json(safe);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
    const user = store.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not logged in" });
    return res.json(user);
  });

  // Everything else under /api requires a session
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/auth/")) return next();
    if (!req.session.userId || !store.getUser(req.session.userId)) {
      return res.status(401).json({ message: "Authentication required" });
    }
    return next();
  });
}

export function currentUser(req: Request) {
  return req.session.userId ? store.getUser(req.session.userId) : undefined;
}

export function requireRole(roles: readonly UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = currentUser(req);
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

/** Directory management: create a user with a hashed password. */
export function registerUserRoutes(app: Express): void {
  app.get("/api/users", (_req, res) => res.json(store.getUsers()));

  app.post("/api/users", requireRole(["Admin", "Project Manager"]), (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      if (store.getUserWithPassword(data.email)) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      const { password, ...rest } = data;
      const user = store.createUser({ ...rest, passwordHash: hashPassword(password) });
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", requireRole(["Admin"]), (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    if (req.session.userId === id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    if (!store.deleteUser(id)) return res.status(404).json({ message: "Not found" });
    return res.json({ success: true });
  });
}
