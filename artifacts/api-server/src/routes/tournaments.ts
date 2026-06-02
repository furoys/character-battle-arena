import { Router, type IRouter } from "express";
import { eq, desc, inArray, notInArray, sql } from "drizzle-orm";
import {
  db,
  charactersTable,
  tournamentsTable,
  tournamentRecordsTable,
  fightCacheTable,
  type Character,
  type TournamentBracket,
  type TournamentCompetitor,
  type TournamentMatch,
  type TournamentRound,
} from "@workspace/db";
import { CreateTournamentBody, GetTournamentParams } from "@workspace/api-zod";
import { getOptionalUserId } from "../lib/auth";
import { resolveFightVerdict } from "../lib/fightSimulator";

const router: IRouter = Router();

// Developer Legends (Chris, Troy, Tim, Cory) have max stats and are barred from tournaments.
const EXCLUDED_UNIVERSE = "Developer Legends";

// ── Cache key helper (mirrors fights.ts getCacheKey) ──────────────────────────
function getCacheKey(
  team1Ids: number[],
  team2Ids: number[],
): { cacheKey: string; teamAIsTeam1: boolean } {
  const aKey = [...team1Ids].sort((x, y) => x - y).join(",");
  const bKey = [...team2Ids].sort((x, y) => x - y).join(",");
  const teamAIsTeam1 = aKey <= bKey;
  const cacheKey = teamAIsTeam1 ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
  return { cacheKey, teamAIsTeam1 };
}

// Map fight difficulty to win rate % (mirrors fights.ts difficultyToWinRate)
function difficultyToWinRate(difficulty: string): number {
  if (difficulty === "easy") return 90;
  if (difficulty === "moderate") return 72;
  if (difficulty === "hard") return 57;
  return 75;
}

function toCompetitor(
  c: Character,
  owner?: "user" | "cpu" | null,
): TournamentCompetitor {
  return {
    id: c.id,
    name: c.name,
    universe: c.universe,
    imageUrl: c.imageUrl ?? null,
    owner: owner ?? null,
  };
}

// ── Draft power budget ───────────────────────────────────────────────────────
// Each fighter has a COST (1–10) derived from its summed stats on an ABSOLUTE
// scale (fixed thresholds, no roster distribution) so the client and server
// always agree. Each side gets budget = (size/2) * BUDGET_PER_PICK, which forces
// real tradeoffs: you can field one or two marquee monsters, but not a whole
// team of them. KEEP IN SYNC with fighterCost()/draftBudget() in the frontend
// (artifacts/fight-club/src/pages/tournaments.tsx).
const BUDGET_PER_PICK = 5;

export function fighterCost(c: {
  strength: number | null;
  speed: number | null;
  intelligence: number | null;
  durability: number | null;
}): number {
  const ps =
    (c.strength ?? 0) + (c.speed ?? 0) + (c.intelligence ?? 0) + (c.durability ?? 0);
  if (ps < 50_000) return 1;
  if (ps < 150_000) return 2;
  if (ps < 400_000) return 3;
  if (ps < 950_000) return 4;
  if (ps < 2_500_000) return 5;
  if (ps < 6_100_000) return 6;
  if (ps < 12_000_000) return 7;
  if (ps < 18_500_000) return 8;
  if (ps < 35_000_000) return 9;
  return 10;
}

export function draftBudget(size: number): number {
  return Math.floor(size / 2) * BUDGET_PER_PICK;
}

// ── Risk/reward draft traits ─────────────────────────────────────────────────
// Cheap "underdogs" (low cost) are Giant Slayers that can topple far stronger
// fighters; expensive "legends" (high cost) carry a front-runner weakness that
// makes them upsettable. This is what turns the draft into a risk/reward bet:
// marquee monsters win most fights but can be slain, while a cheap flier might
// punch wildly above its cost. KEEP IN SYNC with fighterTrait() in the frontend
// (artifacts/fight-club/src/pages/tournaments.tsx).
const UNDERDOG_MAX_COST = 3;
const LEGEND_MIN_COST = 8;

export type FighterTrait = "underdog" | "legend" | null;
export function fighterTrait(cost: number): FighterTrait {
  if (cost <= UNDERDOG_MAX_COST) return "underdog";
  if (cost >= LEGEND_MIN_COST) return "legend";
  return null;
}

// Stable pseudo-random in [0,1) from a matchup's two fighter ids, so a bracket's
// upset rolls are deterministic and any later "watch this fight" replays agree.
function matchSeed(idA: number, idB: number): number {
  const lo = Math.min(idA, idB);
  const hi = Math.max(idA, idB);
  let h = (2166136261 ^ lo) >>> 0;
  h = (Math.imul(h, 16777619) ^ hi) >>> 0;
  h = Math.imul(h, 16777619) >>> 0;
  return (h % 100000) / 100000;
}

// Chance the lower-cost fighter pulls a risk/reward upset over the favorite.
// Only fighters with a trait in play can swing it (a Giant Slayer underdog or a
// vulnerable Legend favorite), and favorites still win the majority of the time
// (capped well under 50%). KEEP IN SYNC with the frontend.
export function tournamentUpsetChance(costA: number, costB: number): number {
  const favCost = Math.max(costA, costB);
  const dogCost = Math.min(costA, costB);
  let chance = 0;
  if (dogCost <= UNDERDOG_MAX_COST) chance += 0.2; // Giant Slayer upside
  if (favCost >= LEGEND_MIN_COST) chance += 0.2; // Front-runner weakness
  if (chance === 0) return 0; // no trait in play → deterministic, no upset
  chance += Math.min(favCost - dogCost, 6) * 0.02; // bigger gap = more dramatic
  return Math.min(chance, 0.45);
}

// Round names depend on bracket size.
export function roundNames(size: number): string[] {
  if (size === 32)
    return ["Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"];
  if (size === 16) return ["Round of 16", "Quarterfinals", "Semifinals", "Final"];
  return ["Quarterfinals", "Semifinals", "Final"];
}

// Resolve a single match. Reads fightCacheTable first (so the bracket agrees
// with any prior fight of the same matchup) and writes the verdict back when
// fresh, so a later "watch this fight" replays the IDENTICAL outcome.
async function resolveMatch(
  charA: Character,
  charB: Character,
): Promise<{ winnerSide: 1 | 2; difficulty: string; fightType: string; blurb: string; upset: boolean }> {
  const aIds = [charA.id];
  const bIds = [charB.id];
  const { cacheKey, teamAIsTeam1 } = getCacheKey(aIds, bIds);

  const [existing] = await db
    .select()
    .from(fightCacheTable)
    .where(eq(fightCacheTable.cacheKey, cacheKey))
    .limit(1);

  // Base verdict — the raw power outcome (favorite wins), read from / written to
  // the shared composition cache so the Arena and a normal "watch" stay aligned.
  let winnerSide: 1 | 2;
  let difficulty: string;
  let fightType: string;
  let blurb: string;

  if (existing) {
    // existing.winnerTeam is canonical (1 = teamA, the lower-sorted side).
    winnerSide =
      (existing.winnerTeam === 1 && teamAIsTeam1) || (existing.winnerTeam === 2 && !teamAIsTeam1)
        ? 1
        : 2;
    difficulty = existing.difficulty;
    fightType = existing.fightType;
    blurb = existing.turningPoint;
  } else {
    const { winner, resolution } = resolveFightVerdict([charA], [charB]);
    const winnerTeamCanonical = teamAIsTeam1 ? winner : winner === 1 ? 2 : 1;
    winnerSide = winner;
    difficulty = resolution.difficulty;
    fightType = resolution.fightType;
    blurb = resolution.turningPoint;

    try {
      await db.insert(fightCacheTable).values({
        cacheKey,
        teamAIds: teamAIsTeam1 ? aIds : bIds,
        teamBIds: teamAIsTeam1 ? bIds : aIds,
        winnerTeam: winnerTeamCanonical,
        winRate: difficultyToWinRate(resolution.difficulty),
        difficulty: resolution.difficulty,
        fightType: resolution.fightType,
        keyFactors: resolution.keyFactors,
        turningPoint: resolution.turningPoint,
        loserShowcase: resolution.loserShowcase,
        winnerProof: resolution.winnerProof,
        rematchCount: 0,
      });
    } catch {
      // Unique-constraint race — another request seeded it first. The verdict is
      // deterministic, so our computed winner already matches the stored one.
    }
  }

  // ── Risk/reward upset (tournament-only) ────────────────────────────────────
  // Layered ON TOP of the raw verdict and NEVER written back to the shared
  // cache, so it can't poison Arena fights. The roll is deterministic per
  // matchup, so the persisted bracket and a later replay (which re-derives the
  // same upset and passes the Underdog modifier) always agree.
  const costA = fighterCost(charA);
  const costB = fighterCost(charB);
  const underdogSide: 1 | 2 = costA < costB ? 1 : 2;
  let upset = false;
  if (
    costA !== costB && // a real favorite/underdog gap must exist
    underdogSide !== winnerSide && // the favorite was predicted to win
    matchSeed(charA.id, charB.id) < tournamentUpsetChance(costA, costB)
  ) {
    winnerSide = underdogSide;
    upset = true;
    difficulty = "hard";
    fightType = "close";
    const dogName = underdogSide === 1 ? charA.name : charB.name;
    const favName = underdogSide === 1 ? charB.name : charA.name;
    blurb = `${dogName} pulls off a giant-slaying upset over ${favName}.`;
  }

  return { winnerSide, difficulty, fightType, blurb, upset };
}

// Auto-run a full single-elim bracket round-by-round (deterministic, no AI).
// Shared by classic/CPU-draft cups (POST /tournaments) and async PvP drafts.
export async function runBracket(
  seeded: Character[],
  size: number,
  ownerById: Map<number, "user" | "cpu">,
): Promise<{ rounds: TournamentRound[]; champion: Character }> {
  const names = roundNames(size);
  const rounds: TournamentRound[] = [];
  let current: Character[] = seeded.slice(0, size);

  for (let roundIdx = 0; roundIdx < names.length; roundIdx++) {
    const matches: TournamentMatch[] = [];
    const winners: Character[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i]!;
      const b = current[i + 1]!;
      const { winnerSide, difficulty, fightType, blurb, upset } = await resolveMatch(a, b);
      const winnerChar = winnerSide === 1 ? a : b;
      winners.push(winnerChar);
      matches.push({
        matchId: `r${roundIdx}-m${i / 2}`,
        a: toCompetitor(a, ownerById.get(a.id) ?? null),
        b: toCompetitor(b, ownerById.get(b.id) ?? null),
        winnerSide,
        winnerId: winnerChar.id,
        difficulty,
        fightType,
        blurb,
        upset,
      });
    }
    rounds.push({ name: names[roundIdx]!, matches });
    current = winners;
  }

  return { rounds, champion: current[0]! };
}

router.get("/tournaments", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: tournamentsTable.id,
      name: tournamentsTable.name,
      themeLabel: tournamentsTable.themeLabel,
      size: tournamentsTable.size,
      mode: tournamentsTable.mode,
      championId: tournamentsTable.championId,
      championName: tournamentsTable.championName,
      createdAt: tournamentsTable.createdAt,
    })
    .from(tournamentsTable)
    .orderBy(desc(tournamentsTable.createdAt))
    .limit(20);

  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      themeLabel: r.themeLabel ?? null,
      size: r.size,
      mode: r.mode ?? null,
      championId: r.championId,
      championName: r.championName,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

// Public leaderboard of the top Draft-vs-CPU records. Registered BEFORE the
// "/tournaments/:id" route so "leaderboard" isn't swallowed as an id.
router.get("/tournaments/leaderboard", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(tournamentRecordsTable)
    .orderBy(desc(tournamentRecordsTable.best), desc(tournamentRecordsTable.wins))
    .limit(20);
  res.json(
    rows
      .filter((r) => r.wins + r.losses > 0)
      .map((r) => ({
        displayName: (r.displayName ?? "").trim() || "Anonymous",
        wins: r.wins,
        losses: r.losses,
        best: r.best,
        streak: r.streak,
      })),
  );
});

router.get("/tournaments/:id", async (req, res): Promise<void> => {
  const parsed = GetTournamentParams.safeParse({ id: req.params["id"] });
  if (!parsed.success) {
    res.status(404).json({ error: "Tournament not found" });
    return;
  }
  const [row] = await db
    .select()
    .from(tournamentsTable)
    .where(eq(tournamentsTable.id, parsed.data.id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Tournament not found" });
    return;
  }
  res.json({
    id: row.id,
    userId: row.userId ?? null,
    name: row.name,
    themeLabel: row.themeLabel ?? null,
    size: row.size,
    mode: row.mode ?? null,
    championId: row.championId,
    championName: row.championName,
    creatorName: row.creatorName ?? null,
    joinerName: row.joinerName ?? null,
    bracket: row.bracket,
    createdAt: row.createdAt.toISOString(),
  });
});

router.post("/tournaments", async (req, res): Promise<void> => {
  const parsed = CreateTournamentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tournament input", details: parsed.error.issues });
    return;
  }
  const { size, name, themeLabel } = parsed.data;
  const mode = parsed.data.mode === "draft" ? "draft" : null;
  const ownersInput = parsed.data.owners ?? [];

  // De-dupe provided ids, preserving seed order. Track each id's owner (draft).
  const seenIds = new Set<number>();
  const requestedIds: number[] = [];
  const ownerById = new Map<number, "user" | "cpu">();
  parsed.data.competitorIds.forEach((id, idx) => {
    if (!seenIds.has(id)) {
      seenIds.add(id);
      requestedIds.push(id);
      // Owners are only meaningful in draft mode; ignore them otherwise so a
      // classic cup can never carry owner attribution.
      if (mode === "draft") {
        const owner = ownersInput[idx];
        if (owner === "user" || owner === "cpu") ownerById.set(id, owner);
      }
    }
  });
  if (requestedIds.length > size) {
    res.status(400).json({ error: `Too many competitors for a ${size}-fighter bracket` });
    return;
  }

  // Draft mode is a fully-drafted bracket: every slot is a deliberate pick with a
  // known owner, so no random top-up is allowed.
  if (mode === "draft") {
    if (requestedIds.length !== size) {
      res
        .status(400)
        .json({ error: `Draft mode requires exactly ${size} fighters (got ${requestedIds.length})` });
      return;
    }
    const missingOwner = requestedIds.some((id) => !ownerById.has(id));
    if (missingOwner) {
      res.status(400).json({ error: "Draft mode requires an owner for every fighter" });
      return;
    }
  }

  // Load the requested characters and order them by seed.
  const charMap = new Map<number, Character>();
  if (requestedIds.length > 0) {
    const rows = await db
      .select()
      .from(charactersTable)
      .where(inArray(charactersTable.id, requestedIds));
    for (const c of rows) charMap.set(c.id, c);
  }
  // Reject unknown ids outright (don't silently drop + random-fill, which would
  // produce a surprising bracket the player never picked).
  const unknownIds = requestedIds.filter((id) => !charMap.has(id));
  if (unknownIds.length > 0) {
    res.status(400).json({ error: `Unknown character id(s): ${unknownIds.join(", ")}` });
    return;
  }
  // Developer Legends have max stats and would trivially win any bracket, so they
  // are barred from tournaments. The frontend hides them, but enforce it here too
  // so a forged request can't slip one in.
  const barred = requestedIds.filter(
    (id) => charMap.get(id)?.universe === EXCLUDED_UNIVERSE,
  );
  if (barred.length > 0) {
    res.status(400).json({ error: "Developer Legends are not allowed in tournaments" });
    return;
  }
  // Enforce the draft power budget server-side — never trust the client. Each
  // side's drafted fighters must total <= budget for the bracket size.
  if (mode === "draft") {
    const budget = draftBudget(size);
    let userCost = 0;
    let cpuCost = 0;
    for (const id of requestedIds) {
      const c = charMap.get(id);
      if (!c) continue;
      const cost = fighterCost(c);
      if (ownerById.get(id) === "user") userCost += cost;
      else if (ownerById.get(id) === "cpu") cpuCost += cost;
    }
    if (userCost > budget || cpuCost > budget) {
      res.status(400).json({
        error: `Draft exceeds the power budget of ${budget} (you: ${userCost}, cpu: ${cpuCost})`,
      });
      return;
    }
  }

  const seeded: Character[] = [];
  for (const id of requestedIds) {
    const c = charMap.get(id);
    if (c) seeded.push(c);
  }

  // Top up to `size` with random characters not already chosen.
  const need = size - seeded.length;
  if (need > 0) {
    const chosenIds = seeded.map((c) => c.id);
    const fillers = await db
      .select()
      .from(charactersTable)
      .where(chosenIds.length > 0 ? notInArray(charactersTable.id, chosenIds) : sql`true`)
      .orderBy(sql`random()`)
      .limit(need);
    seeded.push(...fillers);
  }

  if (seeded.length < size) {
    res.status(400).json({ error: "Not enough characters available to fill the bracket" });
    return;
  }

  // ── Auto-run the bracket round by round (deterministic, no AI) ────────────
  const { rounds, champion } = await runBracket(seeded, size, ownerById);
  const bracket: TournamentBracket = { rounds };
  const userId = getOptionalUserId(req);

  const [inserted] = await db
    .insert(tournamentsTable)
    .values({
      userId,
      name: name?.trim() || "A.v.A Cup",
      themeLabel: themeLabel ?? null,
      size,
      mode,
      championId: champion.id,
      championName: champion.name,
      bracket,
    })
    .returning();

  res.status(201).json({
    id: inserted!.id,
    userId: inserted!.userId ?? null,
    name: inserted!.name,
    themeLabel: inserted!.themeLabel ?? null,
    size: inserted!.size,
    mode: inserted!.mode ?? null,
    championId: inserted!.championId,
    championName: inserted!.championName,
    bracket: inserted!.bracket,
    createdAt: inserted!.createdAt.toISOString(),
  });
});

export default router;
