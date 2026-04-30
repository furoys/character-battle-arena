import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// ── Per-user profile (energy gating, future cosmetics) ───────────────────────
// Keyed by Clerk userId — guests have no row (energy gating only applies to
// signed-in users). Created lazily the first time the user touches an
// energy-aware endpoint.
//
// Energy model:
//   - Capacity 10. Refills 1 every 30 min.
//   - `energy` is the value as of `lastRefillAt`. When reading, the server
//     replays elapsed time forward to compute the true current value.
//   - When a fight is consumed from a full bar (10 → 9) the timer is started
//     by setting lastRefillAt = now. When consumed from below the cap, the
//     existing refill timer keeps ticking from where it was.
export const userProfilesTable = pgTable("user_profiles", {
  // Clerk userId. text() because Clerk IDs are strings like "user_xxx".
  userId: text("user_id").primaryKey(),
  energy: integer("energy").notNull().default(10),
  lastRefillAt: timestamp("last_refill_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserProfile = typeof userProfilesTable.$inferSelect;
