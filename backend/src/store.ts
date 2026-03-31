/**
 * In-memory store for parties
 */

import type { Party, PartyData, PartyMember, Song, PartyState } from './types.js';
import { CONFIG } from './config.js';

export class PartyStore {
  private parties = new Map<string, PartyData>();
  private joinCodes = new Map<string, string>(); // joinCode -> partyId
  private partyJoinCodes = new Map<string, string>(); // partyId -> joinCode

  createParty(party: Party): void {
    const partyData: PartyData = {
      party,
      members: new Map(),
      queue: [],
      nowPlaying: null,
      votes: new Map(),
      suggestions: new Map(),
    };
    this.parties.set(party.partyId, partyData);
  }

  setJoinCode(joinCode: string, partyId: string): void {
    // Remove old code if regenerating
    const oldCode = this.partyJoinCodes.get(partyId);
    if (oldCode) this.joinCodes.delete(oldCode);
    this.joinCodes.set(joinCode, partyId);
    this.partyJoinCodes.set(partyId, joinCode);
  }

  getJoinCodeForParty(partyId: string): string | null {
    return this.partyJoinCodes.get(partyId) || null;
  }

  getPartyByJoinCode(joinCode: string): Party | null {
    const partyId = this.joinCodes.get(joinCode);
    if (!partyId) return null;
    return this.getParty(partyId);
  }

  getPartyIdByJoinCode(joinCode: string): string | null {
    return this.joinCodes.get(joinCode) || null;
  }

  getParty(partyId: string): Party | null {
    return this.parties.get(partyId)?.party || null;
  }

  getPartyData(partyId: string): PartyData | null {
    return this.parties.get(partyId) || null;
  }

  updateParty(partyId: string, updates: Partial<Party>): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    partyData.party = { ...partyData.party, ...updates };
    return true;
  }

  addMember(partyId: string, member: PartyMember): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    partyData.members.set(member.userId, member);
    return true;
  }

  getMember(partyId: string, userId: string): PartyMember | null {
    const partyData = this.parties.get(partyId);
    if (!partyData) return null;
    return partyData.members.get(userId) || null;
  }

  updateMemberActivity(partyId: string, userId: string): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    const member = partyData.members.get(userId);
    if (!member) return false;

    member.lastActiveAt = Date.now();
    return true;
  }

  getActiveMembersCount(partyId: string): number {
    const partyData = this.parties.get(partyId);
    if (!partyData) return 0;

    const now = Date.now();
    const activeWindow = CONFIG.ACTIVE_WINDOW_MIN * 60 * 1000;

    let count = 0;
    for (const member of partyData.members.values()) {
      if (now - member.lastActiveAt <= activeWindow) {
        count++;
      }
    }
    return count;
  }

  getActiveMembers(partyId: string): PartyMember[] {
    const partyData = this.parties.get(partyId);
    if (!partyData) return [];

    const now = Date.now();
    const activeWindow = CONFIG.ACTIVE_WINDOW_MIN * 60 * 1000;

    return Array.from(partyData.members.values()).filter(
      (member) => now - member.lastActiveAt <= activeWindow
    );
  }

  getAllMembers(partyId: string): PartyMember[] {
    const partyData = this.parties.get(partyId);
    if (!partyData) return [];
    return Array.from(partyData.members.values());
  }

  getState(partyId: string): PartyState | null {
    const partyData = this.parties.get(partyId);
    if (!partyData) return null;

    const testingSuggestions = Array.from(partyData.suggestions.values())
      .map((s) => s.song)
      .filter((s) => s.status === 'TESTING');

    return {
      party: partyData.party,
      activeMembersCount: this.getActiveMembersCount(partyId),
      members: this.getAllMembers(partyId),
      nowPlaying: partyData.nowPlaying,
      queue: partyData.queue,
      testingSuggestions,
    };
  }

  addToQueue(partyId: string, song: Song): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    // Prevent duplicates
    if (partyData.queue.some((s) => s.trackId === song.trackId)) return false;

    partyData.queue.push(song);
    return true;
  }

  removeFromQueue(partyId: string, trackId: string): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    const initialLength = partyData.queue.length;
    partyData.queue = partyData.queue.filter((song) => song.trackId !== trackId);
    return partyData.queue.length < initialLength;
  }

  getSongFromQueue(partyId: string, trackId: string): Song | null {
    const partyData = this.parties.get(partyId);
    if (!partyData) return null;
    return partyData.queue.find((song) => song.trackId === trackId) || null;
  }

  // Vote tracking methods
  setVote(partyId: string, userId: string, trackId: string, voteType: 'UP' | 'DOWN' | 'NONE', context: 'QUEUE' | 'TESTING'): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    const voteKey = `${userId}:${trackId}`;

    if (voteType === 'NONE') {
      partyData.votes.delete(voteKey);
    } else {
      partyData.votes.set(voteKey, {
        userId,
        trackId,
        vote: voteType,
        context,
        timestamp: Date.now(),
      });
    }

    return true;
  }

  getVoteCounts(partyId: string, trackId: string): { upvotes: number; downvotes: number } {
    const partyData = this.parties.get(partyId);
    if (!partyData) return { upvotes: 0, downvotes: 0 };

    let upvotes = 0;
    let downvotes = 0;

    for (const vote of partyData.votes.values()) {
      if (vote.trackId === trackId) {
        if (vote.vote === 'UP') upvotes++;
        else if (vote.vote === 'DOWN') downvotes++;
      }
    }

    return { upvotes, downvotes };
  }

  updateSongVotes(partyId: string, trackId: string): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    const counts = this.getVoteCounts(partyId, trackId);

    // Update queue song
    const queueSong = partyData.queue.find((s) => s.trackId === trackId);
    if (queueSong) {
      queueSong.upvotes = counts.upvotes;
      queueSong.downvotes = counts.downvotes;
      return true;
    }

    // Update suggestion song
    const suggestion = partyData.suggestions.get(trackId);
    if (suggestion) {
      suggestion.song.upvotes = counts.upvotes;
      suggestion.song.downvotes = counts.downvotes;
      return true;
    }

    return false;
  }

  getSuggestion(partyId: string, trackId: string) {
    const partyData = this.parties.get(partyId);
    if (!partyData) return null;
    return partyData.suggestions.get(trackId) || null;
  }

  moveToFront(partyId: string, trackId: string): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    const idx = partyData.queue.findIndex((s) => s.trackId === trackId);
    if (idx === -1) return false;
    if (idx === 0) return true;

    const [song] = partyData.queue.splice(idx, 1);
    partyData.queue.unshift(song);
    return true;
  }

  setPinned(partyId: string, trackId: string, isPinned: boolean): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    const song = partyData.queue.find((s) => s.trackId === trackId);
    if (!song) return false;

    song.isPinned = isPinned;
    if (isPinned) this.moveToFront(partyId, trackId);
    return true;
  }

  advanceQueue(partyId: string): Song | null {
    const partyData = this.parties.get(partyId);
    if (!partyData || partyData.queue.length === 0) return null;

    const [nextSong] = partyData.queue.splice(0, 1);
    partyData.nowPlaying = nextSong;
    return nextSong;
  }

  updateSongStatus(partyId: string, trackId: string, status: 'QUEUED' | 'TESTING' | 'PROMOTED' | 'REMOVED' | 'EXPIRED'): boolean {
    const partyData = this.parties.get(partyId);
    if (!partyData) return false;

    // Update queue song
    const queueSong = partyData.queue.find((s) => s.trackId === trackId);
    if (queueSong) {
      queueSong.status = status;
      return true;
    }

    // Update suggestion song
    const suggestion = partyData.suggestions.get(trackId);
    if (suggestion) {
      suggestion.song.status = status;
      return true;
    }

    return false;
  }
}

export const store = new PartyStore();
