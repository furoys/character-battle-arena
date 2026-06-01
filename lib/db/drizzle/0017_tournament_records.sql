CREATE TABLE IF NOT EXISTS "tournament_records" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"best" integer DEFAULT 0 NOT NULL,
	"last_tournament_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
