CREATE TABLE IF NOT EXISTS "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"universe" text NOT NULL,
	"strength" integer NOT NULL,
	"speed" integer NOT NULL,
	"intelligence" integer NOT NULL,
	"durability" integer NOT NULL,
	"special_ability" text NOT NULL,
	"weaknesses" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"behavior_tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"skill" integer,
	"energy_projection" integer,
	"hax" integer,
	"tier" text,
	"power_gap_index" integer,
	"v3_profile" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"universe" text NOT NULL,
	"strength" integer NOT NULL,
	"speed" integer NOT NULL,
	"intelligence" integer NOT NULL,
	"durability" integer NOT NULL,
	"special_ability" text NOT NULL,
	"weaknesses" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"team1_ids" jsonb NOT NULL,
	"team2_ids" jsonb,
	"mode" text DEFAULT 'cinematic' NOT NULL,
	"blind" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fight_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"cache_key" text NOT NULL,
	"team_a_ids" jsonb NOT NULL,
	"team_b_ids" jsonb NOT NULL,
	"winner_team" integer NOT NULL,
	"win_rate" integer DEFAULT 75 NOT NULL,
	"difficulty" text NOT NULL,
	"fight_type" text NOT NULL,
	"key_factors" jsonb NOT NULL,
	"turning_point" text NOT NULL,
	"loser_showcase" jsonb NOT NULL,
	"winner_proof" jsonb NOT NULL,
	"rematch_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fights" (
	"id" serial PRIMARY KEY NOT NULL,
	"team1_ids" jsonb NOT NULL,
	"team2_ids" jsonb NOT NULL,
	"team1_names" jsonb NOT NULL,
	"team2_names" jsonb NOT NULL,
	"winner" integer NOT NULL,
	"rounds" jsonb NOT NULL,
	"summary" text NOT NULL,
	"arena_intro" text,
	"intro" text,
	"simulated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "challenges_code_idx" ON "challenges" USING btree ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fight_cache_key_idx" ON "fight_cache" USING btree ("cache_key");
