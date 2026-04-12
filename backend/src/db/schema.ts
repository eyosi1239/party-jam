import { pgTable, pgEnum, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const authProviderEnum = pgEnum('auth_provider', ['email', 'google', 'spotify']);
export const musicServiceEnum = pgEnum('music_service', ['spotify', 'apple_music', 'deezer']);

/**
 * One row per Firebase user. Created on first login via POST /api/users/sync.
 * firebase_uid is the authoritative link to Firebase Auth.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseUid: varchar('firebase_uid', { length: 128 }).unique().notNull(),
  email: varchar('email', { length: 255 }),
  displayName: varchar('display_name', { length: 255 }),
  // How the account was originally created
  authProvider: authProviderEnum('auth_provider').notNull().default('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * Tracks which music services a user has connected.
 * Tokens are stored encrypted (see src/lib/crypto.ts).
 * One row per (user, service) pair — unique constraint enforced.
 */
export const userMusicServices = pgTable('user_music_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  service: musicServiceEnum('service').notNull(),
  // Encrypted with AES-256-GCM using ENCRYPTION_KEY env var
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  // The user's ID on the connected platform (e.g. Spotify user ID)
  serviceUserId: varchar('service_user_id', { length: 255 }),
  connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserMusicService = typeof userMusicServices.$inferSelect;
export type NewUserMusicService = typeof userMusicServices.$inferInsert;
