import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

// ── Ledger of vs-CPU tournaments already counted into a user's record ─────────
// One row per (userId, tournamentId) the user has scored. The composite PK makes
// counting idempotent: a tournament can only ever move the aggregate record in
// `tournament_records` once, no matter how many times the client re-posts it
// (re-opening a finished cup, replays, or forged retries). The aggregate is the
// running total; this table is the authority on "have we already counted it".
export const tournamentRecordEntriesTable = pgTable(
  "tournament_record_entries",
  {
    userId: text("user_id").notNull(),
    tournamentId: integer("tournament_id").notNull(),
    // Outcome as derived server-side from the bracket (true = user won the cup).
    won: integer("won").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tournamentId] })],
);

export type TournamentRecordEntry = typeof tournamentRecordEntriesTable.$inferSelect;
