import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ENV } from './config.js';
import { store } from './store.js';
import partyRoutes, { setSocketIO } from './routes/party.js';
import appleMusicRoutes from './routes/appleMusic.js';
import userRoutes from './routes/users.js';
import { globalLimiter } from './middleware/rateLimits.js';
import { runMigrations } from './db/migrate.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ENV.FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Pass io instance to routes for broadcasting
setSocketIO(io);

// Middleware
app.use(cors({ origin: ENV.FRONTEND_ORIGIN }));
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

    // Update member activity
    store.updateMemberActivity(partyId, userId);

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

    // Update member activity
    store.updateMemberActivity(partyId, userId);

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

// Run DB migrations then start server
runMigrations()
  .then(() => {
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
