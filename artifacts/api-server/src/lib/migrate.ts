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
        ADD COLUMN IF NOT EXISTS power_gap_index integer;
    `);
    logger.info("Migrations applied successfully");
  } catch (err) {
    logger.error({ err }, "Migration failed");
    throw err;
  } finally {
    client.release();
  }
}
