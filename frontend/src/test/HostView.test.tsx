/**
 * Tests for HostView — covers Fix #3 (end party failure guard) and key host controls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HostView } from '../app/pages/HostView';
import type { PartyState } from '../lib/types';

// Stub Spotify player — tests don't need real audio
vi.mock('@/lib/useSpotifyPlayer', () => ({
  useSpotifyPlayer: () => ({
    playbackState: { isReady: false, isPlaying: false, progressMs: 0, durationMs: 0 },
    playTrack: vi.fn(),
    togglePlay: vi.fn(),
    setVolume: vi.fn(),
  }),
}));

// Stub music provider
vi.mock('@/lib/music', () => ({
  getMusicProvider: () => ({ getRecommendations: vi.fn().mockResolvedValue([]) }),
}));

// Stub the API module
vi.mock('@/lib/api', () => ({
  api: {
    endParty: vi.fn(),
    skipCurrentSong: vi.fn().mockResolvedValue({ ok: true }),
    playNextInQueue: vi.fn().mockResolvedValue({ ok: true }),
    pinSong: vi.fn().mockResolvedValue({ ok: true }),
    removeFromQueue: vi.fn().mockResolvedValue({ ok: true }),
    seedQueue: vi.fn().mockResolvedValue({ ok: true, addedCount: 0, queue: [] }),
  },
}));

import { api } from '@/lib/api';

function makeLiveState(): PartyState {
  return {
    party: {
      partyId: 'p1', hostId: 'host-1', status: 'LIVE',
      mood: 'chill', kidFriendly: false, allowSuggestions: true, locked: false, createdAt: Date.now(),
    },
    activeMembersCount: 1,
    members: [{ userId: 'host-1', role: 'HOST', joinedAt: Date.now(), lastActiveAt: Date.now() }],
    nowPlaying: null,
    queue: [],
    testingSuggestions: [],
  };
}

const noop = vi.fn().mockResolvedValue(undefined);

function renderHostView(overrides: Partial<Parameters<typeof HostView>[0]> = {}) {
  return render(
    <HostView
      partyState={makeLiveState()}
      joinCode="ABC123"
      onStartParty={noop}
      onUpdateSettings={noop}
      onRegenerateCode={noop}
      onLeaveRoom={noop}
      {...overrides}
    />
  );
}

describe('HostView — loading state', () => {
  it('shows loading when partyState is null', () => {
    render(
      <HostView partyState={null} joinCode={null}
        onStartParty={noop} onUpdateSettings={noop}
        onRegenerateCode={noop} onLeaveRoom={noop} />
    );
    expect(screen.getByText(/Loading party/i)).toBeInTheDocument();
  });
});

describe('HostView — room code display', () => {
  it('shows the join code', () => {
    renderHostView();
    // The code appears in the green box
    expect(screen.getAllByText('ABC123').length).toBeGreaterThan(0);
  });
});

describe('HostView — end party (Fix #3)', () => {
  beforeEach(() => {
    vi.mocked(api.endParty).mockReset();
  });

  it('calls onLeaveRoom when end party succeeds', async () => {
    vi.mocked(api.endParty).mockResolvedValue({ status: 'ENDED' });
    const onLeaveRoom = vi.fn();
    renderHostView({ onLeaveRoom });

    // Open end-party modal via leave button in NavBar
    // NavBar has two Leave Room buttons (text + icon); click the visible text one
    await userEvent.click(screen.getAllByRole('button', { name: /leave/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /end party/i }));

    await waitFor(() => expect(onLeaveRoom).toHaveBeenCalledOnce());
  });

  it('does NOT call onLeaveRoom when endParty API fails (Fix #3)', async () => {
    vi.mocked(api.endParty).mockRejectedValue(new Error('Network error'));
    const onLeaveRoom = vi.fn();
    renderHostView({ onLeaveRoom });

    // NavBar has two Leave Room buttons (text + icon); click the visible text one
    await userEvent.click(screen.getAllByRole('button', { name: /leave/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /end party/i }));

    await waitFor(() =>
      expect(screen.getByText(/Failed to end the party/i)).toBeInTheDocument()
    );
    expect(onLeaveRoom).not.toHaveBeenCalled();
  });

  it('shows confirmation modal before ending party', async () => {
    renderHostView();
    // NavBar has two Leave Room buttons (text + icon); click the visible text one
    await userEvent.click(screen.getAllByRole('button', { name: /leave/i })[0]);
    expect(screen.getByText(/End Party\?/i)).toBeInTheDocument();
  });

  it('cancel in modal keeps host in view', async () => {
    const onLeaveRoom = vi.fn();
    renderHostView({ onLeaveRoom });
    // NavBar has two Leave Room buttons (text + icon); click the visible text one
    await userEvent.click(screen.getAllByRole('button', { name: /leave/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onLeaveRoom).not.toHaveBeenCalled();
  });
});

describe('HostView — settings toggles', () => {
  it('calls onUpdateSettings with locked:true when lock is toggled on', async () => {
    const onUpdateSettings = vi.fn().mockResolvedValue(undefined);
    renderHostView({ onUpdateSettings });
    await userEvent.click(screen.getByRole('button', { name: /lock room/i }));
    expect(onUpdateSettings).toHaveBeenCalledWith({ locked: true });
  });

  it('calls onUpdateSettings with allowSuggestions:false', async () => {
    const onUpdateSettings = vi.fn().mockResolvedValue(undefined);
    renderHostView({ onUpdateSettings });
    await userEvent.click(screen.getByRole('button', { name: /allow suggestions/i }));
    expect(onUpdateSettings).toHaveBeenCalledWith({ allowSuggestions: false });
  });
});
