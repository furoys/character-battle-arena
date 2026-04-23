ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "fight_id" integer;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "generating_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "creator_user_id" text;--> statement-breakpoint
ALTER TABLE "fight_cache" ADD COLUMN IF NOT EXISTS "narrative" jsonb;--> statement-breakpoint
ALTER TABLE "fights" ADD COLUMN IF NOT EXISTS "why_won" jsonb;--> statement-breakpoint
ALTER TABLE "fights" ADD COLUMN IF NOT EXISTS "user_id" text;
