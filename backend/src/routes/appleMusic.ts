import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * GET /apple-music/token
 *
 * Generates a short-lived Apple Music developer token (JWT) signed with
 * the private key from your Apple Developer account.
 *
 * Required environment variables (set in backend/.env or your hosting config):
 *   APPLE_TEAM_ID          – Your 10-character Apple Developer Team ID
 *   APPLE_KEY_ID           – The Key ID of your MusicKit private key
 *   APPLE_PRIVATE_KEY      – The full contents of the AuthKey_XXXXXX.p8 file
 *                            (newlines replaced with \n in .env)
 */
router.get('/apple-music/token', (_req: Request, res: Response) => {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    res.status(503).json({
      error: 'Apple Music is not configured on this server. '
        + 'Set APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY environment variables.',
    });
    return;
  }

  try {
    // Replace literal \n strings (from .env file) with real newlines
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    const token = jwt.sign({}, formattedKey, {
      algorithm: 'ES256',
      expiresIn: '180d',
      issuer: teamId,
      header: {
        alg: 'ES256',
        kid: keyId,
      },
    });

    res.json({ token });
  } catch (err) {
    console.error('[AppleMusic] Token generation failed:', err);
    res.status(500).json({ error: 'Failed to generate Apple Music developer token.' });
  }
});

export default router;
