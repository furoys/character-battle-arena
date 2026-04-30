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
  // Cached narrative payload (full FightResult). Populated on first generation
  // so subsequent identical matchups return instantly without re-streaming
  // from the AI. Null until the first cinematic narrative is produced.
  narrative:     jsonb("narrative").$type<unknown>(),
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
  // Bullet list of reasons the winner won — needed so PvP challenge replays
  // (where the second player loads a saved fight by id) show the same final
  // panel as the first player saw.
  whyWon: jsonb("why_won").$type<string[]>(),
  // Clerk userId of the player who started this fight (nullable so guests
  // can still play without signing in). Used to filter "My Fights" history
  // and compute personal stats on the profile page.
  userId: text("user_id"),
  // Chaos modifier active for this fight (null = standard rules). Stored so
  // history / replay UIs can show the badge ("Lava Floor", "Underdog Buff"
  // etc.). Validated against the registry in api-server/lib/modifiers.ts.
  modifierId: text("modifier_id"),
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
  // status lifecycle: open → accepted (joiner picked team) → ready (both
  // sides hit READY in the lobby) → generating/done implied by fightId.
  status: text("status").notNull().default("open"),
  // Once a fight is generated for this challenge, store its fights.id here so
  // both players replay the SAME saved narrative (rather than each generating
  // their own different one). Whoever clicks first generates; the other waits.
  fightId: integer("fight_id"),
  // Soft lock for "fight is currently being generated" — set by the first
  // player to start, cleared implicitly when fightId is filled. Other clients
  // poll for fightId to appear instead of starting their own generation.
  // If older than 120s without fightId being set, treated as stale.
  generatingAt: timestamp("generating_at", { withTimezone: true }),
  // Clerk userId of the challenge creator (nullable; guests can create
  // challenges without signing in).
  creatorUserId: text("creator_user_id"),
  // Anonymous tokens that identify the creator and joiner across sessions
  // without requiring sign-in. Stored client-side in localStorage keyed by
  // challenge code; sent on /ready and /push/subscribe so the server can tell
  // which side a request belongs to.
  creatorToken: text("creator_token"),
  joinerToken: text("joiner_token"),
  // Lobby READY flags. Both must be true before the fight stream is allowed
  // to start for this challenge.
  team1Ready: boolean("team1_ready").notNull().default(false),
  team2Ready: boolean("team2_ready").notNull().default(false),
  // Chaos modifier the creator picked at challenge-create time. The joiner
  // sees it in the lobby; the fight stream uses it to flavor the prompt.
  // Null = standard rules.
  modifierId: text("modifier_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex("challenges_code_idx").on(t.code)]);

export type Challenge = typeof challengesTable.$inferSelect;

// ── Web Push Subscriptions ────────────────────────────────────────────────────
// Stored per-challenge so we can notify the creator when their challenge is
// accepted (and the joiner if needed). Endpoint is unique — a single browser
// can only have one subscription per VAPID key, so we upsert by endpoint.
export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  challengeCode: text("challenge_code").notNull(),
  role: text("role").notNull(), // 'creator' | 'joiner'
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint)]);

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;

// ── Saved Teams ───────────────────────────────────────────────────────────────
// Allows signed-in users to bookmark a team composition for quick re-use.
// characterIds is an ordered list matching the order the user arranged the team.
export const savedTeamsTable = pgTable("saved_teams", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  characterIds: jsonb("character_ids").notNull().$type<number[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SavedTeam = typeof savedTeamsTable.$inferSelect;
