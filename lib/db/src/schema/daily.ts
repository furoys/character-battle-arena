import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// ── Daily Matchups ────────────────────────────────────────────────────────────
// 10 curated fights per day. `date` (UTC yyyy-mm-dd) + `matchupId` (pool entry
// id, see api-server/src/lib/dailyPool.ts) form the natural key. winnerSide
// is null until the fight's verdict appears in fightCacheTable — we lazily
// copy it over so the picks UI doesn't have to re-query the cache.
export const dailyMatchupsTable = pgTable("daily_matchups", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // "YYYY-MM-DD"
  matchupId: text("matchup_id").notNull(),
  winnerSide: integer("winner_side"), // 1 or 2, null until resolved
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("daily_matchups_date_matchup_idx").on(t.date, t.matchupId)]);

export type DailyMatchup = typeof dailyMatchupsTable.$inferSelect;

// ── Daily Picks ───────────────────────────────────────────────────────────────
// One row per signed-in user per daily matchup. Users can pick on any subset
// of the 10 daily matchups; each pick is independent and locks once placed.
export const dailyPicksTable = pgTable("daily_picks", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  matchupId: text("matchup_id").notNull(),
  userId: text("user_id").notNull(),
  pickedSide: integer("picked_side").notNull(), // 1 or 2
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("daily_picks_date_user_matchup_idx").on(t.date, t.userId, t.matchupId)]);

export type DailyPick = typeof dailyPicksTable.$inferSelect;
