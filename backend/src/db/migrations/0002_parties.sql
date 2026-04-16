-- Party Jam: persist party metadata so it survives backend restarts/deploys.
-- Queue, members, votes, and suggestions remain in-memory (transient per session).

CREATE TABLE IF NOT EXISTS parties (
  party_id          VARCHAR(128) PRIMARY KEY,
  host_id           VARCHAR(128) NOT NULL,
  name              VARCHAR(60),
  status            VARCHAR(20)  NOT NULL DEFAULT 'CREATED',
  mood              VARCHAR(20)  NOT NULL DEFAULT 'chill',
  kid_friendly      BOOLEAN      NOT NULL DEFAULT FALSE,
  allow_suggestions BOOLEAN      NOT NULL DEFAULT TRUE,
  locked            BOOLEAN      NOT NULL DEFAULT FALSE,
  guest_mode        VARCHAR(10)  NOT NULL DEFAULT 'suggest',
  join_code         VARCHAR(10),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ
);

-- Idempotent backfill: add guest_mode if table was created by an earlier run of this migration
ALTER TABLE parties ADD COLUMN IF NOT EXISTS guest_mode VARCHAR(10) NOT NULL DEFAULT 'suggest';

CREATE INDEX IF NOT EXISTS parties_status_idx ON parties (status);
