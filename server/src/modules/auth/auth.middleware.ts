import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure the user is authenticated.
 * Attaches a test user profile for development/testing purposes.
 * In a real application, this would verify a session or token.
 */
export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized" });
    return
  }

  next();
};
