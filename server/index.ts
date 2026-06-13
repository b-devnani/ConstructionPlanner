import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { ensureSchema, closeDb, pool } from "./db";
import { seedIfEmpty } from "./seed";
import { initEmail, emailTransportMode } from "./email";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Bring up DB schema, optional demo seed, and email transport before
  // accepting requests. All three are safe to run concurrently from multiple
  // instances: ensureSchema is CREATE IF NOT EXISTS, seedIfEmpty short-circuits
  // when users already exist, and email init only touches local state.
  await ensureSchema();
  await seedIfEmpty();
  await initEmail();

  // Health/readiness probe — unauthenticated, registered before the /api auth
  // middleware. Returns 200 only when the database is reachable so load
  // balancers can pull an instance with a broken DB connection.
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      return res.json({
        status: "ok",
        db: "up",
        email: emailTransportMode(),
        uptime: Math.round(process.uptime()),
      });
    } catch (error) {
      return res.status(503).json({
        status: "degraded",
        db: "down",
        error: (error as Error).message,
      });
    }
  });

  // Sessions + login must be registered before any /api routes
  setupAuth(app);

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT ?? 5000);
  // No reusePort — each instance binds an exclusive port. Shared state lives
  // in PostgreSQL, so running multiple instances behind a load balancer is
  // safe; just give each its own port.
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });

  const shutdown = async () => {
    log("shutting down");
    server.close();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})();
