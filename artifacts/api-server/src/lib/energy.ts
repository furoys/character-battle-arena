import { eq } from "drizzle-orm";
import { db, userProfilesTable, type UserProfile } from "@workspace/db";

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

// Pure: given a stored profile and a "now", compute the true current energy
// and the lastRefillAt that should be persisted to keep the math idempotent.
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

// Load or lazily create the user's profile row. New users start at full energy.
async function getOrCreateProfile(userId: string): Promise<UserProfile> {
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);
  if (existing) return existing;

  // INSERT ... ON CONFLICT DO NOTHING handles the race where two concurrent
  // requests both try to create the row first.
  const now = new Date();
  await db
    .insert(userProfilesTable)
    .values({ userId, energy: ENERGY_MAX, lastRefillAt: now, createdAt: now, updatedAt: now })
    .onConflictDoNothing();
  const [row] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);
  if (!row) throw new Error("Failed to create user profile");
  return row;
}

// Read the user's energy state, applying any pending refills and persisting
// the new anchor if the value changed (so subsequent reads are idempotent).
export async function getEnergyState(userId: string): Promise<EnergyState> {
  const profile = await getOrCreateProfile(userId);
  const now = Date.now();
  const refilled = applyRefill(profile.energy, profile.lastRefillAt, now);
  if (
    refilled.energy !== profile.energy ||
    refilled.lastRefillAt.getTime() !== profile.lastRefillAt.getTime()
  ) {
    await db
      .update(userProfilesTable)
      .set({
        energy: refilled.energy,
        lastRefillAt: refilled.lastRefillAt,
        updatedAt: new Date(now),
      })
      .where(eq(userProfilesTable.userId, userId));
  }
  return toState(refilled, now);
}

export class OutOfEnergyError extends Error {
  constructor() {
    super("out-of-energy");
    this.name = "OutOfEnergyError";
  }
}

// Atomically refill, then consume 1 energy. Throws OutOfEnergyError if the
// user has none. Returns the new state so callers can include it in their
// response if useful.
export async function consumeEnergy(userId: string): Promise<EnergyState> {
  const profile = await getOrCreateProfile(userId);
  const now = Date.now();
  const refilled = applyRefill(profile.energy, profile.lastRefillAt, now);

  if (refilled.energy <= 0) {
    // Persist the refill anyway so the read endpoint stays consistent.
    if (refilled.lastRefillAt.getTime() !== profile.lastRefillAt.getTime()) {
      await db
        .update(userProfilesTable)
        .set({ lastRefillAt: refilled.lastRefillAt, updatedAt: new Date(now) })
        .where(eq(userProfilesTable.userId, userId));
    }
    throw new OutOfEnergyError();
  }

  const wasAtCap = refilled.energy >= ENERGY_MAX;
  const newEnergy = refilled.energy - 1;
  // Going from full → less-than-full starts the 30-min refill countdown
  // from now. Below cap, keep the existing anchor so partial progress is
  // preserved across consumes.
  const newLastRefillAt = wasAtCap ? new Date(now) : refilled.lastRefillAt;

  await db
    .update(userProfilesTable)
    .set({
      energy: newEnergy,
      lastRefillAt: newLastRefillAt,
      updatedAt: new Date(now),
    })
    .where(eq(userProfilesTable.userId, userId));

  return toState({ energy: newEnergy, lastRefillAt: newLastRefillAt }, now);
}
