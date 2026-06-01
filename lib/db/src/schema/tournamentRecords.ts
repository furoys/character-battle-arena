import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// ── Per-user vs-CPU tournament record (Draft vs CPU mode) ─────────────────────
// Keyed by Clerk userId — only signed-in users persist server-side (guests keep
// a localStorage record). Drives the running win/loss record, streak, and the
// public leaderboard. `lastTournamentId` de-dupes so re-opening a finished cup
// can't double-count it. `displayName` is supplied by the client from the Clerk
// profile so the leaderboard has a human label without a Clerk lookup.
export const tournamentRecordsTable = pgTable("tournament_records", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name"),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  // Signed current streak: + = win streak, - = loss streak.
  streak: integer("streak").notNull().default(0),
  // Best win streak ever achieved.
  best: integer("best").notNull().default(0),
  // Last tournament id counted, for idempotent updates.
  lastTournamentId: integer("last_tournament_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TournamentRecord = typeof tournamentRecordsTable.$inferSelect;
