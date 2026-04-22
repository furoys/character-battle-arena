import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE characters
        ADD COLUMN IF NOT EXISTS behavior_tags text[],
        ADD COLUMN IF NOT EXISTS skill integer,
        ADD COLUMN IF NOT EXISTS energy_projection integer,
        ADD COLUMN IF NOT EXISTS hax integer,
        ADD COLUMN IF NOT EXISTS tier text,
        ADD COLUMN IF NOT EXISTS power_gap_index integer,
        ADD COLUMN IF NOT EXISTS v3_profile jsonb;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL,
        team1_ids JSONB NOT NULL,
        team2_ids JSONB,
        mode TEXT NOT NULL DEFAULT 'cinematic',
        blind BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS challenges_code_idx ON challenges(code);
    `);
    logger.info("Migrations applied successfully");
  } catch (err) {
    logger.error({ err }, "Migration failed");
    throw err;
  } finally {
    client.release();
  }
}
