import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: { claims: { sub: string }; [key: string]: unknown };
    }
  }
}

/**
 * Middleware que exige utilizador autenticado (Replit Auth ou outro provider).
 * Se req.user não estiver definido, responde 401.
 */
export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.claims?.sub) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}
