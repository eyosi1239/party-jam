/**
 * Party routes
 */

import { Router, Request, Response } from 'express';
import type { Server } from 'socket.io';
import { store } from '../store.js';
import { generateId, generateJoinCode, createError, randomSample } from '../utils.js';
import { CONFIG } from '../config.js';
import type { Party, PartyMember, VoteType, VoteContext, Song, Suggestion } from '../types.js';
import { createPartyLimiter, joinPartyLimiter, voteLimiter, suggestLimiter, seedLimiter } from '../middleware/rateLimits.js';

let io: Server;

export function setSocketIO(socketIO: Server) {
  io = socketIO;
}

const router = Router();

// POST /party - Create party
router.post('/party', createPartyLimiter, (req: Request, res: Response) => {
  const { hostId, name, mood, kidFriendly, allowSuggestions } = req.body;

  if (!hostId) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId is required'));
  }

  const partyId = generateId('party');
  const joinCode = generateJoinCode();
  const now = Date.now();

  const party: Party = {
    partyId,
    hostId,
    ...(name ? { name } : {}),
    status: 'CREATED',
    mood: mood || 'chill',
    kidFriendly: kidFriendly ?? false,
    allowSuggestions: allowSuggestions ?? true,
    locked: false,
    createdAt: now,
  };

  store.createParty(party);
  store.setJoinCode(joinCode, partyId);

  // Add host as first member
  const hostMember: PartyMember = {
    userId: hostId,
    role: 'HOST',
    joinedAt: now,
    lastActiveAt: now,
  };
  store.addMember(partyId, hostMember);

  res.json({
    partyId,
    joinCode,
    party,
  });
});

// GET /party/resolve - Resolve joinCode to partyId
router.get('/party/resolve', (req: Request, res: Response) => {
  const { joinCode } = req.query;

  if (!joinCode || typeof joinCode !== 'string') {
    return res.status(400).json(createError('INVALID_REQUEST', 'joinCode is required'));
  }

  const partyId = store.getPartyIdByJoinCode(joinCode.toUpperCase());
  if (!partyId) {
    return res.status(404).json(createError('JOIN_CODE_INVALID', 'Invalid join code. Please check the code and try again.'));
  }

  res.json({ partyId });
});

// POST /party/:partyId/join - Join party
router.post('/party/:partyId/join', joinPartyLimiter, (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { userId, displayName } = req.body;

  if (!userId) {
    return res.status(400).json(createError('INVALID_REQUEST', 'userId is required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  // Block new guests when room is locked (host can still rejoin)
  if (party.locked && userId !== party.hostId) {
    const existing = store.getMember(partyId, userId);
    if (!existing) {
      return res.status(403).json(createError('ROOM_LOCKED', 'This room is locked and not accepting new guests'));
    }
  }

  // Check if already a member
  let member = store.getMember(partyId, userId);
  const now = Date.now();

  if (!member) {
    // New member
    member = {
      userId,
      ...(displayName?.trim() ? { displayName: displayName.trim() } : {}),
      role: 'GUEST',
      joinedAt: now,
      lastActiveAt: now,
    };
    store.addMember(partyId, member);
  } else {
    // Rejoining - update activity
    store.updateMemberActivity(partyId, userId);
    member = store.getMember(partyId, userId)!;
  }

  // Broadcast updated members list to everyone in the room
  if (io) {
    const state = store.getState(partyId);
    if (state) {
      io.to(`party:${partyId}`).emit('party:membersUpdated', {
        members: state.members,
        activeMembersCount: state.activeMembersCount,
      });
    }
  }

  res.json({
    partyId,
    member,
  });
});

// GET /party/:partyId/state - Get party state
router.get('/party/:partyId/state', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { userId } = req.query;

  const state = store.getState(partyId);
  if (!state) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  // Update activity if userId provided
  if (userId && typeof userId === 'string') {
    store.updateMemberActivity(partyId, userId);
  }

  res.json(state);
});

// POST /party/:partyId/start - Start party
router.post('/party/:partyId/start', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId } = req.body;

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can start party'));
  }

  if (party.status !== 'CREATED') {
    return res.status(400).json(createError('INVALID_STATE', 'Party already started or ended'));
  }

  store.updateParty(partyId, { status: 'LIVE' });

  // Auto-advance to first song if queue already has tracks
  const partyData = store.getPartyData(partyId);
  if (partyData && partyData.queue.length > 0 && !partyData.nowPlaying) {
    const firstSong = store.advanceQueue(partyId);
    if (io && firstSong) {
      const state = store.getState(partyId);
      if (state) {
        io.to(`party:${partyId}`).emit('party:queueUpdated', { queue: state.queue });
      }
      io.to(`party:${partyId}`).emit('party:nowPlaying', {
        trackId: firstSong.trackId,
        startedAt: Date.now(),
        song: firstSong,
      });
    }
  }

  res.json({ status: 'LIVE' });
});

// POST /party/:partyId/seed - Seed queue with tracks (host only)
router.post('/party/:partyId/seed', seedLimiter, (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId, tracks } = req.body;

  if (!hostId) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId is required'));
  }

  if (!tracks || !Array.isArray(tracks)) {
    return res.status(400).json(createError('INVALID_REQUEST', 'tracks must be an array'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can seed queue'));
  }

  // Add each track to queue
  const addedTracks: Song[] = [];
  for (const track of tracks) {
    // Filter out explicit tracks if kid-friendly mode is enabled
    if (party.kidFriendly && track.explicit) {
      continue;
    }

    const song: Song = {
      trackId: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      albumArtUrl: track.album.images[0]?.url || '',
      explicit: track.explicit,
      source: 'SPOTIFY_REC',
      status: 'QUEUED',
      upvotes: 0,
      downvotes: 0,
    };

    store.addToQueue(partyId, song);
    addedTracks.push(song);
  }

  // Broadcast queue updated
  if (io) {
    const state = store.getState(partyId);
    if (state) {
      io.to(`party:${partyId}`).emit('party:queueUpdated', { queue: state.queue });
    }
  }

  res.json({
    ok: true,
    addedCount: addedTracks.length,
    queue: addedTracks,
  });
});

// POST /party/:partyId/end - End party
router.post('/party/:partyId/end', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId } = req.body;

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can end party'));
  }

  store.updateParty(partyId, { status: 'ENDED' });

  if (io) {
    io.to(`party:${partyId}`).emit('party:ended', { partyId });
  }

  res.json({ status: 'ENDED' });
});

// POST /party/:partyId/heartbeat - Active tracking
router.post('/party/:partyId/heartbeat', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json(createError('INVALID_REQUEST', 'userId is required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  const member = store.getMember(partyId, userId);
  if (!member) {
    return res.status(404).json(createError('MEMBER_NOT_FOUND', 'User is not a member of this party'));
  }

  // Update activity timestamp
  const updated = store.updateMemberActivity(partyId, userId);

  res.json({ active: updated });
});

// POST /party/:partyId/vote - Vote on a song
router.post('/party/:partyId/vote', voteLimiter, (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { userId, trackId, vote, context } = req.body;

  if (!userId || !trackId || !vote || !context) {
    return res.status(400).json(createError('INVALID_REQUEST', 'userId, trackId, vote, and context are required'));
  }

  if (!['UP', 'DOWN', 'NONE'].includes(vote)) {
    return res.status(400).json(createError('INVALID_VOTE', 'vote must be UP, DOWN, or NONE'));
  }

  if (!['QUEUE', 'TESTING'].includes(context)) {
    return res.status(400).json(createError('INVALID_REQUEST', 'context must be QUEUE or TESTING'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.status !== 'LIVE') {
    return res.status(400).json(createError('PARTY_NOT_LIVE', 'Party must be live to vote'));
  }

  // Update member activity
  store.updateMemberActivity(partyId, userId);

  // Set the vote
  store.setVote(partyId, userId, trackId, vote as VoteType, context as VoteContext);

  // Update song vote counts
  store.updateSongVotes(partyId, trackId);

  // Get updated counts
  const counts = store.getVoteCounts(partyId, trackId);
  const activeMembersCount = store.getActiveMembersCount(partyId);

  // Check thresholds
  let status: string = context === 'QUEUE' ? 'QUEUED' : 'TESTING';
  let shouldRemove = false;
  let shouldPromote = false;

  // Removal threshold (40% downvotes)
  if (counts.downvotes >= CONFIG.REMOVE_THRESHOLD * activeMembersCount) {
    status = 'REMOVED';
    shouldRemove = true;
  }

  // Promotion threshold (40% upvotes) - only for suggestions
  if (context === 'TESTING' && counts.upvotes >= CONFIG.PROMOTE_THRESHOLD * activeMembersCount) {
    status = 'PROMOTED';
    shouldPromote = true;
  }

  // Update status
  if (shouldRemove || shouldPromote) {
    store.updateSongStatus(partyId, trackId, status as any);
  }

  // Handle removal from queue
  if (shouldRemove && context === 'QUEUE') {
    store.removeFromQueue(partyId, trackId);

    // Broadcast song removed
    if (io) {
      io.to(`party:${partyId}`).emit('party:songRemoved', {
        trackId,
        reason: 'DOWNVOTE_THRESHOLD',
      });

      // Broadcast queue updated
      const state = store.getState(partyId);
      if (state) {
        io.to(`party:${partyId}`).emit('party:queueUpdated', { queue: state.queue });
      }
    }
  }

  // Handle suggestion promotion
  if (shouldPromote && context === 'TESTING') {
    const suggestion = store.getSuggestion(partyId, trackId);
    if (suggestion) {
      // Add to queue
      suggestion.song.status = 'PROMOTED';
      store.addToQueue(partyId, suggestion.song);

      // Broadcast promotion
      if (io) {
        io.to(`party:${partyId}`).emit('party:suggestionPromoted', {
          trackId,
          status: 'PROMOTED',
        });

        // Broadcast queue updated
        const state = store.getState(partyId);
        if (state) {
          io.to(`party:${partyId}`).emit('party:queueUpdated', { queue: state.queue });
        }
      }
    }
  }

  // Always broadcast vote update
  if (io) {
    io.to(`party:${partyId}`).emit('party:voteUpdate', {
      trackId,
      upvotes: counts.upvotes,
      downvotes: counts.downvotes,
      status,
      context,
    });
  }

  res.json({
    trackId,
    upvotes: counts.upvotes,
    downvotes: counts.downvotes,
    status,
    context,
  });
});

// POST /party/:partyId/suggest - Suggest a song
router.post('/party/:partyId/suggest', suggestLimiter, (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { userId, trackId, title, artist, albumArtUrl, explicit: isExplicit } = req.body;

  if (!userId || !trackId) {
    return res.status(400).json(createError('INVALID_REQUEST', 'userId and trackId are required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  // Reject explicit tracks when kid-friendly mode is on
  if (party.kidFriendly && isExplicit) {
    return res.status(403).json(createError('EXPLICIT_NOT_ALLOWED', 'Explicit tracks are not allowed in kid-friendly mode'));
  }

  if (!party.allowSuggestions) {
    return res.status(403).json(createError('SUGGESTIONS_DISABLED', 'Suggestions are disabled for this party'));
  }

  if (party.status !== 'LIVE') {
    return res.status(400).json(createError('PARTY_NOT_LIVE', 'Party must be live to suggest songs'));
  }

  // Update member activity
  store.updateMemberActivity(partyId, userId);

  // Get active members
  const activeMembers = store.getActiveMembers(partyId);
  const activeMembersCount = activeMembers.length;

  // Calculate sample size: max(3, ceil(activeMembersCount * 0.05)), cap 15
  let sampleSize = Math.max(CONFIG.SAMPLE_MIN, Math.ceil(activeMembersCount * CONFIG.SAMPLE_PERCENT));
  sampleSize = Math.min(sampleSize, CONFIG.SAMPLE_CAP);

  // Random sample of active members
  const sampleMembers = randomSample(activeMembers, sampleSize);
  const sampleUserIds = sampleMembers.map((m) => m.userId);

  // Build song from metadata sent by the client
  const song: Song = {
    trackId,
    title: title || 'Suggested Song',
    artist: artist || 'Unknown Artist',
    albumArtUrl: albumArtUrl || '',
    explicit: isExplicit ?? false,
    source: 'GUEST_SUGGESTION',
    status: 'TESTING',
    upvotes: 0,
    downvotes: 0,
  };

  // Store suggestion
  const suggestion: Suggestion = {
    trackId,
    song,
    sampleUserIds,
    createdAt: Date.now(),
  };

  const partyData = store.getPartyData(partyId);
  if (partyData) {
    partyData.suggestions.set(trackId, suggestion);
  }

  // Emit to sampled users only
  if (io) {
    sampleUserIds.forEach((sampledUserId) => {
      // Find socket(s) for this user in the party room
      const roomName = `party:${partyId}`;
      const room = io.sockets.adapter.rooms.get(roomName);
      if (room) {
        room.forEach((socketId) => {
          const socket = io.sockets.sockets.get(socketId);
          // In a real app, you'd track userId per socket
          // For now, broadcast to all in room with filter info
          socket?.emit('party:suggestionTesting', {
            trackId,
            status: 'TESTING',
            expiresAt: Date.now() + CONFIG.SUGGEST_EXPIRE_AT_MS,
            song,
            sampleUserIds, // Frontend can check if current user is in sample
          });
        });
      }
    });
  }

  // Set timeout to expand sample at 2 minutes
  setTimeout(() => {
    const suggestion = store.getSuggestion(partyId, trackId);
    if (!suggestion) return;
    if (suggestion.song.status !== 'TESTING') return;
    if (suggestion.expandedAt) return; // Already expanded

    // Expand sample once
    const activeMembers = store.getActiveMembers(partyId);
    let expandedSize = sampleSize * 2;
    expandedSize = Math.min(expandedSize, CONFIG.SAMPLE_CAP);
    const expandedMembers = randomSample(activeMembers, expandedSize);
    const expandedUserIds = expandedMembers.map((m) => m.userId);

    suggestion.sampleUserIds = expandedUserIds;
    suggestion.expandedAt = Date.now();

    // Emit updated testing to new sampled users
    if (io) {
      io.to(`party:${partyId}`).emit('party:suggestionTesting', {
        trackId,
        status: 'TESTING',
        expiresAt: suggestion.createdAt + CONFIG.SUGGEST_EXPIRE_AT_MS,
        song: suggestion.song,
        sampleUserIds: expandedUserIds,
      });
    }
  }, CONFIG.SUGGEST_EXPAND_AT_MS);

  // Set timeout to expire at 5 minutes
  setTimeout(() => {
    const suggestion = store.getSuggestion(partyId, trackId);
    if (!suggestion) return;
    if (suggestion.song.status !== 'TESTING') return;

    // Expire suggestion
    suggestion.song.status = 'EXPIRED';

    if (io) {
      io.to(`party:${partyId}`).emit('party:suggestionExpired', {
        trackId,
        status: 'EXPIRED',
      });
    }
  }, CONFIG.SUGGEST_EXPIRE_AT_MS);

  res.json({
    suggestion: song,
    sampleUserIds,
  });
});

// POST /party/:partyId/settings/mood - Update mood
router.post('/party/:partyId/settings/mood', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId, mood } = req.body;

  if (!hostId || !mood) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId and mood are required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can update mood'));
  }

  store.updateParty(partyId, { mood });

  // Broadcast settings update
  if (io) {
    const updatedParty = store.getParty(partyId);
    if (updatedParty) {
      io.to(`party:${partyId}`).emit('party:settingsUpdated', {
        mood: updatedParty.mood,
        kidFriendly: updatedParty.kidFriendly,
        allowSuggestions: updatedParty.allowSuggestions,
        locked: updatedParty.locked,
      });
    }
  }

  res.json({ mood });
});

// POST /party/:partyId/settings/kidFriendly - Toggle kid-friendly
router.post('/party/:partyId/settings/kidFriendly', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId, kidFriendly } = req.body;

  if (!hostId || kidFriendly === undefined) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId and kidFriendly are required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can update kid-friendly setting'));
  }

  store.updateParty(partyId, { kidFriendly });

  // Broadcast settings update
  if (io) {
    const updatedParty = store.getParty(partyId);
    if (updatedParty) {
      io.to(`party:${partyId}`).emit('party:settingsUpdated', {
        mood: updatedParty.mood,
        kidFriendly: updatedParty.kidFriendly,
        allowSuggestions: updatedParty.allowSuggestions,
        locked: updatedParty.locked,
      });
    }
  }

  res.json({ kidFriendly });
});

// POST /party/:partyId/settings/allowSuggestions - Toggle guest suggestions
router.post('/party/:partyId/settings/allowSuggestions', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId, allowSuggestions } = req.body;

  if (!hostId || allowSuggestions === undefined) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId and allowSuggestions are required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can update suggestions setting'));
  }

  store.updateParty(partyId, { allowSuggestions });

  // Broadcast settings update
  if (io) {
    const updatedParty = store.getParty(partyId);
    if (updatedParty) {
      io.to(`party:${partyId}`).emit('party:settingsUpdated', {
        mood: updatedParty.mood,
        kidFriendly: updatedParty.kidFriendly,
        allowSuggestions: updatedParty.allowSuggestions,
        locked: updatedParty.locked,
      });
    }
  }

  res.json({ allowSuggestions });
});

// POST /party/:partyId/settings/locked - Lock/unlock the room
router.post('/party/:partyId/settings/locked', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId, locked } = req.body;

  if (!hostId || locked === undefined) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId and locked are required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can lock/unlock the room'));
  }

  store.updateParty(partyId, { locked });

  // Broadcast settings update
  if (io) {
    const updatedParty = store.getParty(partyId);
    if (updatedParty) {
      io.to(`party:${partyId}`).emit('party:settingsUpdated', {
        mood: updatedParty.mood,
        kidFriendly: updatedParty.kidFriendly,
        allowSuggestions: updatedParty.allowSuggestions,
        locked: updatedParty.locked,
      });
    }
  }

  res.json({ locked });
});

// POST /party/:partyId/nowPlaying - Update now playing
router.post('/party/:partyId/nowPlaying', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId, trackId, startedAt } = req.body;

  if (!hostId || !trackId || !startedAt) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId, trackId, and startedAt are required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can update now playing'));
  }

  const partyData = store.getPartyData(partyId);
  if (!partyData) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  // Find song in queue
  const song = partyData.queue.find((s) => s.trackId === trackId);
  if (song) {
    partyData.nowPlaying = song;
  } else {
    // If not in queue, create a basic song object (for MVP)
    partyData.nowPlaying = {
      trackId,
      title: 'Now Playing',
      artist: 'Unknown',
      albumArtUrl: '',
      explicit: false,
      source: 'SPOTIFY_REC',
      status: 'QUEUED',
      upvotes: 0,
      downvotes: 0,
    };
  }

  // Broadcast now playing (include full song so frontend doesn't need to queue-lookup)
  if (io) {
    io.to(`party:${partyId}`).emit('party:nowPlaying', {
      trackId,
      startedAt,
      song: partyData.nowPlaying,
    });
  }

  res.json({ ok: true });
});

// POST /party/:partyId/queue/:trackId/playNext - Move song to front of queue
router.post('/party/:partyId/queue/:trackId/playNext', (req: Request, res: Response) => {
  const { partyId, trackId } = req.params;
  const { hostId } = req.body;

  if (!hostId) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId is required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can reorder queue'));
  }

  store.moveToFront(partyId, trackId);

  if (io) {
    const state = store.getState(partyId);
    if (state) {
      io.to(`party:${partyId}`).emit('party:queueUpdated', { queue: state.queue });
    }
  }

  res.json({ ok: true });
});

// POST /party/:partyId/queue/:trackId/pin - Pin or unpin a song
router.post('/party/:partyId/queue/:trackId/pin', (req: Request, res: Response) => {
  const { partyId, trackId } = req.params;
  const { hostId, isPinned } = req.body;

  if (!hostId || isPinned === undefined) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId and isPinned are required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can pin songs'));
  }

  store.setPinned(partyId, trackId, isPinned);

  if (io) {
    const state = store.getState(partyId);
    if (state) {
      io.to(`party:${partyId}`).emit('party:queueUpdated', { queue: state.queue });
    }
  }

  res.json({ ok: true });
});

// POST /party/:partyId/skip - Advance to next song in queue
router.post('/party/:partyId/skip', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId } = req.body;

  if (!hostId) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId is required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can skip songs'));
  }

  const nextSong = store.advanceQueue(partyId);

  if (io) {
    const state = store.getState(partyId);
    if (state) {
      io.to(`party:${partyId}`).emit('party:queueUpdated', { queue: state.queue });
      if (nextSong) {
        io.to(`party:${partyId}`).emit('party:nowPlaying', {
          trackId: nextSong.trackId,
          startedAt: Date.now(),
          song: nextSong,
        });
      }
    }
  }

  res.json({ ok: true, nowPlaying: nextSong });
});

// POST /party/:partyId/code/regenerate - Generate a new join code
router.post('/party/:partyId/code/regenerate', (req: Request, res: Response) => {
  const { partyId } = req.params;
  const { hostId } = req.body;

  if (!hostId) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId is required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can regenerate the code'));
  }

  const newCode = generateJoinCode();
  store.setJoinCode(newCode, partyId);

  if (io) {
    io.to(`party:${partyId}`).emit('party:codeRegenerated', { joinCode: newCode });
  }

  res.json({ joinCode: newCode });
});

// DELETE /party/:partyId/queue/:trackId - Host force-remove song
router.delete('/party/:partyId/queue/:trackId', (req: Request, res: Response) => {
  const { partyId, trackId } = req.params;
  const { hostId } = req.body;

  if (!hostId) {
    return res.status(400).json(createError('INVALID_REQUEST', 'hostId is required'));
  }

  const party = store.getParty(partyId);
  if (!party) {
    return res.status(404).json(createError('PARTY_NOT_FOUND', 'Party not found'));
  }

  if (party.hostId !== hostId) {
    return res.status(403).json(createError('NOT_HOST', 'Only host can remove songs'));
  }

  store.removeFromQueue(partyId, trackId);

  if (io) {
    const state = store.getState(partyId);
    if (state) {
      io.to(`party:${partyId}`).emit('party:queueUpdated', { queue: state.queue });
    }
  }

  res.json({ ok: true });
});

export default router;
