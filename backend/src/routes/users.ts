import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, userMusicServices } from '../db/schema.js';
import { encrypt, decrypt } from '../lib/crypto.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/users/sync
// Called by the frontend on every Firebase login to upsert the user record.
// Body: { firebaseUid, email, displayName, authProvider }
// ---------------------------------------------------------------------------
router.post('/api/users/sync', async (req, res) => {
  const { firebaseUid, email, displayName, authProvider } = req.body as {
    firebaseUid?: string;
    email?: string;
    displayName?: string;
    authProvider?: 'email' | 'google' | 'spotify';
  };

  if (!firebaseUid) {
    return res.status(400).json({ error: 'firebaseUid is required' });
  }

  try {
    const [user] = await db
      .insert(users)
      .values({
        firebaseUid,
        email: email ?? null,
        displayName: displayName ?? null,
        authProvider: authProvider ?? 'email',
      })
      .onConflictDoUpdate({
        target: users.firebaseUid,
        set: {
          email: email ?? null,
          displayName: displayName ?? null,
        },
      })
      .returning();

    return res.json({ id: user.id, firebaseUid: user.firebaseUid });
  } catch (err) {
    console.error('users/sync error:', err);
    return res.status(500).json({ error: 'Failed to sync user' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:uid/music-services
// Returns the list of services the user has connected (no tokens in response).
// ---------------------------------------------------------------------------
router.get('/api/users/:uid/music-services', async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, uid),
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const services = await db.query.userMusicServices.findMany({
      where: eq(userMusicServices.userId, user.id),
    });

    // Never expose raw tokens to the client
    const safe = services.map((s) => ({
      service: s.service,
      serviceUserId: s.serviceUserId,
      connectedAt: s.connectedAt,
      tokenExpiresAt: s.tokenExpiresAt,
    }));

    return res.json({ services: safe });
  } catch (err) {
    console.error('music-services GET error:', err);
    return res.status(500).json({ error: 'Failed to fetch music services' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:uid/music-services/:service
// Upserts a connected service for a user (called after OAuth completes).
// Body: { accessToken, refreshToken, tokenExpiresAt, serviceUserId }
// ---------------------------------------------------------------------------
router.put('/api/users/:uid/music-services/:service', async (req, res) => {
  const { uid, service } = req.params;
  const { accessToken, refreshToken, tokenExpiresAt, serviceUserId } = req.body as {
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string; // ISO date string
    serviceUserId?: string;
  };

  const validServices = ['spotify', 'apple_music', 'deezer'] as const;
  type ValidService = (typeof validServices)[number];
  if (!validServices.includes(service as ValidService)) {
    return res.status(400).json({ error: 'Invalid service' });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, uid),
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db
      .insert(userMusicServices)
      .values({
        userId: user.id,
        service: service as ValidService,
        accessToken: accessToken ? encrypt(accessToken) : null,
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        serviceUserId: serviceUserId ?? null,
      })
      .onConflictDoUpdate({
        target: [userMusicServices.userId, userMusicServices.service],
        set: {
          accessToken: accessToken ? encrypt(accessToken) : null,
          refreshToken: refreshToken ? encrypt(refreshToken) : null,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
          serviceUserId: serviceUserId ?? null,
          connectedAt: new Date(),
        },
      });

    return res.json({ ok: true });
  } catch (err) {
    console.error('music-services PUT error:', err);
    return res.status(500).json({ error: 'Failed to save music service' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/users/:uid/music-services/:service
// Removes a connected service (user disconnects Spotify/Apple Music).
// ---------------------------------------------------------------------------
router.delete('/api/users/:uid/music-services/:service', async (req, res) => {
  const { uid, service } = req.params;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, uid),
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db
      .delete(userMusicServices)
      .where(
        and(
          eq(userMusicServices.userId, user.id),
          eq(userMusicServices.service, service as 'spotify' | 'apple_music' | 'deezer'),
        ),
      );

    return res.json({ ok: true });
  } catch (err) {
    console.error('music-services DELETE error:', err);
    return res.status(500).json({ error: 'Failed to remove music service' });
  }
});

// ---------------------------------------------------------------------------
// Internal helper — used by other routes to fetch decrypted tokens server-side
// (e.g. for token refresh). Not exposed as an HTTP endpoint.
// ---------------------------------------------------------------------------
export async function getDecryptedTokens(firebaseUid: string, service: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.firebaseUid, firebaseUid),
  });
  if (!user) return null;

  const row = await db.query.userMusicServices.findFirst({
    where: and(
      eq(userMusicServices.userId, user.id),
      eq(userMusicServices.service, service as 'spotify' | 'apple_music' | 'deezer'),
    ),
  });
  if (!row) return null;

  return {
    accessToken: decrypt(row.accessToken),
    refreshToken: decrypt(row.refreshToken),
    tokenExpiresAt: row.tokenExpiresAt,
    serviceUserId: row.serviceUserId,
  };
}

export default router;
