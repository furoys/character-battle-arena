-- Async PvP Draft Sessions: two friends draft a tournament field via a shareable
-- code, alternating picks in snake order. When the field is full, the same
-- deterministic bracket runner builds the cup (linked via tournament_id). Role
-- tokens identify each side across polling without sign-in. IF NOT EXISTS keeps
-- this idempotent against dev databases already populated via `drizzle-kit push`.
CREATE TABLE IF NOT EXISTS "draft_sessions" (
"id" serial PRIMARY KEY NOT NULL,
"code" text NOT NULL,
"size" integer NOT NULL,
"status" text DEFAULT 'open' NOT NULL,
"picks" jsonb DEFAULT '[]'::jsonb NOT NULL,
"creator_user_id" text,
"creator_token" text,
"joiner_token" text,
"tournament_id" integer,
"champion_owner" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "draft_sessions_code_idx" ON "draft_sessions" USING btree ("code");
