-- Party Jam initial schema
-- Run once on startup via src/db/migrate.ts

DO $$ BEGIN
  CREATE TYPE auth_provider AS ENUM ('email', 'google', 'spotify');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE music_service AS ENUM ('spotify', 'apple_music', 'deezer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid    VARCHAR(128) UNIQUE NOT NULL,
  email           VARCHAR(255),
  display_name    VARCHAR(255),
  auth_provider   auth_provider NOT NULL DEFAULT 'email',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_music_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service          music_service NOT NULL,
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  service_user_id  VARCHAR(255),
  connected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_service_unique UNIQUE (user_id, service)
);
