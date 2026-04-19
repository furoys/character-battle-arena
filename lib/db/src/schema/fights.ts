import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const fightsTable = pgTable("fights", {
  id: serial("id").primaryKey(),
  team1Ids: jsonb("team1_ids").notNull().$type<number[]>(),
  team2Ids: jsonb("team2_ids").notNull().$type<number[]>(),
  team1Names: jsonb("team1_names").notNull().$type<string[]>(),
  team2Names: jsonb("team2_names").notNull().$type<string[]>(),
  winner: integer("winner").notNull(),
  rounds: jsonb("rounds").notNull().$type<object[]>(),
  summary: text("summary").notNull(),
  arenaIntro: text("arena_intro"),
  intro: text("intro"),
  simulatedAt: timestamp("simulated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Fight = typeof fightsTable.$inferSelect;
