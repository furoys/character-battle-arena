-- Link first persisted fight to its daily matchup row so every picker can
-- replay the same cinematic battle (not just whoever ran it first), plus a
-- claim lock so two simultaneous first-runners can't generate two different
-- fights for the same matchup. IF NOT EXISTS keeps this idempotent against
-- dev databases that may have already been populated via `drizzle-kit push`.
ALTER TABLE "daily_matchups" ADD COLUMN IF NOT EXISTS "fight_id" integer;
ALTER TABLE "daily_matchups" ADD COLUMN IF NOT EXISTS "generating_at" timestamp with time zone;
