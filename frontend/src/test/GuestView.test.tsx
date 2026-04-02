/**
 * Tests for GuestView — lobby state, suggestion controls, queue display,
 * and guard behaviours (kid-friendly, suggestions disabled).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuestView } from '../app/pages/GuestView';
import type { PartyState } from '../lib/types';

// Stub spotify context so GuestView doesn't crash without a provider
vi.mock('@/contexts/SpotifyContext', () => ({
  useSpotify: () => ({ user: null, isConnected: false, isConfigured: false }),
}));

// Stub music provider — use mock data without real Spotify calls
vi.mock('@/lib/music', () => ({
  getMusicProvider: () => ({
    getRecommendations: vi.fn().mockResolvedValue([
      { id: 'mock-1', name: 'Safe Song', artists: [{ name: 'Artist' }], album: { images: [{ url: '' }] }, explicit: false, preview_url: null, uri: '' },
      { id: 'mock-2', name: 'Explicit Banger', artists: [{ name: 'DJ X' }], album: { images: [{ url: '' }] }, explicit: true, preview_url: null, uri: '' },
    ]),
    searchTracks: vi.fn().mockResolvedValue([]),
  }),
}));

function makeLivePartyState(overrides: Partial<PartyState['party']> = {}): PartyState {
  return {
    party: {
      partyId: 'p1', hostId: 'host-1', status: 'LIVE',
      mood: 'chill', kidFriendly: false, allowSuggestions: true, locked: false, createdAt: Date.now(),
      ...overrides,
    },
    activeMembersCount: 1,
    members: [{ userId: 'guest-1', role: 'GUEST', joinedAt: Date.now(), lastActiveAt: Date.now() }],
    nowPlaying: null,
    queue: [],
    testingSuggestions: [],
  };
}

const noop = vi.fn().mockResolvedValue(undefined);

describe('GuestView — lobby (no party)', () => {
  it('shows Create Party and Join Party buttons when partyState is null', () => {
    render(
      <GuestView partyState={null} partyId={null} userId={null}
        onVote={noop} onCreateParty={noop} onJoinParty={noop} />
    );
    expect(screen.getByRole('button', { name: /create a party/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join a party/i })).toBeInTheDocument();
  });

  it('calls onCreateParty when button clicked', async () => {
    const onCreateParty = vi.fn();
    render(
      <GuestView partyState={null} partyId={null} userId={null}
        onVote={noop} onCreateParty={onCreateParty} onJoinParty={noop} />
    );
    await userEvent.click(screen.getByRole('button', { name: /create a party/i }));
    expect(onCreateParty).toHaveBeenCalledOnce();
  });
});

describe('GuestView — in party', () => {
  it('shows "suggestions disabled" banner when allowSuggestions is false', async () => {
    render(
      <GuestView partyState={makeLivePartyState({ allowSuggestions: false })}
        partyId="p1" userId="guest-1" onVote={noop} />
    );
    // The banner is in the Browse tab — switch to it first
    await userEvent.click(screen.getByRole('button', { name: /browse/i }));
    expect(await screen.findByText(/Host has disabled suggestions/i)).toBeInTheDocument();
  });

  it('shows Blocked tag and disables Add button for explicit tracks in kid-friendly mode', async () => {
    render(
      <GuestView partyState={makeLivePartyState({ kidFriendly: true })}
        partyId="p1" userId="guest-1" onVote={noop} />
    );
    // Tracks are shown in the Browse tab — switch to it first
    await userEvent.click(screen.getByRole('button', { name: /browse/i }));
    // Wait for the explicit song card to appear
    expect(await screen.findByText('Explicit Banger')).toBeInTheDocument();
    // The card should show a "Blocked" tag
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    // The explicit card container should be opacity-60 (disabled styling)
    const explicitTitle = screen.getByText('Explicit Banger');
    const card = explicitTitle.closest('.opacity-60');
    expect(card).toBeTruthy();
  });

  it('shows queue count in tab on mobile', async () => {
    const stateWithQueue: PartyState = {
      ...makeLivePartyState(),
      queue: [
        { trackId: 't1', title: 'Queue Song', artist: 'A', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 2, downvotes: 0 },
      ],
    };
    render(
      <GuestView partyState={stateWithQueue} partyId="p1" userId="guest-1" onVote={noop} />
    );
    expect(screen.getByText('Queue (1)')).toBeInTheDocument();
  });

  it('shows nowPlaying bar when a song is playing', async () => {
    const stateWithNowPlaying: PartyState = {
      ...makeLivePartyState(),
      nowPlaying: { trackId: 'np1', title: 'Now Playing Song', artist: 'NP Artist', albumArtUrl: '', explicit: false, source: 'SPOTIFY_REC', status: 'QUEUED', upvotes: 0, downvotes: 0 },
    };
    render(
      <GuestView partyState={stateWithNowPlaying} partyId="p1" userId="guest-1" onVote={noop} />
    );
    // Title appears in both NowPlayingCard and the bottom mini player
    expect(screen.getAllByText('Now Playing Song').length).toBeGreaterThan(0);
  });
});
