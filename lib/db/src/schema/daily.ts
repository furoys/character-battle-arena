import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// ── Daily Matchup ─────────────────────────────────────────────────────────────
// One curated fight per day. `date` is the ISO yyyy-mm-dd in UTC and serves
// as the natural key. `matchupId` points at an entry in the server-side
// DAILY_POOL (artifacts/api-server/src/lib/dailyPool.ts). winnerSide gets
// filled lazily — when anyone runs the fight, fightCacheTable is populated
// and we copy the verdict here so the page can show "correct/incorrect"
// without re-querying the cache for every pick.
export const dailyMatchupsTable = pgTable("daily_matchups", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // "YYYY-MM-DD"
  matchupId: text("matchup_id").notNull(),
  winnerSide: integer("winner_side"), // 1 or 2, null until resolved
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("daily_matchups_date_idx").on(t.date)]);

export type DailyMatchup = typeof dailyMatchupsTable.$inferSelect;

// ── Daily Picks ───────────────────────────────────────────────────────────────
// One row per signed-in user per day. Picks are locked once placed (no
// changing your mind after the result is in).
export const dailyPicksTable = pgTable("daily_picks", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  userId: text("user_id").notNull(),
  pickedSide: integer("picked_side").notNull(), // 1 or 2
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("daily_picks_date_user_idx").on(t.date, t.userId)]);

export type DailyPick = typeof dailyPicksTable.$inferSelect;
