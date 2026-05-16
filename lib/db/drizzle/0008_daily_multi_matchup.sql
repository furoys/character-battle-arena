-- Promote Daily Matchup from 1/day to 10/day. Picks are now per (date, user,
-- matchup) instead of per (date, user). Existing 0007 indexes are replaced.

DROP INDEX IF EXISTS "daily_matchups_date_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "daily_matchups_date_matchup_idx"
  ON "daily_matchups" ("date", "matchup_id");

ALTER TABLE "daily_picks" ADD COLUMN IF NOT EXISTS "matchup_id" text;
-- Backfill any rows from the single-matchup era with the deterministic pick
-- for that date. Since we don't have that mapping at SQL level, leave them
-- NULL and clear (these rows can't be matched to a matchup post-migration).
DELETE FROM "daily_picks" WHERE "matchup_id" IS NULL;
ALTER TABLE "daily_picks" ALTER COLUMN "matchup_id" SET NOT NULL;

DROP INDEX IF EXISTS "daily_picks_date_user_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "daily_picks_date_user_matchup_idx"
  ON "daily_picks" ("date", "user_id", "matchup_id");
