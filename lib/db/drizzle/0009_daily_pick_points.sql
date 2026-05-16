CREATE TABLE IF NOT EXISTS "daily_ad_bonus" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"user_id" text NOT NULL,
	"ad_points_earned" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_ad_bonus_date_user_idx" ON "daily_ad_bonus" ("date","user_id");
