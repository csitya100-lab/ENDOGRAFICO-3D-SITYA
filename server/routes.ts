import type { Express } from "express";
import { type Server } from "http";
import rateLimit from "express-rate-limit";

// ─── Rate limiting (relaxed in development) ───
const isDev = process.env.NODE_ENV === "development";

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 1000 : 10, // 1000/min in dev, 10/min in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em um minuto." },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/api/", apiLimiter);
  return httpServer;
}
