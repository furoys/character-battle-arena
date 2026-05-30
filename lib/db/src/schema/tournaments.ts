import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── Tournaments (single-elimination brackets) ─────────────────────────────────
// A tournament seeds a field of 8 or 16 single-character competitors and
// auto-runs every round with the deterministic battle-logic engine (no
// per-match AI). Each match's verdict is also written to fightCacheTable so a
// later "watch this fight" replays the IDENTICAL outcome the bracket shows.
// Guest-permissive: userId is nullable so signed-out players can still run one.

export type TournamentCompetitor = {
  id: number;
  name: string;
  universe: string;
  imageUrl: string | null;
};

export type TournamentMatch = {
  matchId: string; // e.g. "r0-m0"
  a: TournamentCompetitor | null;
  b: TournamentCompetitor | null;
  winnerSide: 1 | 2 | null; // null = bye / not yet filled
  winnerId: number | null;
  difficulty: string | null; // easy | moderate | hard
  fightType: string | null; // stomp | one-sided | close
  blurb: string | null; // short win-condition / turning point line
};

export type TournamentRound = {
  name: string; // "Round of 16" | "Quarterfinals" | "Semifinals" | "Final"
  matches: TournamentMatch[];
};

export type TournamentBracket = {
  rounds: TournamentRound[];
};

export const tournamentsTable = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  // Clerk userId of the creator. Nullable — guests can run tournaments.
  userId: text("user_id"),
  name: text("name").notNull(),
  // Optional human label for a themed cup (e.g. "Marvel Cup"). Display-only.
  themeLabel: text("theme_label"),
  size: integer("size").notNull(), // 8 or 16
  championId: integer("champion_id").notNull(),
  championName: text("champion_name").notNull(),
  bracket: jsonb("bracket").notNull().$type<TournamentBracket>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tournament = typeof tournamentsTable.$inferSelect;
