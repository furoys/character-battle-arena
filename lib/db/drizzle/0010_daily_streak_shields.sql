CREATE TABLE IF NOT EXISTS "daily_streak_shields" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "pick_id" integer NOT NULL,
  "used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_streak_shields_pick_idx" ON "daily_streak_shields" ("pick_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_streak_shields_user_used_idx" ON "daily_streak_shields" ("user_id", "used_at");
