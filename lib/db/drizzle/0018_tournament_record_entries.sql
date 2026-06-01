CREATE TABLE IF NOT EXISTS "tournament_record_entries" (
	"user_id" text NOT NULL,
	"tournament_id" integer NOT NULL,
	"won" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_record_entries_user_id_tournament_id_pk" PRIMARY KEY("user_id","tournament_id")
);
