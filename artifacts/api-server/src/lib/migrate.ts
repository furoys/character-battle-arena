import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "@workspace/db";
import { logger } from "./logger";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const db = drizzle(pool);
  const migrationsFolder = path.resolve(__dirname, "../../../lib/db/drizzle");
  try {
    await migrate(db, { migrationsFolder });
    logger.info("Migrations applied successfully");
  } catch (err) {
    logger.error({ err }, "Migration failed");
    throw err;
  }
}
