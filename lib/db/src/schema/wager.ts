import { pgTable, serial, integer, text, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// ── Wager Wallet ──────────────────────────────────────────────────────────────
// One row per signed-in user holding their VIRTUAL coin balance (play money
// only — no real currency anywhere). New users start with a seed balance and
// can claim a once-per-day coin drop (gated by the ET-midnight rollover, same
// date scheme as the daily lineup). `lastDailyClaim` stores the ET date string
// ("YYYY-MM-DD") of the most recent claim so the gate is a simple equality
// check against today's date. `currentStreak` is the count of consecutive
// winning bets (reset to 0 on any loss); `bestStreak` is the all-time high.
export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  balance: integer("balance").notNull().default(1000),
  lastDailyClaim: text("last_daily_claim"), // ET "YYYY-MM-DD", null if never claimed
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("wallets_user_idx").on(t.userId)]);

export type Wallet = typeof walletsTable.$inferSelect;

// ── Wagers ────────────────────────────────────────────────────────────────────
// One row per settled bet. Settlement is immediate and deterministic — the
// fight verdict is computed server-side (and cached in fightCacheTable) the
// moment the bet is placed, so a wager is always already `won` or `lost`.
// `oddsBp` is the locked decimal payout odds in basis points (decimal odds ×
// 10000, e.g. 1.85× = 18500) captured at bet time so a later odds change can't
// alter the payout. `payout` is the gross coins returned to the user (0 on a
// loss; stake × odds on a win). `fightId` optionally links a persisted
// cinematic fight if one was generated for this matchup.
export const wagersTable = pgTable("wagers", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  team1Ids: jsonb("team1_ids").notNull().$type<number[]>(),
  team2Ids: jsonb("team2_ids").notNull().$type<number[]>(),
  team1Names: jsonb("team1_names").notNull().$type<string[]>(),
  team2Names: jsonb("team2_names").notNull().$type<string[]>(),
  pickedSide: integer("picked_side").notNull(), // 1 or 2 — the side the user backed
  winnerSide: integer("winner_side").notNull(), // 1 or 2 — the deterministic verdict
  stake: integer("stake").notNull(),
  oddsBp: integer("odds_bp").notNull(), // locked decimal odds × 10000
  payout: integer("payout").notNull(), // gross coins returned (0 if lost)
  status: text("status").notNull(), // 'won' | 'lost'
  fightId: integer("fight_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Wager = typeof wagersTable.$inferSelect;
