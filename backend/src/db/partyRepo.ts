/**
 * Repository for persisting party metadata to Postgres.
 * Only the party row itself survives restarts — queue/members/votes stay in-memory.
 */

import { pool } from './client.js';
import type { Party } from '../types.js';

interface PartyRow {
  party_id: string;
  host_id: string;
  name: string | null;
  status: string;
  mood: string;
  kid_friendly: boolean;
  allow_suggestions: boolean;
  locked: boolean;
  join_code: string | null;
  created_at: Date;
  ended_at: Date | null;
}

function rowToParty(row: PartyRow): { party: Party; joinCode: string | null } {
  return {
    party: {
      partyId: row.party_id,
      hostId: row.host_id,
      ...(row.name ? { name: row.name } : {}),
      status: row.status as Party['status'],
      mood: row.mood,
      kidFriendly: row.kid_friendly,
      allowSuggestions: row.allow_suggestions,
      locked: row.locked,
      createdAt: row.created_at.getTime(),
    },
    joinCode: row.join_code,
  };
}

/** Upsert a party row on create. */
export async function saveParty(party: Party, joinCode: string): Promise<void> {
  await pool.query(
    `INSERT INTO parties
       (party_id, host_id, name, status, mood, kid_friendly, allow_suggestions, locked, join_code, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,to_timestamp($10::double precision / 1000))
     ON CONFLICT (party_id) DO NOTHING`,
    [
      party.partyId,
      party.hostId,
      party.name ?? null,
      party.status,
      party.mood,
      party.kidFriendly,
      party.allowSuggestions,
      party.locked,
      joinCode,
      party.createdAt,
    ]
  );
}

/** Update party status (LIVE or ENDED). */
export async function updatePartyStatus(partyId: string, status: string): Promise<void> {
  const endedAt = status === 'ENDED' ? 'NOW()' : 'ended_at';
  await pool.query(
    `UPDATE parties SET status = $1, ended_at = ${endedAt} WHERE party_id = $2`,
    [status, partyId]
  );
}

/** Update party settings fields. */
export async function updatePartySettings(
  partyId: string,
  settings: {
    mood?: string;
    kidFriendly?: boolean;
    allowSuggestions?: boolean;
    locked?: boolean;
  }
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (settings.mood !== undefined) {
    setClauses.push(`mood = $${idx++}`);
    values.push(settings.mood);
  }
  if (settings.kidFriendly !== undefined) {
    setClauses.push(`kid_friendly = $${idx++}`);
    values.push(settings.kidFriendly);
  }
  if (settings.allowSuggestions !== undefined) {
    setClauses.push(`allow_suggestions = $${idx++}`);
    values.push(settings.allowSuggestions);
  }
  if (settings.locked !== undefined) {
    setClauses.push(`locked = $${idx++}`);
    values.push(settings.locked);
  }

  if (setClauses.length === 0) return;

  values.push(partyId);
  await pool.query(
    `UPDATE parties SET ${setClauses.join(', ')} WHERE party_id = $${idx}`,
    values
  );
}

/** Update the join code for a party. */
export async function updateJoinCode(partyId: string, joinCode: string): Promise<void> {
  await pool.query('UPDATE parties SET join_code = $1 WHERE party_id = $2', [joinCode, partyId]);
}

/**
 * Load all non-ended parties from DB so the in-memory store can be restored
 * on startup. Returns parties sorted by created_at ascending.
 */
export async function loadActiveParties(): Promise<Array<{ party: Party; joinCode: string | null }>> {
  const result = await pool.query<PartyRow>(
    `SELECT * FROM parties WHERE status != 'ENDED' ORDER BY created_at ASC`
  );
  return result.rows.map(rowToParty);
}
