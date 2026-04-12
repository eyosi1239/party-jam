import type { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';

/**
 * Verifies the Firebase ID token in the Authorization header.
 * On success, attaches `req.user = { uid, email }` and calls next().
 * On failure, responds 401.
 *
 * Use this on all host-only and user-specific routes.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const idToken = header.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Same as requireAuth but non-blocking — attaches req.user if a valid token
 * is present, otherwise leaves req.user undefined and continues.
 *
 * Use this on guest-accessible routes (join, vote, suggest, heartbeat) where
 * anonymous users are allowed but we still want to ID authenticated ones.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const idToken = header.slice(7);
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      req.user = { uid: decoded.uid, email: decoded.email };
    } catch {
      // Token invalid — treat as unauthenticated, don't block
    }
  }
  next();
}
