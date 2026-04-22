import { pgTable, serial, integer, text, timestamp, jsonb, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// ── Fight verdict cache ───────────────────────────────────────────────────────
// Stores the Stage-1 logic verdict for each matchup so rematches keep
// the same winner while generating a fresh narrative every time.
export const fightCacheTable = pgTable("fight_cache", {
  id: serial("id").primaryKey(),
  // Canonical key: both team ID lists sorted and joined with "|"
  // Always stored so the lower-sorted team is "A" — order-independent lookup.
  cacheKey:      text("cache_key").notNull(),
  teamAIds:      jsonb("team_a_ids").notNull().$type<number[]>(),
  teamBIds:      jsonb("team_b_ids").notNull().$type<number[]>(),
  // winnerTeam: 1 = canonical teamA wins, 2 = canonical teamB wins
  winnerTeam:    integer("winner_team").notNull(),
  // Win rate 50-100 (winner's estimated win % in this matchup)
  winRate:       integer("win_rate").notNull().default(75),
  // Full FightResolution fields (from Stage 1)
  difficulty:    text("difficulty").notNull(),
  fightType:     text("fight_type").notNull(),
  keyFactors:    jsonb("key_factors").notNull().$type<string[]>(),
  turningPoint:  text("turning_point").notNull(),
  loserShowcase: jsonb("loser_showcase").notNull().$type<string[]>(),
  winnerProof:   jsonb("winner_proof").notNull().$type<string[]>(),
  // How many times this matchup has been run (for rematch narrative variation)
  rematchCount:  integer("rematch_count").notNull().default(0),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("fight_cache_key_idx").on(t.cacheKey)]);

export type FightCache = typeof fightCacheTable.$inferSelect;

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

// ── PvP Challenges ────────────────────────────────────────────────────────────
// Stores shareable challenge links for both Challenge Link and Blind Pick modes.
export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  team1Ids: jsonb("team1_ids").notNull().$type<number[]>(),
  team2Ids: jsonb("team2_ids").$type<number[]>(),
  mode: text("mode").notNull().default("cinematic"),
  blind: boolean("blind").notNull().default(false),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex("challenges_code_idx").on(t.code)]);

export type Challenge = typeof challengesTable.$inferSelect;
