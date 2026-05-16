CREATE TABLE IF NOT EXISTS "daily_matchups" (
  "id" serial PRIMARY KEY NOT NULL,
  "date" text NOT NULL,
  "matchup_id" text NOT NULL,
  "winner_side" integer,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_matchups_date_idx" ON "daily_matchups" ("date");

CREATE TABLE IF NOT EXISTS "daily_picks" (
  "id" serial PRIMARY KEY NOT NULL,
  "date" text NOT NULL,
  "user_id" text NOT NULL,
  "picked_side" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_picks_date_user_idx" ON "daily_picks" ("date", "user_id");
