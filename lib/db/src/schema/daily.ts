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
  // First persisted fight for this (date, matchup). Once set, every subsequent
  // viewer (anyone who picked) replays this saved fight verbatim instead of
  // generating their own — same pattern as PvP challenge fightId. Written
  // atomically with an IS NULL guard so simultaneous-first-run races don't
  // overwrite each other (whichever insert lands first wins).
  fightId: integer("fight_id"),
  // Claim lock for the "first picker generates, everyone else replays the
  // same fight" race. Mirrors challengesTable.generatingAt: set atomically
  // when a request wins the generation slot, cleared implicitly when
  // fight_id is filled. Considered stale after 120s without fight_id so a
  // crashed/aborted generation can't deadlock the matchup forever.
  generatingAt: timestamp("generating_at", { withTimezone: true }),
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

// ── Daily Ad Bonus ────────────────────────────────────────────────────────────
// Tracks how many bonus pick points a user has earned by watching ads on a
// given day. Total daily pick allowance = DAILY_PICK_POINTS_BASE + adPointsEarned
// (see api-server/src/lib/dailyPool.ts for the constants and cap). One row per
// (user, day); created lazily the first time the user runs out of base points
// and watches an ad.
export const dailyAdBonusTable = pgTable("daily_ad_bonus", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  userId: text("user_id").notNull(),
  adPointsEarned: integer("ad_points_earned").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("daily_ad_bonus_date_user_idx").on(t.date, t.userId)]);

export type DailyAdBonus = typeof dailyAdBonusTable.$inferSelect;

// ── Daily Streak Shields ──────────────────────────────────────────────────────
// One row per "save my streak" action. A shield consumes the user's weekly
// shield allowance (1 per 7 days, enforced server-side by checking the most
// recent usedAt) and marks a specific resolved-wrong pick as "shielded" so the
// pick-streak calculation in GET /api/me/daily skips it (treated as if it
// hadn't happened — the streak chains across the gap). pickId is the unique
// key so the same wrong pick can never be shielded twice.
export const dailyStreakShieldsTable = pgTable("daily_streak_shields", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  pickId: integer("pick_id").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("daily_streak_shields_pick_idx").on(t.pickId),
]);

export type DailyStreakShield = typeof dailyStreakShieldsTable.$inferSelect;
