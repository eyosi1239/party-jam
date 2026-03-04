/**
 * React hook for managing party state and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import {
  connectSocket,
  disconnectSocket,
  joinPartyRoom,
  startHeartbeat,
  stopHeartbeat,
  onSocketEvent,
  offSocketEvent,
} from './socket';
import type { PartyState, Song } from './types';

export interface UsePartyResult {
  // State
  partyState: PartyState | null;
  loading: boolean;
  error: string | null;
  partyEndedByHost: boolean;

  // Party info
  partyId: string | null;
  joinCode: string | null;
  userId: string | null;

  // Actions
  createParty: (userId: string, mood?: string) => Promise<void>;
  joinParty: (partyId: string, userId: string) => Promise<void>;
  startParty: () => Promise<void>;
  vote: (trackId: string, vote: 'UP' | 'DOWN' | 'NONE', context: 'QUEUE' | 'TESTING') => Promise<void>;
  updateSettings: (settings: { mood?: string; kidFriendly?: boolean; allowSuggestions?: boolean; locked?: boolean }) => Promise<void>;
  regenerateCode: () => Promise<void>;
  leaveParty: () => void;
}

export function useParty(): UsePartyResult {
  const [partyState, setPartyState] = useState<PartyState | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partyEndedByHost, setPartyEndedByHost] = useState(false);

  // Create a new party (host)
  const createParty = useCallback(async (uid: string, mood = 'chill') => {
    try {
      setLoading(true);
      setError(null);
      setPartyEndedByHost(false);

      const result = await api.createParty({
        hostId: uid,
        mood,
        kidFriendly: false,
        allowSuggestions: true,
      });

      setPartyId(result.partyId);
      setJoinCode(result.joinCode);
      setUserId(uid);

      // Load initial state
      const state = await api.getPartyState(result.partyId, uid);
      setPartyState(state);

      // Connect socket
      connectSocket();
      joinPartyRoom(result.partyId, uid);
      startHeartbeat(result.partyId, uid);

      console.log('✅ Party created:', result.partyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create party');
      console.error('Failed to create party:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Join an existing party (guest)
  const joinParty = useCallback(async (pid: string, uid: string) => {
    try {
      setLoading(true);
      setError(null);
      setPartyEndedByHost(false);

      await api.joinParty(pid, { userId: uid });

      setPartyId(pid);
      setUserId(uid);

      // Load initial state
      const state = await api.getPartyState(pid, uid);
      setPartyState(state);

      // Connect socket
      connectSocket();
      joinPartyRoom(pid, uid);
      startHeartbeat(pid, uid);

      console.log('✅ Joined party:', pid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join party');
      console.error('Failed to join party:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start the party (host only)
  const startParty = useCallback(async () => {
    if (!partyId || !userId) return;

    try {
      setLoading(true);
      setError(null);

      await api.startParty(partyId, userId);

      // Reload state
      const state = await api.getPartyState(partyId, userId);
      setPartyState(state);

      console.log('✅ Party started');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start party');
      console.error('Failed to start party:', err);
    } finally {
      setLoading(false);
    }
  }, [partyId, userId]);

  // Vote on a song
  const vote = useCallback(async (
    trackId: string,
    voteType: 'UP' | 'DOWN' | 'NONE',
    context: 'QUEUE' | 'TESTING'
  ) => {
    if (!partyId || !userId) return;

    try {
      await api.vote(partyId, {
        userId,
        trackId,
        vote: voteType,
        context,
      });
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  }, [partyId, userId]);

  // Update party settings (host only)
  const updateSettings = useCallback(async (settings: {
    mood?: string;
    kidFriendly?: boolean;
    allowSuggestions?: boolean;
    locked?: boolean;
  }) => {
    if (!partyId || !userId) return;

    try {
      if (settings.mood !== undefined) {
        await api.updateMood(partyId, { hostId: userId, mood: settings.mood });
      }
      if (settings.kidFriendly !== undefined) {
        await api.updateKidFriendly(partyId, {
          hostId: userId,
          kidFriendly: settings.kidFriendly,
        });
      }
      if (settings.allowSuggestions !== undefined) {
        await api.updateAllowSuggestions(partyId, {
          hostId: userId,
          allowSuggestions: settings.allowSuggestions,
        });
      }
      if (settings.locked !== undefined) {
        await api.updateLocked(partyId, { hostId: userId, locked: settings.locked });
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  }, [partyId, userId]);

  // Regenerate join code (host only)
  const regenerateCode = useCallback(async () => {
    if (!partyId || !userId) return;
    try {
      const result = await api.regenerateCode(partyId, userId);
      setJoinCode(result.joinCode);
    } catch (err) {
      console.error('Failed to regenerate code:', err);
    }
  }, [partyId, userId]);

  // Leave party
  const leaveParty = useCallback(() => {
    stopHeartbeat();
    disconnectSocket();
    setPartyState(null);
    setPartyId(null);
    setJoinCode(null);
    setUserId(null);
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!partyId) return;

    // Update queue
    const handleQueueUpdate = (data: any) => {
      setPartyState((prev) => {
        if (!prev) return prev;
        return { ...prev, queue: data.queue };
      });
    };

    // Update vote counts
    const handleVoteUpdate = (data: any) => {
      setPartyState((prev) => {
        if (!prev) return prev;

        const updateSong = (song: Song) => {
          if (song.trackId === data.trackId) {
            return {
              ...song,
              upvotes: data.upvotes,
              downvotes: data.downvotes,
              status: data.status,
            };
          }
          return song;
        };

        return {
          ...prev,
          queue: prev.queue.map(updateSong),
          testingSuggestions: prev.testingSuggestions.map(updateSong),
        };
      });
    };

    // Update active members count
    const handlePresence = (data: any) => {
      setPartyState((prev) => {
        if (!prev) return prev;
        return { ...prev, activeMembersCount: data.activeMembersCount };
      });
    };

    // Update settings
    const handleSettingsUpdate = (data: any) => {
      setPartyState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          party: {
            ...prev.party,
            mood: data.mood,
            kidFriendly: data.kidFriendly,
            allowSuggestions: data.allowSuggestions,
            locked: data.locked ?? prev.party.locked,
          },
        };
      });
    };

    // Update now playing — use song from payload; queue lookup is a fallback for
    // old clients, but normally the song is already removed from queue by the time
    // this event arrives (advanceQueue splices before emitting).
    const handleNowPlaying = (data: any) => {
      setPartyState((prev) => {
        if (!prev) return prev;
        const song = data.song ?? prev.queue.find((s) => s.trackId === data.trackId) ?? prev.nowPlaying;
        return {
          ...prev,
          nowPlaying: song,
        };
      });
    };

    // Add song to testing suggestions
    const handleSuggestionTesting = (data: any) => {
      setPartyState((prev) => {
        if (!prev) return prev;
        if (prev.testingSuggestions.find((s) => s.trackId === data.trackId)) return prev;
        return { ...prev, testingSuggestions: [...prev.testingSuggestions, data.song] };
      });
    };

    // Remove expired suggestion
    const handleSuggestionExpired = (data: any) => {
      setPartyState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          testingSuggestions: prev.testingSuggestions.filter((s) => s.trackId !== data.trackId),
        };
      });
    };

    // Handle errors
    const handleError = (data: any) => {
      console.error('Socket error:', data);
      setError(data.message);
    };

    // Handle new join code (e.g. guest needs to know if code changed)
    const handleCodeRegenerated = (data: any) => {
      setJoinCode(data.joinCode);
    };

    // Update members list when someone joins or leaves
    const handleMembersUpdated = (data: any) => {
      setPartyState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: data.members,
          activeMembersCount: data.activeMembersCount,
        };
      });
    };

    // Host ended the party — clean up and flag so UI can show a notification
    const handlePartyEnded = () => {
      setPartyEndedByHost(true);
      stopHeartbeat();
      disconnectSocket();
      setPartyState(null);
      setPartyId(null);
      setJoinCode(null);
      setUserId(null);
    };

    // Register listeners
    onSocketEvent('party:queueUpdated', handleQueueUpdate);
    onSocketEvent('party:voteUpdate', handleVoteUpdate);
    onSocketEvent('party:presence', handlePresence);
    onSocketEvent('party:settingsUpdated', handleSettingsUpdate);
    onSocketEvent('party:nowPlaying', handleNowPlaying);
    onSocketEvent('party:suggestionTesting', handleSuggestionTesting);
    onSocketEvent('party:suggestionExpired', handleSuggestionExpired);
    onSocketEvent('party:codeRegenerated', handleCodeRegenerated);
    onSocketEvent('party:membersUpdated', handleMembersUpdated);
    onSocketEvent('party:error', handleError);
    onSocketEvent('party:ended', handlePartyEnded);

    // Cleanup
    return () => {
      offSocketEvent('party:queueUpdated', handleQueueUpdate);
      offSocketEvent('party:voteUpdate', handleVoteUpdate);
      offSocketEvent('party:presence', handlePresence);
      offSocketEvent('party:settingsUpdated', handleSettingsUpdate);
      offSocketEvent('party:nowPlaying', handleNowPlaying);
      offSocketEvent('party:suggestionTesting', handleSuggestionTesting);
      offSocketEvent('party:suggestionExpired', handleSuggestionExpired);
      offSocketEvent('party:codeRegenerated', handleCodeRegenerated);
      offSocketEvent('party:membersUpdated', handleMembersUpdated);
      offSocketEvent('party:error', handleError);
      offSocketEvent('party:ended', handlePartyEnded);
    };
  }, [partyId]);

  return {
    partyState,
    loading,
    error,
    partyEndedByHost,
    partyId,
    joinCode,
    userId,
    createParty,
    joinParty,
    startParty,
    vote,
    updateSettings,
    regenerateCode,
    leaveParty,
  };
}
