import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

// Initialize Firebase Admin SDK once (uses service account env vars)
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Private key comes from env as a single string with literal \n — replace to real newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
import { ENV } from './config.js';
import { store } from './store.js';
import { loadActiveParties } from './db/partyRepo.js';
import partyRoutes, { setSocketIO } from './routes/party.js';
import appleMusicRoutes from './routes/appleMusic.js';
import userRoutes from './routes/users.js';
import deezerRoutes from './routes/deezer.js';
import { globalLimiter } from './middleware/rateLimits.js';
import { runMigrations } from './db/migrate.js';
import { getAuth } from 'firebase-admin/auth';

// FRONTEND_ORIGIN supports a comma-separated list for multi-origin prod setups.
// e.g. "https://partyjam.app,https://www.partyjam.app"
const allowedOrigins = ENV.FRONTEND_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
const corsOrigin = allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Pass io instance to routes for broadcasting
setSocketIO(io);

// Middleware
app.use(helmet({
  // CSP is handled at the CDN/host level for the frontend; keep it off here
  // so API responses aren't blocked by overly strict defaults.
  contentSecurityPolicy: false,
}));
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(globalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Routes
app.use('/', partyRoutes);
app.use('/', appleMusicRoutes);
app.use('/', userRoutes);
app.use('/', deezerRoutes);

// Socket.io auth middleware — verifies Firebase token if present, guests pass through
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (token) {
    try {
      const decoded = await getAuth().verifyIdToken(token);
      socket.data.uid = decoded.uid;
    } catch {
      // Invalid token — reject the connection outright
      return next(new Error('Invalid auth token'));
    }
  }
  // No token = anonymous guest, allowed
  next();
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // party:join - Client joins a party room
  socket.on('party:join', ({ partyId, userId }) => {
    if (!partyId || !userId) {
      socket.emit('party:error', {
        code: 'INVALID_REQUEST',
        message: 'partyId and userId are required',
      });
      return;
    }

    // If the socket has a verified Firebase UID, ensure the client isn't spoofing a different userId
    if (socket.data.uid && socket.data.uid !== userId) {
      socket.emit('party:error', {
        code: 'UNAUTHORIZED',
        message: 'userId does not match authenticated user',
      });
      return;
    }

    const party = store.getParty(partyId);
    if (!party) {
      socket.emit('party:error', {
        code: 'PARTY_NOT_FOUND',
        message: 'Party not found',
      });
      return;
    }

    // Join socket room
    const roomName = `party:${partyId}`;
    socket.join(roomName);

    // Re-insert the member if they're not in the map (e.g. after a backend restart
    // that restored party metadata from DB but cleared the in-memory members map).
    if (!store.getMember(partyId, userId)) {
      const now = Date.now();
      store.addMember(partyId, {
        userId,
        role: userId === party.hostId ? 'HOST' : 'GUEST',
        joinedAt: now,
        lastActiveAt: now,
      });
    } else {
      store.updateMemberActivity(partyId, userId);
    }

    // Get active members count
    const activeMembersCount = store.getActiveMembersCount(partyId);

    // Emit to the user who joined
    socket.emit('party:joined', {
      partyId,
      activeMembersCount,
    });

    // Broadcast to other room members
    socket.to(roomName).emit('party:memberJoined', {
      userId,
      activeMembersCount,
    });

    console.log(`User ${userId} joined party ${partyId}`);
  });

  // party:heartbeat - Active tracking
  socket.on('party:heartbeat', ({ partyId, userId }) => {
    if (!partyId || !userId) {
      socket.emit('party:error', {
        code: 'INVALID_REQUEST',
        message: 'partyId and userId are required',
      });
      return;
    }

    const party = store.getParty(partyId);
    if (!party) {
      socket.emit('party:error', {
        code: 'PARTY_NOT_FOUND',
        message: 'Party not found',
      });
      return;
    }

    // Get count before update
    const beforeCount = store.getActiveMembersCount(partyId);

    // Re-insert the member if absent (e.g. after a backend restart)
    if (!store.getMember(partyId, userId)) {
      const now = Date.now();
      store.addMember(partyId, {
        userId,
        role: userId === party.hostId ? 'HOST' : 'GUEST',
        joinedAt: now,
        lastActiveAt: now,
      });
    } else {
      store.updateMemberActivity(partyId, userId);
    }

    // Get count after update
    const afterCount = store.getActiveMembersCount(partyId);

    // Only broadcast if count changed
    if (beforeCount !== afterCount) {
      const roomName = `party:${partyId}`;
      io.to(roomName).emit('party:presence', {
        activeMembersCount: afterCount,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Run DB migrations, restore in-memory party state, then start server
runMigrations()
  .then(async () => {
    // Restore active parties (CREATED or LIVE) from DB so the store survives redeploys
    try {
      const persisted = await loadActiveParties();
      for (const { party, joinCode } of persisted) {
        store.createParty(party);
        if (joinCode) store.setJoinCode(joinCode, party.partyId);
      }
      if (persisted.length > 0) {
        console.log(`  ✓ restored ${persisted.length} active part${persisted.length === 1 ? 'y' : 'ies'} from DB`);
      }
    } catch (err) {
      // Non-fatal — server still starts, parties will just need to be recreated
      console.error('  ✗ failed to restore parties from DB:', err);
    }

    httpServer.listen(ENV.PORT, () => {
      console.log(`🎵 Party Jam backend running on port ${ENV.PORT}`);
      console.log(`   Frontend origin: ${ENV.FRONTEND_ORIGIN}`);
    });
  })
  .catch((err) => {
    console.error('Failed to run migrations:', err);
    process.exit(1);
  });

export { io };
