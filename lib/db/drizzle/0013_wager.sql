CREATE TABLE IF NOT EXISTS "wallets" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "balance" integer DEFAULT 1000 NOT NULL,
  "last_daily_claim" text,
  "current_streak" integer DEFAULT 0 NOT NULL,
  "best_streak" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_user_idx" ON "wallets" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wagers" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "team1_ids" jsonb NOT NULL,
  "team2_ids" jsonb NOT NULL,
  "team1_names" jsonb NOT NULL,
  "team2_names" jsonb NOT NULL,
  "picked_side" integer NOT NULL,
  "winner_side" integer NOT NULL,
  "stake" integer NOT NULL,
  "odds_bp" integer NOT NULL,
  "payout" integer NOT NULL,
  "status" text NOT NULL,
  "fight_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
