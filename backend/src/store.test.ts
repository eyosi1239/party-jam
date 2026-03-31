import { describe, it, expect, beforeEach } from 'vitest';
import { PartyStore } from './store.js';
import type { Party, PartyMember } from './types.js';

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    partyId: 'party-1',
    hostId: 'host-1',
    status: 'CREATED',
    mood: 'chill',
    kidFriendly: false,
    allowSuggestions: true,
    locked: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeHost(): PartyMember {
  return { userId: 'host-1', role: 'HOST', joinedAt: Date.now(), lastActiveAt: Date.now() };
}

describe('PartyStore', () => {
  let store: PartyStore;

  beforeEach(() => {
    store = new PartyStore();
    store.createParty(makeParty());
    store.addMember('party-1', makeHost());
  });

  // ── Join code ────────────────────────────────────────────────
  describe('join codes', () => {
    it('maps joinCode → partyId', () => {
      store.setJoinCode('ABC123', 'party-1');
      expect(store.getPartyIdByJoinCode('ABC123')).toBe('party-1');
    });

    it('invalidates old code when regenerating', () => {
      store.setJoinCode('OLD123', 'party-1');
      store.setJoinCode('NEW456', 'party-1');
      expect(store.getPartyIdByJoinCode('OLD123')).toBeNull();
      expect(store.getPartyIdByJoinCode('NEW456')).toBe('party-1');
    });

    it('returns null for unknown code', () => {
      expect(store.getPartyIdByJoinCode('XXXXXX')).toBeNull();
    });
  });

  // ── Queue ─────────────────────────────────────────────────────
  describe('addToQueue', () => {
    it('adds a song', () => {
      store.addToQueue('party-1', { trackId: 't1', title: 'Song', artist: 'Artist', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      const state = store.getState('party-1')!;
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].trackId).toBe('t1');
    });

    it('prevents duplicate trackIds (Fix #11)', () => {
      const song = { trackId: 't1', title: 'Song', artist: 'Artist', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC' as const, status: 'QUEUED' as const, upvotes: 0, downvotes: 0 };
      store.addToQueue('party-1', song);
      const added = store.addToQueue('party-1', song);
      expect(added).toBe(false);
      expect(store.getState('party-1')!.queue).toHaveLength(1);
    });

    it('allows different tracks', () => {
      store.addToQueue('party-1', { trackId: 't1', title: 'A', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      store.addToQueue('party-1', { trackId: 't2', title: 'B', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      expect(store.getState('party-1')!.queue).toHaveLength(2);
    });
  });

  describe('removeFromQueue', () => {
    it('removes the right track', () => {
      store.addToQueue('party-1', { trackId: 't1', title: '', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      store.addToQueue('party-1', { trackId: 't2', title: '', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      store.removeFromQueue('party-1', 't1');
      const queue = store.getState('party-1')!.queue;
      expect(queue).toHaveLength(1);
      expect(queue[0].trackId).toBe('t2');
    });
  });

  describe('advanceQueue', () => {
    it('returns the first song and removes it from queue', () => {
      store.addToQueue('party-1', { trackId: 't1', title: 'First', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      store.addToQueue('party-1', { trackId: 't2', title: 'Second', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      const next = store.advanceQueue('party-1');
      expect(next?.trackId).toBe('t1');
      expect(store.getState('party-1')!.queue).toHaveLength(1);
    });

    it('returns null for empty queue', () => {
      expect(store.advanceQueue('party-1')).toBeNull();
    });
  });

  describe('moveToFront', () => {
    it('moves target song to position 0', () => {
      store.addToQueue('party-1', { trackId: 't1', title: '', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      store.addToQueue('party-1', { trackId: 't2', title: '', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      store.moveToFront('party-1', 't2');
      expect(store.getState('party-1')!.queue[0].trackId).toBe('t2');
    });
  });

  describe('setPinned', () => {
    it('marks song as pinned and moves it to front', () => {
      store.addToQueue('party-1', { trackId: 't1', title: '', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      store.addToQueue('party-1', { trackId: 't2', title: '', artist: '', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 });
      store.setPinned('party-1', 't2', true);
      const q = store.getState('party-1')!.queue;
      expect(q[0].trackId).toBe('t2');
      expect(q[0].isPinned).toBe(true);
    });
  });

  // ── Votes ─────────────────────────────────────────────────────
  describe('votes', () => {
    it('counts upvotes and downvotes correctly', () => {
      store.addMember('party-1', { userId: 'u2', role: 'GUEST', joinedAt: Date.now(), lastActiveAt: Date.now() });
      store.setVote('party-1', 'host-1', 't1', 'UP', 'QUEUE');
      store.setVote('party-1', 'u2', 't1', 'DOWN', 'QUEUE');
      const counts = store.getVoteCounts('party-1', 't1');
      expect(counts.upvotes).toBe(1);
      expect(counts.downvotes).toBe(1);
    });

    it('NONE removes the vote', () => {
      store.setVote('party-1', 'host-1', 't1', 'UP', 'QUEUE');
      store.setVote('party-1', 'host-1', 't1', 'NONE', 'QUEUE');
      expect(store.getVoteCounts('party-1', 't1').upvotes).toBe(0);
    });

    it('replaces previous vote for same user+track', () => {
      store.setVote('party-1', 'host-1', 't1', 'UP', 'QUEUE');
      store.setVote('party-1', 'host-1', 't1', 'DOWN', 'QUEUE');
      const c = store.getVoteCounts('party-1', 't1');
      expect(c.upvotes).toBe(0);
      expect(c.downvotes).toBe(1);
    });
  });

  // ── Active members ────────────────────────────────────────────
  describe('active members', () => {
    it('counts recently active members', () => {
      store.updateMemberActivity('party-1', 'host-1');
      expect(store.getActiveMembersCount('party-1')).toBe(1);
    });

    it('returns 0 for unknown party', () => {
      expect(store.getActiveMembersCount('no-party')).toBe(0);
    });
  });

  // ── Room lock ─────────────────────────────────────────────────
  describe('locked room', () => {
    it('updateParty sets locked flag', () => {
      store.updateParty('party-1', { locked: true });
      expect(store.getParty('party-1')?.locked).toBe(true);
    });
  });
});
