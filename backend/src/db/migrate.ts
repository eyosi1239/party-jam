import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Runs all SQL migration files in order on startup.
 * Idempotent — uses IF NOT EXISTS / DO $$ EXCEPTION blocks.
 */
export async function runMigrations(): Promise<void> {
  const migrations = ['0001_initial.sql'];

  for (const file of migrations) {
    const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8');
    await pool.query(sql);
    console.log(`  ✓ migration applied: ${file}`);
  }
}
