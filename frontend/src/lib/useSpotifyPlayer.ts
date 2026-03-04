/**
 * Manages the Spotify Web Playback SDK for the host's local audio playback.
 * Only initializes when the user has a valid Spotify token.
 * Requires Spotify Premium.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isLoggedIn, transferPlaybackToDevice, playTrackOnDevice } from './spotify';

export interface SpotifyPlaybackState {
  isReady: boolean;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
}

export interface UseSpotifyPlayerResult {
  playbackState: SpotifyPlaybackState;
  playTrack: (uri: string) => Promise<void>;
  togglePlay: () => Promise<void>;
  setVolume: (volumePct: number) => Promise<void>;
}

const DEFAULT_STATE: SpotifyPlaybackState = {
  isReady: false,
  isPlaying: false,
  progressMs: 0,
  durationMs: 0,
};

export function useSpotifyPlayer(): UseSpotifyPlayerResult {
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState>(DEFAULT_STATE);
  const playerRef = useRef<any>(null);
  const deviceIdRef = useRef<string | null>(null);

  // Initialize the SDK and create the player once
  useEffect(() => {
    if (!isLoggedIn()) return;

    const initPlayer = () => {
      const player = new (window as any).Spotify.Player({
        name: 'Party Jam',
        getOAuthToken: (cb: (token: string) => void) => {
          const token = localStorage.getItem('spotify_access_token');
          if (token) cb(token);
        },
        volume: 0.7,
      });

      playerRef.current = player;

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        deviceIdRef.current = device_id;
        setPlaybackState((prev) => ({ ...prev, isReady: true }));
        // Register this browser tab as an active Spotify Connect device
        transferPlaybackToDevice(device_id).catch(console.error);
      });

      player.addListener('not_ready', () => {
        deviceIdRef.current = null;
        setPlaybackState((prev) => ({ ...prev, isReady: false }));
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setPlaybackState((prev) => ({
          ...prev,
          isPlaying: !state.paused,
          progressMs: state.position,
          durationMs: state.duration,
        }));
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Spotify SDK initialization error:', message);
      });

      player.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Spotify SDK authentication error:', message);
      });

      player.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Spotify SDK account error (Premium required):', message);
      });

      player.connect();
    };

    // SDK may already be loaded (e.g. hot reload)
    if ((window as any).Spotify) {
      initPlayer();
    } else {
      (window as any).onSpotifyWebPlaybackSDKReady = initPlayer;
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
      deviceIdRef.current = null;
    };
  }, []);

  // Poll playback position every second so the progress bar stays smooth
  useEffect(() => {
    if (!playbackState.isReady) return;

    const interval = setInterval(async () => {
      const state = await playerRef.current?.getCurrentState();
      if (!state) return;
      setPlaybackState((prev) => ({
        ...prev,
        isPlaying: !state.paused,
        progressMs: state.position,
        durationMs: state.duration,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [playbackState.isReady]);

  // Stable reference — reads deviceId from ref to avoid stale closures
  const playTrack = useCallback(async (uri: string) => {
    if (!deviceIdRef.current) return;
    await playTrackOnDevice(deviceIdRef.current, uri);
  }, []);

  const togglePlay = useCallback(async () => {
    await playerRef.current?.togglePlay();
  }, []);

  // volumePct is 0–100; Spotify SDK expects 0.0–1.0
  const setVolume = useCallback(async (volumePct: number) => {
    await playerRef.current?.setVolume(volumePct / 100);
  }, []);

  return { playbackState, playTrack, togglePlay, setVolume };
}
