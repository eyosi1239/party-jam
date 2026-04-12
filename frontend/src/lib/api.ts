/**
 * API client for Party Jam backend
 */

import type {
  CreatePartyRequest,
  CreatePartyResponse,
  JoinPartyRequest,
  JoinPartyResponse,
  PartyState,
  VoteRequest,
  VoteResponse,
  SuggestRequest,
  SuggestResponse,
  HeartbeatRequest,
  HeartbeatResponse,
  UpdateMoodRequest,
  UpdateKidFriendlyRequest,
  UpdateAllowSuggestionsRequest,
  UpdateLockedRequest,
  UpdateNowPlayingRequest,
  ApiError,
} from './types';

import { auth } from '@/firebase/config';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /** Gets the current Firebase ID token, or null if not signed in. */
  private async getIdToken(): Promise<string | null> {
    try {
      return (await auth?.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const idToken = await this.getIdToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error((data as ApiError).error?.message || 'API request failed');
      }

      return data as T;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Health check
  async health(): Promise<{ ok: boolean }> {
    return this.request('/health');
  }

  // Party lifecycle
  async createParty(data: CreatePartyRequest): Promise<CreatePartyResponse> {
    return this.request('/party', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resolveJoinCode(joinCode: string): Promise<{ partyId: string }> {
    return this.request(`/party/resolve?joinCode=${encodeURIComponent(joinCode)}`);
  }

  async joinParty(partyId: string, data: JoinPartyRequest): Promise<JoinPartyResponse> {
    return this.request(`/party/${partyId}/join`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async startParty(partyId: string, hostId: string): Promise<{ status: string }> {
    return this.request(`/party/${partyId}/start`, {
      method: 'POST',
      body: JSON.stringify({ hostId }),
    });
  }

  async endParty(partyId: string, hostId: string): Promise<{ status: string }> {
    return this.request(`/party/${partyId}/end`, {
      method: 'POST',
      body: JSON.stringify({ hostId }),
    });
  }

  async getPartyState(partyId: string, userId?: string): Promise<PartyState> {
    const query = userId ? `?userId=${userId}` : '';
    return this.request(`/party/${partyId}/state${query}`);
  }

  // Heartbeat
  async heartbeat(partyId: string, data: HeartbeatRequest): Promise<HeartbeatResponse> {
    return this.request(`/party/${partyId}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Voting
  async vote(partyId: string, data: VoteRequest): Promise<VoteResponse> {
    return this.request(`/party/${partyId}/vote`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Suggestions
  async suggestSong(partyId: string, data: SuggestRequest): Promise<SuggestResponse> {
    return this.request(`/party/${partyId}/suggest`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Settings
  async updateMood(partyId: string, data: UpdateMoodRequest): Promise<{ mood: string }> {
    return this.request(`/party/${partyId}/settings/mood`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateKidFriendly(
    partyId: string,
    data: UpdateKidFriendlyRequest
  ): Promise<{ kidFriendly: boolean }> {
    return this.request(`/party/${partyId}/settings/kidFriendly`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAllowSuggestions(
    partyId: string,
    data: UpdateAllowSuggestionsRequest
  ): Promise<{ allowSuggestions: boolean }> {
    return this.request(`/party/${partyId}/settings/allowSuggestions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLocked(
    partyId: string,
    data: UpdateLockedRequest
  ): Promise<{ locked: boolean }> {
    return this.request(`/party/${partyId}/settings/locked`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Now Playing
  async updateNowPlaying(
    partyId: string,
    data: UpdateNowPlayingRequest
  ): Promise<{ ok: boolean }> {
    return this.request(`/party/${partyId}/nowPlaying`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Host remove song from queue
  async removeFromQueue(partyId: string, hostId: string, trackId: string): Promise<{ ok: boolean }> {
    return this.request(`/party/${partyId}/queue/${trackId}`, {
      method: 'DELETE',
      body: JSON.stringify({ hostId }),
    });
  }

  // Move song to front of queue (play next)
  async playNextInQueue(partyId: string, hostId: string, trackId: string): Promise<{ ok: boolean }> {
    return this.request(`/party/${partyId}/queue/${trackId}/playNext`, {
      method: 'POST',
      body: JSON.stringify({ hostId }),
    });
  }

  // Pin or unpin a song
  async pinSong(partyId: string, hostId: string, trackId: string, isPinned: boolean): Promise<{ ok: boolean }> {
    return this.request(`/party/${partyId}/queue/${trackId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ hostId, isPinned }),
    });
  }

  // Skip current song (advance queue)
  async skipCurrentSong(partyId: string, hostId: string): Promise<{ ok: boolean }> {
    return this.request(`/party/${partyId}/skip`, {
      method: 'POST',
      body: JSON.stringify({ hostId }),
    });
  }

  // Regenerate join code
  async regenerateCode(partyId: string, hostId: string): Promise<{ joinCode: string }> {
    return this.request(`/party/${partyId}/code/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ hostId }),
    });
  }

  // Queue seeding
  async seedQueue(
    partyId: string,
    hostId: string,
    tracks: any[]
  ): Promise<{ ok: boolean; addedCount: number; queue: any[] }> {
    return this.request(`/party/${partyId}/seed`, {
      method: 'POST',
      body: JSON.stringify({ hostId, tracks }),
    });
  }

  // ---------------------------------------------------------------------------
  // User / music service endpoints
  // ---------------------------------------------------------------------------

  /** Upserts the user record in Postgres. Call on every Firebase login. */
  async syncUser(data: {
    firebaseUid: string;
    email?: string | null;
    displayName?: string | null;
    authProvider: 'email' | 'google' | 'spotify';
  }): Promise<{ id: string; firebaseUid: string }> {
    return this.request('/api/users/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** Stores an OAuth token for a connected music service. */
  async connectMusicService(
    firebaseUid: string,
    service: 'spotify' | 'apple_music' | 'deezer',
    data: {
      accessToken: string;
      refreshToken?: string | null;
      tokenExpiresAt?: string | null; // ISO date string
      serviceUserId?: string | null;
    }
  ): Promise<{ ok: boolean }> {
    return this.request(`/api/users/${firebaseUid}/music-services/${service}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /** Removes a connected music service. */
  async disconnectMusicService(
    firebaseUid: string,
    service: 'spotify' | 'apple_music' | 'deezer'
  ): Promise<{ ok: boolean }> {
    return this.request(`/api/users/${firebaseUid}/music-services/${service}`, {
      method: 'DELETE',
    });
  }

  /** Returns the list of services the user has connected (no tokens). */
  async getMusicServices(firebaseUid: string): Promise<{
    services: Array<{ service: string; serviceUserId: string | null; connectedAt: string; tokenExpiresAt: string | null }>;
  }> {
    return this.request(`/api/users/${firebaseUid}/music-services`);
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
