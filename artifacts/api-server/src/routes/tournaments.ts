import { Router, type IRouter } from "express";
import { eq, desc, inArray, notInArray, sql } from "drizzle-orm";
import {
  db,
  charactersTable,
  tournamentsTable,
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

function toCompetitor(c: Character): TournamentCompetitor {
  return { id: c.id, name: c.name, universe: c.universe, imageUrl: c.imageUrl ?? null };
}

// Round names depend on bracket size.
function roundNames(size: number): string[] {
  if (size === 16) return ["Round of 16", "Quarterfinals", "Semifinals", "Final"];
  return ["Quarterfinals", "Semifinals", "Final"];
}

// Resolve a single match. Reads fightCacheTable first (so the bracket agrees
// with any prior fight of the same matchup) and writes the verdict back when
// fresh, so a later "watch this fight" replays the IDENTICAL outcome.
async function resolveMatch(
  charA: Character,
  charB: Character,
): Promise<{ winnerSide: 1 | 2; difficulty: string; fightType: string; blurb: string }> {
  const aIds = [charA.id];
  const bIds = [charB.id];
  const { cacheKey, teamAIsTeam1 } = getCacheKey(aIds, bIds);

  const [existing] = await db
    .select()
    .from(fightCacheTable)
    .where(eq(fightCacheTable.cacheKey, cacheKey))
    .limit(1);

  if (existing) {
    // existing.winnerTeam is canonical (1 = teamA, the lower-sorted side).
    const winnerSide: 1 | 2 =
      (existing.winnerTeam === 1 && teamAIsTeam1) || (existing.winnerTeam === 2 && !teamAIsTeam1)
        ? 1
        : 2;
    return {
      winnerSide,
      difficulty: existing.difficulty,
      fightType: existing.fightType,
      blurb: existing.turningPoint,
    };
  }

  const { winner, resolution } = resolveFightVerdict([charA], [charB]);
  const winnerTeamCanonical = teamAIsTeam1 ? winner : winner === 1 ? 2 : 1;

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

  return {
    winnerSide: winner,
    difficulty: resolution.difficulty,
    fightType: resolution.fightType,
    blurb: resolution.turningPoint,
  };
}

router.get("/tournaments", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: tournamentsTable.id,
      name: tournamentsTable.name,
      themeLabel: tournamentsTable.themeLabel,
      size: tournamentsTable.size,
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
      championId: r.championId,
      championName: r.championName,
      createdAt: r.createdAt.toISOString(),
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
    championId: row.championId,
    championName: row.championName,
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

  // De-dupe provided ids, preserving seed order.
  const seenIds = new Set<number>();
  const requestedIds: number[] = [];
  for (const id of parsed.data.competitorIds) {
    if (!seenIds.has(id)) {
      seenIds.add(id);
      requestedIds.push(id);
    }
  }
  if (requestedIds.length > size) {
    res.status(400).json({ error: `Too many competitors for a ${size}-fighter bracket` });
    return;
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
  const names = roundNames(size);
  const rounds: TournamentRound[] = [];
  let current: Character[] = seeded.slice(0, size);

  for (let roundIdx = 0; roundIdx < names.length; roundIdx++) {
    const matches: TournamentMatch[] = [];
    const winners: Character[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i]!;
      const b = current[i + 1]!;
      const { winnerSide, difficulty, fightType, blurb } = await resolveMatch(a, b);
      const winnerChar = winnerSide === 1 ? a : b;
      winners.push(winnerChar);
      matches.push({
        matchId: `r${roundIdx}-m${i / 2}`,
        a: toCompetitor(a),
        b: toCompetitor(b),
        winnerSide,
        winnerId: winnerChar.id,
        difficulty,
        fightType,
        blurb,
      });
    }
    rounds.push({ name: names[roundIdx]!, matches });
    current = winners;
  }

  const champion = current[0]!;
  const bracket: TournamentBracket = { rounds };
  const userId = getOptionalUserId(req);

  const [inserted] = await db
    .insert(tournamentsTable)
    .values({
      userId,
      name: name?.trim() || "A.v.A Cup",
      themeLabel: themeLabel ?? null,
      size,
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
    championId: inserted!.championId,
    championName: inserted!.championName,
    bracket: inserted!.bracket,
    createdAt: inserted!.createdAt.toISOString(),
  });
});

export default router;
