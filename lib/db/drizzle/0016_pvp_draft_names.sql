ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "creator_name" text;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "joiner_name" text;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "creator_name" text;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "joiner_name" text;
