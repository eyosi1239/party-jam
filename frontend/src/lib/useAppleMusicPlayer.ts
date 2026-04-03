/**
 * Manages Apple Music playback for the host.
 * Mirrors the UseSpotifyPlayerResult interface so HostView can swap between them.
 * Only activates when the user has authorized Apple Music.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isAppleMusicAuthorized,
  playAppleTrack,
  toggleApplePlayback,
  setAppleVolume,
  getApplePlaybackState,
} from './appleMusic';

export interface AppleMusicPlaybackState {
  isReady: boolean;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
}

export interface UseAppleMusicPlayerResult {
  playbackState: AppleMusicPlaybackState;
  playTrack: (uri: string) => Promise<void>;
  togglePlay: () => Promise<void>;
  setVolume: (volumePct: number) => Promise<void>;
}

const DEFAULT_STATE: AppleMusicPlaybackState = {
  isReady: false,
  isPlaying: false,
  progressMs: 0,
  durationMs: 0,
};

export function useAppleMusicPlayer(): UseAppleMusicPlayerResult {
  const [playbackState, setPlaybackState] = useState<AppleMusicPlaybackState>(DEFAULT_STATE);

  // Determine ready state once on mount
  useEffect(() => {
    if (isAppleMusicAuthorized()) {
      setPlaybackState((prev) => ({ ...prev, isReady: true }));
    }
  }, []);

  // Poll playback position every second for a smooth progress bar
  useEffect(() => {
    if (!playbackState.isReady) return;

    const interval = setInterval(() => {
      const state = getApplePlaybackState();
      setPlaybackState((prev) => ({
        ...prev,
        isPlaying: state.isPlaying,
        progressMs: state.progressMs,
        durationMs: state.durationMs,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [playbackState.isReady]);

  // uri can be "apple:song:<id>" (our internal format) or a bare catalog ID
  const playTrack = useCallback(async (uri: string) => {
    const trackId = uri.startsWith('apple:song:') ? uri.slice('apple:song:'.length) : uri;
    await playAppleTrack(trackId);
  }, []);

  const togglePlay = useCallback(async () => {
    await toggleApplePlayback();
  }, []);

  const setVolume = useCallback(async (volumePct: number) => {
    await setAppleVolume(volumePct);
  }, []);

  return { playbackState, playTrack, togglePlay, setVolume };
}
