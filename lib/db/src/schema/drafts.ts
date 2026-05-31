import { pgTable, serial, integer, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

// ── Async PvP Draft Sessions ──────────────────────────────────────────────────
// Two friends draft a tournament field asynchronously via a shareable code.
// One creates (becomes "creator"), the other joins (becomes "joiner"). They
// alternate picks in snake order until the field is full, then the SAME
// deterministic bracket runner used by /tournaments builds the cup. The finished
// bracket is stored as a normal `tournaments` row and linked via tournamentId so
// both players replay the identical result.
//
// Anonymous tokens identify each side across polling requests without requiring
// sign-in (mirrors challengesTable's creatorToken/joinerToken pattern). Tokens
// are stored client-side in localStorage keyed by draft code and are NEVER
// returned by the public poll endpoint.

export type DraftPick = {
  id: number; // character id
  owner: "creator" | "joiner";
};

export const draftSessionsTable = pgTable(
  "draft_sessions",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    // Total fighters in the field (= bracket size): 8 | 16 | 32.
    size: integer("size").notNull(),
    // Lifecycle: open (waiting for joiner) → drafting (both present, picking)
    // → complete (field full, bracket built + linked via tournamentId).
    status: text("status").notNull().default("open"),
    // Drafted fighters in pick order. Snake order determines whose turn is next.
    picks: jsonb("picks").notNull().$type<DraftPick[]>().default([]),
    // Clerk userId of the creator (nullable; guests can host a draft).
    creatorUserId: text("creator_user_id"),
    // Display names each side chose when creating / joining (nullable; guests
    // may leave them blank). Shown instead of "You"/"CPU" in the PvP result.
    creatorName: text("creator_name"),
    joinerName: text("joiner_name"),
    // Anonymous role tokens (see header). Never exposed by the poll endpoint.
    creatorToken: text("creator_token"),
    joinerToken: text("joiner_token"),
    // Set once the field is full and the bracket is built.
    tournamentId: integer("tournament_id"),
    // Convenience for the result screen: which side drafted the champion.
    championOwner: text("champion_owner"), // "creator" | "joiner"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("draft_sessions_code_idx").on(t.code)],
);

export type DraftSession = typeof draftSessionsTable.$inferSelect;
