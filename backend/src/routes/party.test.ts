/**
 * Integration tests for party routes.
 * Uses supertest against a real Express + in-memory store.
 * Socket.io broadcasts are not tested here (no real socket server);
 * socket behaviour is validated by the store unit tests + manual integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import partyRoutes, { setSocketIO } from './party.js';

// Stub out socket broadcasts so routes don't need a real io instance
setSocketIO({
  to: () => ({ emit: () => {} }),
  sockets: {
    adapter: { rooms: new Map() },
    sockets: new Map(),
  },
} as any);

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/', partyRoutes);
  return app;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function createParty(app: ReturnType<typeof makeApp>, hostId = 'host-1', mood = 'chill') {
  const res = await request(app).post('/party').send({ hostId, mood });
  expect(res.status).toBe(200);
  return res.body as { partyId: string; joinCode: string };
}

async function startParty(app: ReturnType<typeof makeApp>, partyId: string, hostId: string) {
  const res = await request(app).post(`/party/${partyId}/start`).send({ hostId });
  expect(res.status).toBe(200);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /party — create party', () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(() => { app = makeApp(); });

  it('returns partyId and joinCode', async () => {
    const res = await request(app).post('/party').send({ hostId: 'h1', mood: 'hype' });
    expect(res.status).toBe(200);
    expect(res.body.partyId).toBeTruthy();
    expect(res.body.joinCode).toHaveLength(6);
  });

  it('returns 400 when hostId is missing', async () => {
    const res = await request(app).post('/party').send({ mood: 'chill' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('defaults mood to "chill" when omitted', async () => {
    const res = await request(app).post('/party').send({ hostId: 'h1' });
    expect(res.body.party.mood).toBe('chill');
  });
});

describe('GET /party/resolve — resolve join code', () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(() => { app = makeApp(); });

  it('resolves a valid code', async () => {
    const { partyId, joinCode } = await createParty(app);
    const res = await request(app).get(`/party/resolve?joinCode=${joinCode}`);
    expect(res.status).toBe(200);
    expect(res.body.partyId).toBe(partyId);
  });

  it('returns 404 for unknown code', async () => {
    const res = await request(app).get('/party/resolve?joinCode=ZZZZZZ');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('JOIN_CODE_INVALID');
  });

  it('returns 400 when joinCode param missing', async () => {
    const res = await request(app).get('/party/resolve');
    expect(res.status).toBe(400);
  });
});

describe('POST /party/:id/join', () => {
  let app: ReturnType<typeof makeApp>;
  let partyId: string;
  beforeEach(async () => {
    app = makeApp();
    ({ partyId } = await createParty(app));
  });

  it('adds a new guest member', async () => {
    const res = await request(app).post(`/party/${partyId}/join`).send({ userId: 'guest-1' });
    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('GUEST');
  });

  it('allows the host to rejoin', async () => {
    const res = await request(app).post(`/party/${partyId}/join`).send({ userId: 'host-1' });
    expect(res.status).toBe(200);
  });

  it('returns 400 when userId missing', async () => {
    const res = await request(app).post(`/party/${partyId}/join`).send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown partyId', async () => {
    const res = await request(app).post('/party/fake-id/join').send({ userId: 'g1' });
    expect(res.status).toBe(404);
  });

  it('blocks new guest when room is locked', async () => {
    // Lock the room
    await request(app).post(`/party/${partyId}/settings/locked`).send({ hostId: 'host-1', locked: true });
    const res = await request(app).post(`/party/${partyId}/join`).send({ userId: 'new-guest' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROOM_LOCKED');
  });

  it('allows already-joined member even when locked', async () => {
    // Guest joins before lock
    await request(app).post(`/party/${partyId}/join`).send({ userId: 'early-guest' });
    await request(app).post(`/party/${partyId}/settings/locked`).send({ hostId: 'host-1', locked: true });
    // Same guest can still rejoin
    const res = await request(app).post(`/party/${partyId}/join`).send({ userId: 'early-guest' });
    expect(res.status).toBe(200);
  });
});

describe('POST /party/:id/start', () => {
  let app: ReturnType<typeof makeApp>;
  let partyId: string;
  beforeEach(async () => {
    app = makeApp();
    ({ partyId } = await createParty(app));
  });

  it('sets status to LIVE', async () => {
    const res = await request(app).post(`/party/${partyId}/start`).send({ hostId: 'host-1' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('LIVE');
  });

  it('returns 403 for non-host', async () => {
    const res = await request(app).post(`/party/${partyId}/start`).send({ hostId: 'guest-1' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_HOST');
  });

  it('returns 400 if already started', async () => {
    await startParty(app, partyId, 'host-1');
    const res = await request(app).post(`/party/${partyId}/start`).send({ hostId: 'host-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });
});

describe('POST /party/:id/vote', () => {
  let app: ReturnType<typeof makeApp>;
  let partyId: string;
  beforeEach(async () => {
    app = makeApp();
    ({ partyId } = await createParty(app));
    await startParty(app, partyId, 'host-1');
    // Add a track to vote on
    await request(app).post(`/party/${partyId}/seed`).send({
      hostId: 'host-1',
      tracks: [{ id: 'track-1', name: 'Song', artists: [{ name: 'Artist' }], album: { images: [] }, explicit: false }],
    });
  });

  it('accepts a valid upvote', async () => {
    const res = await request(app).post(`/party/${partyId}/vote`).send({ userId: 'host-1', trackId: 'track-1', vote: 'UP', context: 'QUEUE' });
    expect(res.status).toBe(200);
    expect(res.body.upvotes).toBe(1);
  });

  it('returns 400 when party is not LIVE', async () => {
    const { partyId: p2 } = await createParty(app, 'host-2');
    const res = await request(app).post(`/party/${p2}/vote`).send({ userId: 'host-2', trackId: 'track-1', vote: 'UP', context: 'QUEUE' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PARTY_NOT_LIVE');
  });

  it('returns 400 for invalid vote value', async () => {
    const res = await request(app).post(`/party/${partyId}/vote`).send({ userId: 'host-1', trackId: 'track-1', vote: 'MAYBE', context: 'QUEUE' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_VOTE');
  });
});

describe('POST /party/:id/suggest', () => {
  let app: ReturnType<typeof makeApp>;
  let partyId: string;
  beforeEach(async () => {
    app = makeApp();
    ({ partyId } = await createParty(app));
    await startParty(app, partyId, 'host-1');
    await request(app).post(`/party/${partyId}/join`).send({ userId: 'guest-1' });
  });

  it('accepts a valid suggestion', async () => {
    const res = await request(app).post(`/party/${partyId}/suggest`).send({
      userId: 'guest-1', trackId: 'track-x', title: 'X', artist: 'Y', albumArtUrl: '', explicit: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.suggestion.trackId).toBe('track-x');
  });

  it('rejects explicit track in kid-friendly mode', async () => {
    await request(app).post(`/party/${partyId}/settings/kidFriendly`).send({ hostId: 'host-1', kidFriendly: true });
    const res = await request(app).post(`/party/${partyId}/suggest`).send({
      userId: 'guest-1', trackId: 'explicit-track', title: 'E', artist: 'A', albumArtUrl: '', explicit: true,
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EXPLICIT_NOT_ALLOWED');
  });

  it('rejects when suggestions are disabled', async () => {
    await request(app).post(`/party/${partyId}/settings/allowSuggestions`).send({ hostId: 'host-1', allowSuggestions: false });
    const res = await request(app).post(`/party/${partyId}/suggest`).send({
      userId: 'guest-1', trackId: 'track-x', title: 'X', artist: 'Y', albumArtUrl: '', explicit: false,
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUGGESTIONS_DISABLED');
  });
});

describe('DELETE /party/:id/queue/:trackId — host force-remove', () => {
  let app: ReturnType<typeof makeApp>;
  let partyId: string;
  beforeEach(async () => {
    app = makeApp();
    ({ partyId } = await createParty(app));
    await request(app).post(`/party/${partyId}/seed`).send({
      hostId: 'host-1',
      tracks: [{ id: 'track-1', name: 'Song', artists: [{ name: 'Artist' }], album: { images: [] }, explicit: false }],
    });
  });

  it('removes the song', async () => {
    const res = await request(app).delete(`/party/${partyId}/queue/track-1`).send({ hostId: 'host-1' });
    expect(res.status).toBe(200);
    const state = await request(app).get(`/party/${partyId}/state`);
    expect(state.body.queue).toHaveLength(0);
  });

  it('returns 403 for non-host', async () => {
    const res = await request(app).delete(`/party/${partyId}/queue/track-1`).send({ hostId: 'guest-x' });
    expect(res.status).toBe(403);
  });
});

describe('POST /party/:id/code/regenerate', () => {
  let app: ReturnType<typeof makeApp>;
  let partyId: string;
  let oldCode: string;
  beforeEach(async () => {
    app = makeApp();
    ({ partyId, joinCode: oldCode } = await createParty(app));
  });

  it('returns a new 6-char code', async () => {
    const res = await request(app).post(`/party/${partyId}/code/regenerate`).send({ hostId: 'host-1' });
    expect(res.status).toBe(200);
    expect(res.body.joinCode).toHaveLength(6);
    expect(res.body.joinCode).not.toBe(oldCode);
  });

  it('old code no longer resolves', async () => {
    await request(app).post(`/party/${partyId}/code/regenerate`).send({ hostId: 'host-1' });
    const res = await request(app).get(`/party/resolve?joinCode=${oldCode}`);
    expect(res.status).toBe(404);
  });

  it('returns 403 for non-host', async () => {
    const res = await request(app).post(`/party/${partyId}/code/regenerate`).send({ hostId: 'not-host' });
    expect(res.status).toBe(403);
  });
});

describe('POST /party/:id/skip', () => {
  let app: ReturnType<typeof makeApp>;
  let partyId: string;
  beforeEach(async () => {
    app = makeApp();
    ({ partyId } = await createParty(app));
    await request(app).post(`/party/${partyId}/seed`).send({
      hostId: 'host-1',
      tracks: [
        { id: 't1', name: 'First', artists: [{ name: 'A' }], album: { images: [] }, explicit: false },
        { id: 't2', name: 'Second', artists: [{ name: 'B' }], album: { images: [] }, explicit: false },
      ],
    });
  });

  it('advances the queue', async () => {
    const res = await request(app).post(`/party/${partyId}/skip`).send({ hostId: 'host-1' });
    expect(res.status).toBe(200);
    expect(res.body.nowPlaying.trackId).toBe('t1');
    const state = await request(app).get(`/party/${partyId}/state`);
    expect(state.body.queue).toHaveLength(1);
    expect(state.body.queue[0].trackId).toBe('t2');
  });

  it('handles empty queue gracefully', async () => {
    await request(app).post(`/party/${partyId}/skip`).send({ hostId: 'host-1' });
    await request(app).post(`/party/${partyId}/skip`).send({ hostId: 'host-1' });
    const res = await request(app).post(`/party/${partyId}/skip`).send({ hostId: 'host-1' });
    expect(res.status).toBe(200);
    expect(res.body.nowPlaying).toBeNull();
  });

  it('returns 403 for non-host', async () => {
    const res = await request(app).post(`/party/${partyId}/skip`).send({ hostId: 'imposter' });
    expect(res.status).toBe(403);
  });
});

describe('POST /party/:id/end', () => {
  let app: ReturnType<typeof makeApp>;
  let partyId: string;
  beforeEach(async () => {
    app = makeApp();
    ({ partyId } = await createParty(app));
  });

  it('sets status to ENDED', async () => {
    const res = await request(app).post(`/party/${partyId}/end`).send({ hostId: 'host-1' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ENDED');
  });

  it('returns 403 for non-host', async () => {
    const res = await request(app).post(`/party/${partyId}/end`).send({ hostId: 'imposter' });
    expect(res.status).toBe(403);
  });
});
