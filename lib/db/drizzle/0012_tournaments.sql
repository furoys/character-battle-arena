-- Tournament Mode: single-elimination brackets of 8 or 16 single-character
-- competitors. Each tournament's bracket (rounds + per-match verdicts) is
-- stored as jsonb. Guest-permissive: user_id is nullable. IF NOT EXISTS keeps
-- this idempotent against dev databases already populated via `drizzle-kit push`.
CREATE TABLE IF NOT EXISTS "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"theme_label" text,
	"size" integer NOT NULL,
	"champion_id" integer NOT NULL,
	"champion_name" text NOT NULL,
	"bracket" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
