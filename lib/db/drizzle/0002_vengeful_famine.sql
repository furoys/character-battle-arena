-- This migration backfills schema changes that were applied to dev/prod via
-- `drizzle-kit push --force` during prior iterations (challenge mode, push
-- notifications) plus the new user_profiles table for the energy gate.
-- Every statement uses IF NOT EXISTS so re-running against a DB that already
-- has the prior push-force changes is a no-op (production already has the
-- challenges/push_subscriptions changes; only user_profiles is new there).
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
"id" serial PRIMARY KEY NOT NULL,
"challenge_code" text NOT NULL,
"role" text NOT NULL,
"endpoint" text NOT NULL,
"p256dh" text NOT NULL,
"auth" text NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
"user_id" text PRIMARY KEY NOT NULL,
"energy" integer DEFAULT 10 NOT NULL,
"last_refill_at" timestamp with time zone DEFAULT now() NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "creator_token" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "joiner_token" text;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "team1_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "team2_ready" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "modifier_id" text;--> statement-breakpoint
ALTER TABLE "fights" ADD COLUMN IF NOT EXISTS "modifier_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");
