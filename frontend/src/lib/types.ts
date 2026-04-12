/**
 * TypeScript types matching backend API contract
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

// API Request/Response types
export interface CreatePartyRequest {
  hostId: string;
  name?: string;
  mood?: string;
  kidFriendly?: boolean;
  allowSuggestions?: boolean;
}

export interface CreatePartyResponse {
  partyId: string;
  joinCode: string;
  party: Party;
}

export interface JoinPartyRequest {
  userId: string;
  displayName?: string;
  role?: UserRole;
}

export interface JoinPartyResponse {
  partyId: string;
  member: PartyMember;
}

export interface VoteRequest {
  userId: string;
  trackId: string;
  vote: VoteType;
  context: VoteContext;
}

export interface VoteResponse {
  trackId: string;
  upvotes: number;
  downvotes: number;
  status: SongStatus;
  context: VoteContext;
}

export interface SuggestRequest {
  userId: string;
  trackId: string;
  // Track metadata so the backend doesn't need to look it up
  title?: string;
  artist?: string;
  albumArtUrl?: string;
  explicit?: boolean;
}

export interface SuggestResponse {
  suggestion: Song;
  sampleUserIds: string[];
}

export interface HeartbeatRequest {
  userId: string;
}

export interface HeartbeatResponse {
  active: boolean;
}

export interface UpdateMoodRequest {
  hostId: string;
  mood: string;
}

export interface UpdateKidFriendlyRequest {
  hostId: string;
  kidFriendly: boolean;
}

export interface UpdateAllowSuggestionsRequest {
  hostId: string;
  allowSuggestions: boolean;
}

export interface UpdateLockedRequest {
  hostId: string;
  locked: boolean;
}

export interface UpdateNowPlayingRequest {
  hostId: string;
  trackId: string;
  startedAt: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
