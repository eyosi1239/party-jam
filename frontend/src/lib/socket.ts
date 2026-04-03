/**
 * Socket.io client for Party Jam real-time events
 */

import { io, Socket } from 'socket.io-client';
import type { Song, SongStatus } from './types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

// Socket event payload types
export interface PartyJoinedPayload {
  partyId: string;
  activeMembersCount: number;
}

export interface PartyMemberJoinedPayload {
  userId: string;
  activeMembersCount: number;
}

export interface PartyPresencePayload {
  activeMembersCount: number;
}

export interface PartyVoteUpdatePayload {
  trackId: string;
  upvotes: number;
  downvotes: number;
  status: SongStatus;
  context: 'QUEUE' | 'TESTING';
}

export interface PartyQueueUpdatedPayload {
  queue: Array<{
    trackId: string;
    source: 'SPOTIFY_REC' | 'GUEST_SUGGESTION';
    status: SongStatus;
  }>;
}

export interface PartyNowPlayingPayload {
  trackId: string;
  startedAt: number;
}

export interface PartySuggestionTestingPayload {
  trackId: string;
  status: 'TESTING';
  expiresAt: number;
  song: Song;
  sampleUserIds: string[];
}

export interface PartySuggestionPromotedPayload {
  trackId: string;
  status: 'PROMOTED';
}

export interface PartySuggestionExpiredPayload {
  trackId: string;
  status: 'EXPIRED';
}

export interface PartySongRemovedPayload {
  trackId: string;
  reason: 'DOWNVOTE_THRESHOLD' | 'HOST_REMOVE';
}

export interface PartySettingsUpdatedPayload {
  mood: string;
  kidFriendly: boolean;
  allowSuggestions: boolean;
  locked?: boolean;
}

export interface PartyErrorPayload {
  code: string;
  message: string;
}

export interface PartyEndedPayload {
  partyId: string;
}

export interface PartyMembersUpdatedPayload {
  members: Array<{ userId: string; role: string; joinedAt: number; lastActiveAt: number }>;
  activeMembersCount: number;
}

export interface PartyCodeRegeneratedPayload {
  joinCode: string;
}

export interface PartyQueueLowPayload {
  partyId: string;
  currentLength: number;
}

// Typed event handlers map
export type SocketEventHandlers = {
  'party:joined': (payload: PartyJoinedPayload) => void;
  'party:memberJoined': (payload: PartyMemberJoinedPayload) => void;
  'party:presence': (payload: PartyPresencePayload) => void;
  'party:voteUpdate': (payload: PartyVoteUpdatePayload) => void;
  'party:queueUpdated': (payload: PartyQueueUpdatedPayload) => void;
  'party:nowPlaying': (payload: PartyNowPlayingPayload) => void;
  'party:suggestionTesting': (payload: PartySuggestionTestingPayload) => void;
  'party:suggestionPromoted': (payload: PartySuggestionPromotedPayload) => void;
  'party:suggestionExpired': (payload: PartySuggestionExpiredPayload) => void;
  'party:songRemoved': (payload: PartySongRemovedPayload) => void;
  'party:settingsUpdated': (payload: PartySettingsUpdatedPayload) => void;
  'party:error': (payload: PartyErrorPayload) => void;
  'party:ended': (payload: PartyEndedPayload) => void;
  'party:membersUpdated': (payload: PartyMembersUpdatedPayload) => void;
  'party:codeRegenerated': (payload: PartyCodeRegeneratedPayload) => void;
  'party:queueLow': (payload: PartyQueueLowPayload) => void;
};

class PartySocketClient {
  private socket: Socket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentPartyId: string | null = null;
  private currentUserId: string | null = null;

  /**
   * Connect to the socket server
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      // Re-join party room on reconnect (currentPartyId is null on first connect)
      if (this.currentPartyId && this.currentUserId) {
        this.socket?.emit('party:join', {
          partyId: this.currentPartyId,
          userId: this.currentUserId,
        });
        // Restart heartbeat since it was stopped on disconnect
        this.startHeartbeat(this.currentPartyId, this.currentUserId);
        console.log('[Socket] Rejoined party room after reconnect:', this.currentPartyId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.stopHeartbeat();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentPartyId = null;
    this.currentUserId = null;
  }

  /**
   * Join a party room
   * Emits party:join and the server will add the socket to the party room
   */
  joinPartyRoom(partyId: string, userId: string): void {
    if (!this.socket?.connected) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.currentPartyId = partyId;
    this.currentUserId = userId;

    this.socket.emit('party:join', { partyId, userId });
    console.log('[Socket] Joining party room:', partyId, 'as user:', userId);
  }

  /**
   * Start sending heartbeats to maintain active status
   * Emits party:heartbeat every 30 seconds
   */
  startHeartbeat(partyId: string, userId: string): void {
    // Clear any existing heartbeat
    this.stopHeartbeat();

    if (!this.socket?.connected) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.currentPartyId = partyId;
    this.currentUserId = userId;

    // Send initial heartbeat immediately
    this.socket.emit('party:heartbeat', { partyId, userId });

    // Set up interval for subsequent heartbeats
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('party:heartbeat', { partyId, userId });
        console.log('[Socket] Heartbeat sent:', partyId, userId);
      }
    }, HEARTBEAT_INTERVAL_MS);

    console.log('[Socket] Heartbeat started for party:', partyId);
  }

  /**
   * Stop sending heartbeats
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('[Socket] Heartbeat stopped');
    }
  }

  /**
   * Register a typed event listener
   */
  on<K extends keyof SocketEventHandlers>(
    event: K,
    handler: SocketEventHandlers[K]
  ): void {
    if (!this.socket) {
      console.error('[Socket] Not connected. Call connect() first.');
      return;
    }

    this.socket.on(event, handler as any);
  }

  /**
   * Remove a typed event listener
   */
  off<K extends keyof SocketEventHandlers>(
    event: K,
    handler?: SocketEventHandlers[K]
  ): void {
    if (!this.socket) {
      return;
    }

    if (handler) {
      this.socket.off(event, handler as any);
    } else {
      this.socket.off(event);
    }
  }

  /**
   * Get the current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export singleton instance
export const socketClient = new PartySocketClient();

// Convenience exports
export const connectSocket = () => socketClient.connect();
export const disconnectSocket = () => socketClient.disconnect();
export const joinPartyRoom = (partyId: string, userId: string) =>
  socketClient.joinPartyRoom(partyId, userId);
export const startHeartbeat = (partyId: string, userId: string) =>
  socketClient.startHeartbeat(partyId, userId);
export const stopHeartbeat = () => socketClient.stopHeartbeat();
export const onSocketEvent = <K extends keyof SocketEventHandlers>(
  event: K,
  handler: SocketEventHandlers[K]
) => socketClient.on(event, handler);
export const offSocketEvent = <K extends keyof SocketEventHandlers>(
  event: K,
  handler?: SocketEventHandlers[K]
) => socketClient.off(event, handler);
