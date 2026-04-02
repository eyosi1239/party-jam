/**
 * Rate limiters for Party Jam API endpoints.
 *
 * Strategy:
 *   - global:          catch-all, prevents general flooding
 *   - createParty:     tight — prevents party-creation spam
 *   - joinParty:       moderate — room for legitimate rapid retries
 *   - vote:            generous per-minute window — guests vote actively
 *   - suggest:         moderate — prevents queue flooding
 *   - seed:            tight — heavy host operation, rarely needed
 *   - appleMusicToken: very tight — signs a JWT, should be fetched once on load
 *
 * All limiters are no-ops when NODE_ENV=test so test suites run without throttling.
 */

import { rateLimit } from 'express-rate-limit';

const skipInTest = () => process.env.NODE_ENV === 'test';

/** 300 req / 15 min per IP — general protection on all routes */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/** 10 parties / hour per IP */
export const createPartyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many parties created. Please wait before creating another.' },
});

/** 30 joins / 15 min per IP */
export const joinPartyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many join attempts. Please wait before trying again.' },
});

/** 60 votes / min per IP — guests vote frequently but this still stops spammers */
export const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Voting too fast. Slow down and try again.' },
});

/** 15 suggestions / 10 min per IP */
export const suggestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many song suggestions. Please wait before suggesting more.' },
});

/** 10 seed requests / min per IP — host-only, heavy operation */
export const seedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Queue seeding rate limit reached. Please wait a moment.' },
});

/** 5 token requests / hour per IP — token is valid 180 days, no reason to hammer this */
export const appleMusicTokenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Apple Music token rate limit reached. Please try again later.' },
});
