import { eq } from "drizzle-orm";
import { db, userProfilesTable } from "@workspace/db";

export const ENERGY_MAX = 10;
export const ENERGY_REFILL_MS = 30 * 60 * 1000; // 30 minutes per +1

export interface EnergyState {
  energy: number;
  max: number;
  // Milliseconds until the next +1 refill. 0 if already at max.
  msUntilNextRefill: number;
  // Server epoch ms at which the bar will be full. Lets clients show a
  // stable countdown without re-fetching.
  fullAt: number | null;
  // Server now (epoch ms). Lets clients reconcile their local clock with
  // the server's authoritative reference frame.
  serverNow: number;
}

// Pure: given a stored energy value + lastRefillAt + "now", compute the true
// current energy and the lastRefillAt that should be persisted to keep the
// math idempotent across reads.
function applyRefill(
  storedEnergy: number,
  storedLastRefillAt: Date,
  now: number,
): { energy: number; lastRefillAt: Date } {
  if (storedEnergy >= ENERGY_MAX) {
    // Already capped — anchor the timer to "now" so a subsequent consume
    // starts the 30-min countdown from this moment.
    return { energy: ENERGY_MAX, lastRefillAt: new Date(now) };
  }
  const elapsed = now - storedLastRefillAt.getTime();
  if (elapsed <= 0) {
    return { energy: storedEnergy, lastRefillAt: storedLastRefillAt };
  }
  const refills = Math.floor(elapsed / ENERGY_REFILL_MS);
  if (refills <= 0) {
    return { energy: storedEnergy, lastRefillAt: storedLastRefillAt };
  }
  const newEnergy = Math.min(ENERGY_MAX, storedEnergy + refills);
  // Carry the leftover so partial progress toward the next refill isn't lost.
  // If we just hit cap, anchor to now (cap state has no carry).
  const newLastRefillAt =
    newEnergy >= ENERGY_MAX
      ? new Date(now)
      : new Date(storedLastRefillAt.getTime() + refills * ENERGY_REFILL_MS);
  return { energy: newEnergy, lastRefillAt: newLastRefillAt };
}

function toState(profile: { energy: number; lastRefillAt: Date }, now: number): EnergyState {
  if (profile.energy >= ENERGY_MAX) {
    return {
      energy: ENERGY_MAX,
      max: ENERGY_MAX,
      msUntilNextRefill: 0,
      fullAt: null,
      serverNow: now,
    };
  }
  const elapsedSinceAnchor = now - profile.lastRefillAt.getTime();
  const msIntoCurrentRefill = ((elapsedSinceAnchor % ENERGY_REFILL_MS) + ENERGY_REFILL_MS) % ENERGY_REFILL_MS;
  const msUntilNextRefill = ENERGY_REFILL_MS - msIntoCurrentRefill;
  const refillsNeeded = ENERGY_MAX - profile.energy;
  const fullAt = now + msUntilNextRefill + (refillsNeeded - 1) * ENERGY_REFILL_MS;
  return {
    energy: profile.energy,
    max: ENERGY_MAX,
    msUntilNextRefill,
    fullAt,
    serverNow: now,
  };
}

// Lazy-create + lock the profile row inside an open transaction. Two concurrent
// callers will serialize on the same row via SELECT ... FOR UPDATE so neither
// can read-modify-write a stale value.
async function lockOrCreateProfile(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  now: number,
): Promise<{ energy: number; lastRefillAt: Date }> {
  // Insert default row if missing — idempotent under contention.
  await tx
    .insert(userProfilesTable)
    .values({
      userId,
      energy: ENERGY_MAX,
      lastRefillAt: new Date(now),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    })
    .onConflictDoNothing();
  // Now grab a row-level lock on the (now-guaranteed-to-exist) profile.
  const [row] = await tx
    .select({
      energy: userProfilesTable.energy,
      lastRefillAt: userProfilesTable.lastRefillAt,
    })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .for("update")
    .limit(1);
  if (!row) throw new Error("Failed to lock user profile");
  return row;
}

// Read the user's energy state, applying any pending refills and persisting
// the new anchor if the value changed (so subsequent reads are idempotent).
// Wrapped in a transaction so concurrent consumes can't be clobbered.
export async function getEnergyState(userId: string): Promise<EnergyState> {
  const now = Date.now();
  const refilled = await db.transaction(async (tx) => {
    const locked = await lockOrCreateProfile(tx, userId, now);
    const r = applyRefill(locked.energy, locked.lastRefillAt, now);
    if (
      r.energy !== locked.energy ||
      r.lastRefillAt.getTime() !== locked.lastRefillAt.getTime()
    ) {
      await tx
        .update(userProfilesTable)
        .set({
          energy: r.energy,
          lastRefillAt: r.lastRefillAt,
          updatedAt: new Date(now),
        })
        .where(eq(userProfilesTable.userId, userId));
    }
    return r;
  });
  return toState(refilled, now);
}

export class OutOfEnergyError extends Error {
  constructor() {
    super("out-of-energy");
    this.name = "OutOfEnergyError";
  }
}

// Atomically refill, then consume 1 energy. Throws OutOfEnergyError if the
// user has none. Two concurrent /fights/stream calls for the same user will
// serialize on the row lock so each independently observes the post-decrement
// state — no double-spend, no under-charge.
export async function consumeEnergy(userId: string): Promise<EnergyState> {
  const now = Date.now();
  const next = await db.transaction(async (tx) => {
    const locked = await lockOrCreateProfile(tx, userId, now);
    const r = applyRefill(locked.energy, locked.lastRefillAt, now);
    if (r.energy <= 0) {
      // Still persist any anchor advancement so a subsequent read is consistent.
      if (r.lastRefillAt.getTime() !== locked.lastRefillAt.getTime()) {
        await tx
          .update(userProfilesTable)
          .set({ lastRefillAt: r.lastRefillAt, updatedAt: new Date(now) })
          .where(eq(userProfilesTable.userId, userId));
      }
      throw new OutOfEnergyError();
    }
    const wasAtCap = r.energy >= ENERGY_MAX;
    const newEnergy = r.energy - 1;
    // Going from full → less-than-full starts the 30-min refill countdown
    // from now. Below cap, keep the existing anchor so partial progress is
    // preserved across consumes.
    const newLastRefillAt = wasAtCap ? new Date(now) : r.lastRefillAt;

    await tx
      .update(userProfilesTable)
      .set({
        energy: newEnergy,
        lastRefillAt: newLastRefillAt,
        updatedAt: new Date(now),
      })
      .where(eq(userProfilesTable.userId, userId));

    return { energy: newEnergy, lastRefillAt: newLastRefillAt };
  });
  return toState(next, now);
}
