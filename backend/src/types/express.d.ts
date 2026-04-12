// Augments Express Request with the Firebase-verified user attached by auth middleware
declare namespace Express {
  interface Request {
    user?: { uid: string; email?: string };
  }
}
