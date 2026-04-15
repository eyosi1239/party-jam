import { Router, Request, Response } from 'express';
import { globalLimiter } from '../middleware/rateLimits.js';

const router = Router();

const DEEZER_API = 'https://api.deezer.com';

/**
 * GET /api/deezer/search?q=...&limit=...
 * Proxies Deezer search requests server-side to avoid browser CORS restrictions.
 */
router.get('/api/deezer/search', globalLimiter, async (req: Request, res: Response) => {
  const { q, limit = '20' } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'q parameter is required' });
  }

  const url = `${DEEZER_API}/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit as string)}`;

  const upstream = await fetch(url);
  const data = await upstream.json();
  res.json(data);
});

export default router;
