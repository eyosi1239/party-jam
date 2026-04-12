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

/**
 * Host-only queue/playback actions: skip, pin, play-next, remove, settings changes.
 * 30 actions / min is generous for a human DJ but stops scripted abuse.
 */
export const hostActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many host actions. Slow down and try again.' },
});

/**
 * Party start: tight — one party starts once, retries are rare.
 * 5 / 10 min per IP stops hammering if the client retries on error.
 */
export const startPartyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many start attempts. Please wait before trying again.' },
});

/**
 * Heartbeat: fires every 30 s per client, so 4 / min is the ceiling for one user.
 * Multiple users share an IP only behind NAT — cap at 120 to cover ~30 users on one IP.
 */
export const heartbeatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Heartbeat rate limit reached.' },
});

/** 5 code regenerations / hour per IP — a deliberate, infrequent host action */
export const regenerateCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many code regeneration requests. Please wait before trying again.' },
});

/** User sync: called on every login but not more than a few times per session */
export const userSyncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sync requests. Please wait before trying again.' },
});

/** Music service connect/disconnect: intentional, infrequent user action */
export const musicServiceLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many music service requests. Please wait before trying again.' },
});
