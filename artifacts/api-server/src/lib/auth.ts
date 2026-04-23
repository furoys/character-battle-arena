import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

// Optional userId — returns Clerk userId if signed in, null for guests.
// Guest play is allowed everywhere, so we use this to *tag* writes (so a
// signed-in user's history/stats can be filtered) without blocking anyone.
export function getOptionalUserId(req: Request): string | null {
  const auth = getAuth(req);
  return auth?.userId ?? null;
}

// Strict gate — returns 401 if not signed in. Used for /api/me/* endpoints
// that only make sense for an authenticated user.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = getOptionalUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  (req as Request & { userId: string }).userId = userId;
  next();
}
