/**
 * Type definitions matching docs/api-contract.md
 */

export type PartyStatus = 'CREATED' | 'LIVE' | 'ENDED';
export type UserRole = 'HOST' | 'GUEST';
export type SongSource = 'SPOTIFY_REC' | 'GUEST_SUGGESTION';
export type SongStatus = 'QUEUED' | 'TESTING' | 'PROMOTED' | 'REMOVED' | 'EXPIRED';
export type VoteType = 'UP' | 'DOWN' | 'NONE';
export type VoteContext = 'QUEUE' | 'TESTING';

export interface Party {
  partyId: string;
  hostId: string;
  name?: string;
  status: PartyStatus;
  mood: string;
  kidFriendly: boolean;
  allowSuggestions: boolean;
  locked: boolean;
  createdAt: number;
}

export interface PartyMember {
  userId: string;
  displayName?: string;
  role: UserRole;
  joinedAt: number;
  lastActiveAt: number;
}

export interface Song {
  trackId: string;
  title: string;
  artist: string;
  albumArtUrl: string;
  explicit: boolean;
  source: SongSource;
  status: SongStatus;
  upvotes: number;
  downvotes: number;
  isPinned?: boolean;
}

export interface PartyState {
  party: Party;
  activeMembersCount: number;
  members: PartyMember[];
  nowPlaying: Song | null;
  queue: Song[];
  testingSuggestions: Song[];
}

export interface Vote {
  userId: string;
  trackId: string;
  vote: VoteType;
  context: VoteContext;
  timestamp: number;
}

export interface Suggestion {
  trackId: string;
  song: Song;
  sampleUserIds: string[];
  createdAt: number;
  expandedAt?: number;
}

export interface PartyData {
  party: Party;
  members: Map<string, PartyMember>;
  queue: Song[];
  nowPlaying: Song | null;
  votes: Map<string, Vote>; // key: `${userId}:${trackId}`
  suggestions: Map<string, Suggestion>; // key: trackId
}
