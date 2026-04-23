import { Router, type IRouter } from "express";
import { inArray, desc, eq } from "drizzle-orm";
import { db, charactersTable, fightsTable, fightCacheTable } from "@workspace/db";
import {
  SimulateFightBody,
  ListFightsResponse,
  SimulateFightResponse,
  GetFightResponse,
} from "@workspace/api-zod";
import { simulateFight, type SimulateFightProgress } from "../lib/fightSimulator";

const router: IRouter = Router();

// ── Cache key helpers ─────────────────────────────────────────────────────────
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

// Map fight difficulty to win rate %
function difficultyToWinRate(difficulty: string): number {
  if (difficulty === "easy") return 90;
  if (difficulty === "moderate") return 72;
  if (difficulty === "hard") return 57;
  return 75;
}

router.get("/fights", async (req, res): Promise<void> => {
  const fights = await db
    .select()
    .from(fightsTable)
    .orderBy(desc(fightsTable.simulatedAt))
    .limit(20);

  res.json(
    ListFightsResponse.parse(
      fights.map((f) => ({
        id: f.id,
        team1Names: f.team1Names,
        team2Names: f.team2Names,
        winner: f.winner,
        summary: f.summary,
        simulatedAt: f.simulatedAt,
      })),
    ),
  );
});

router.get("/fights/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid fight id" });
    return;
  }
  const [fight] = await db.select().from(fightsTable).where(eq(fightsTable.id, id));
  if (!fight) {
    res.status(404).json({ error: "Fight not found" });
    return;
  }
  res.json(
    GetFightResponse.parse({
      id: fight.id,
      team1Names: fight.team1Names,
      team2Names: fight.team2Names,
      winner: fight.winner,
      rounds: fight.rounds,
      summary: fight.summary,
      arenaIntro: fight.arenaIntro ?? "",
      intro: fight.intro ?? "",
      simulatedAt: fight.simulatedAt,
    }),
  );
});

router.post("/fights", async (req, res): Promise<void> => {
  const parsed = SimulateFightBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { team1: team1Ids, team2: team2Ids, mode = "cinematic", upset = false } = parsed.data;
  const allIds = [...team1Ids, ...team2Ids];
  const allCharacters = await db
    .select()
    .from(charactersTable)
    .where(inArray(charactersTable.id, allIds));

  const team1 = team1Ids
    .map((id) => allCharacters.find((c) => c.id === id))
    .filter(Boolean) as (typeof allCharacters)[0][];
  const team2 = team2Ids
    .map((id) => allCharacters.find((c) => c.id === id))
    .filter(Boolean) as (typeof allCharacters)[0][];

  if (team1.length === 0 || team2.length === 0) {
    res.status(400).json({ error: "One or both teams have no valid characters" });
    return;
  }

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const { cacheKey, teamAIsTeam1 } = getCacheKey(team1Ids, team2Ids);
  let cachedResolution = null;
  let cachedEntry = null;
  let rematchCount = 0;
  let settled = false;
  let winRate: number | undefined;

  if (!upset) {
    const [existing] = await db
      .select()
      .from(fightCacheTable)
      .where(eq(fightCacheTable.cacheKey, cacheKey))
      .limit(1);

    if (existing) {
      cachedEntry = existing;
      rematchCount = existing.rematchCount;
      settled = true;
      winRate = existing.winRate;

      // Adjust winner to match user's team1/team2 perspective
      const cachedWinnerTeam = teamAIsTeam1
        ? existing.winnerTeam
        : existing.winnerTeam === 1 ? 2 : 1;

      cachedResolution = {
        winner: (cachedWinnerTeam === 1 ? "Team 1" : "Team 2") as "Team 1" | "Team 2",
        difficulty: existing.difficulty as "easy" | "moderate" | "hard",
        fightType: existing.fightType as "stomp" | "one-sided" | "close",
        keyFactors: existing.keyFactors,
        turningPoint: existing.turningPoint,
        loserShowcase: existing.loserShowcase,
        winnerProof: existing.winnerProof,
      };
    }
  }

  // ── Always run a fresh AI simulation so each fight feels unique ──────────
  // Verdict is still cached (so the winner stays consistent across rematches),
  // but the narrative is regenerated every time for variety.
  const result = await simulateFight(team1, team2, mode ?? "cinematic", cachedResolution, rematchCount);

  // ── Store verdict in cache if this was a fresh simulation ────────────────
  if (!upset && !cachedEntry && result.resolution) {
    const r = result.resolution;
    const winnerTeamCanonical = teamAIsTeam1
      ? result.winner
      : result.winner === 1 ? 2 : 1;

    try {
      await db.insert(fightCacheTable).values({
        cacheKey,
        teamAIds: teamAIsTeam1 ? team1Ids : team2Ids,
        teamBIds: teamAIsTeam1 ? team2Ids : team1Ids,
        winnerTeam: winnerTeamCanonical,
        winRate: difficultyToWinRate(r.difficulty),
        difficulty: r.difficulty,
        fightType: r.fightType,
        keyFactors: r.keyFactors,
        turningPoint: r.turningPoint,
        loserShowcase: r.loserShowcase,
        winnerProof: r.winnerProof,
        rematchCount: 0,
      });
      winRate = difficultyToWinRate(r.difficulty);
    } catch {
      // Unique constraint race — another request beat us, ignore
    }
  }

  // ── Increment rematch counter in cache ────────────────────────────────────
  if (cachedEntry) {
    await db
      .update(fightCacheTable)
      .set({ rematchCount: cachedEntry.rematchCount + 1 })
      .where(eq(fightCacheTable.id, cachedEntry.id));
  }

  // ── Persist fight record ──────────────────────────────────────────────────
  const [saved] = await db
    .insert(fightsTable)
    .values({
      team1Ids,
      team2Ids,
      team1Names: team1.map((c) => c.name),
      team2Names: team2.map((c) => c.name),
      winner: result.winner,
      rounds: result.rounds,
      summary: result.summary,
      arenaIntro: result.arenaIntro ?? null,
      intro: result.intro ?? null,
    })
    .returning();

  res.json(
    SimulateFightResponse.parse({
      id: saved.id,
      team1,
      team2,
      winner: result.winner,
      rounds: result.rounds,
      summary: result.summary,
      arenaIntro: result.arenaIntro ?? "",
      intro: result.intro ?? "",
      whyWon: result.whyWon ?? [],
      settled,
      winRate: winRate !== undefined && winRate <= 65 ? winRate : undefined,
      rematchCount,
      simulatedAt: saved.simulatedAt,
    }),
  );
});

// ── Streaming fight endpoint (SSE) ────────────────────────────────────────────
// Same fight pipeline as POST /fights, but emits Server-Sent Events as the
// narrative AI streams sections (SETTING, ENTRANCE, ROUND 1, etc.). Final
// `complete` event carries the full saved fight payload — identical shape to
// the JSON returned by POST /fights, so the client can finalize state from it.
router.post("/fights/stream", async (req, res): Promise<void> => {
  const parsed = SimulateFightBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { team1: team1Ids, team2: team2Ids, mode = "cinematic", upset = false } = parsed.data;
  const allIds = [...team1Ids, ...team2Ids];
  const allCharacters = await db
    .select()
    .from(charactersTable)
    .where(inArray(charactersTable.id, allIds));

  const team1 = team1Ids
    .map((id) => allCharacters.find((c) => c.id === id))
    .filter(Boolean) as (typeof allCharacters)[0][];
  const team2 = team2Ids
    .map((id) => allCharacters.find((c) => c.id === id))
    .filter(Boolean) as (typeof allCharacters)[0][];

  if (team1.length === 0 || team2.length === 0) {
    res.status(400).json({ error: "One or both teams have no valid characters" });
    return;
  }

  // Open the SSE stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering
  res.flushHeaders?.();

  let closed = false;
  req.on("close", () => { closed = true; });

  const send = (event: string, payload: unknown) => {
    if (closed) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Heartbeat every 15s to keep proxies from closing the connection
  const heartbeat = setInterval(() => {
    if (!closed) res.write(`: ping\n\n`);
  }, 15_000);

  try {
    // ── Cache lookup (same logic as POST /fights) ────────────────────────────
    const { cacheKey, teamAIsTeam1 } = getCacheKey(team1Ids, team2Ids);
    let cachedResolution = null;
    let cachedEntry = null;
    let rematchCount = 0;
    let settled = false;
    let winRate: number | undefined;

    if (!upset) {
      const [existing] = await db
        .select()
        .from(fightCacheTable)
        .where(eq(fightCacheTable.cacheKey, cacheKey))
        .limit(1);

      if (existing) {
        cachedEntry = existing;
        rematchCount = existing.rematchCount;
        settled = true;
        winRate = existing.winRate;

        const cachedWinnerTeam = teamAIsTeam1
          ? existing.winnerTeam
          : existing.winnerTeam === 1 ? 2 : 1;

        cachedResolution = {
          winner: (cachedWinnerTeam === 1 ? "Team 1" : "Team 2") as "Team 1" | "Team 2",
          difficulty: existing.difficulty as "easy" | "moderate" | "hard",
          fightType: existing.fightType as "stomp" | "one-sided" | "close",
          keyFactors: existing.keyFactors,
          turningPoint: existing.turningPoint,
          loserShowcase: existing.loserShowcase,
          winnerProof: existing.winnerProof,
        };
      }
    }

    // ── Always run a fresh AI simulation so each fight feels unique ──────────
    // Verdict is cached for consistent winner; narrative is regenerated every
    // time so rematches read like new stories.
    const progress: SimulateFightProgress = {
      onInit: (info) => {
        send("init", {
          team1: team1.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })),
          team2: team2.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })),
          ...info,
          settled,
          rematchCount,
        });
      },
      onSection: (name, content) => {
        send("section", { name, content });
      },
      onSectionDelta: (name, append) => {
        send("delta", { name, append });
      },
    };

    const result = await simulateFight(team1, team2, mode ?? "cinematic", cachedResolution, rematchCount, progress);

    // ── Cache write (verdict only — narrative stays fresh every fight) ──────
    if (!upset && !cachedEntry && result.resolution) {
      const r = result.resolution;
      const winnerTeamCanonical = teamAIsTeam1
        ? result.winner
        : result.winner === 1 ? 2 : 1;

      try {
        await db.insert(fightCacheTable).values({
          cacheKey,
          teamAIds: teamAIsTeam1 ? team1Ids : team2Ids,
          teamBIds: teamAIsTeam1 ? team2Ids : team1Ids,
          winnerTeam: winnerTeamCanonical,
          winRate: difficultyToWinRate(r.difficulty),
          difficulty: r.difficulty,
          fightType: r.fightType,
          keyFactors: r.keyFactors,
          turningPoint: r.turningPoint,
          loserShowcase: r.loserShowcase,
          winnerProof: r.winnerProof,
          rematchCount: 0,
        });
        winRate = difficultyToWinRate(r.difficulty);
      } catch { /* unique constraint race — ignore */ }
    }

    if (cachedEntry) {
      await db
        .update(fightCacheTable)
        .set({ rematchCount: cachedEntry.rematchCount + 1 })
        .where(eq(fightCacheTable.id, cachedEntry.id));
    }

    // ── Persist fight record ─────────────────────────────────────────────────
    const [saved] = await db
      .insert(fightsTable)
      .values({
        team1Ids,
        team2Ids,
        team1Names: team1.map((c) => c.name),
        team2Names: team2.map((c) => c.name),
        winner: result.winner,
        rounds: result.rounds,
        summary: result.summary,
        arenaIntro: result.arenaIntro ?? null,
        intro: result.intro ?? null,
      })
      .returning();

    const fullPayload = SimulateFightResponse.parse({
      id: saved.id,
      team1,
      team2,
      winner: result.winner,
      rounds: result.rounds,
      summary: result.summary,
      arenaIntro: result.arenaIntro ?? "",
      intro: result.intro ?? "",
      whyWon: result.whyWon ?? [],
      settled,
      winRate: winRate !== undefined && winRate <= 65 ? winRate : undefined,
      rematchCount,
      simulatedAt: saved.simulatedAt,
    });

    send("complete", fullPayload);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Fight simulation failed" });
  } finally {
    clearInterval(heartbeat);
    if (!closed) res.end();
  }
});

router.delete("/fights", async (_req, res): Promise<void> => {
  await db.delete(fightsTable);
  res.status(204).send();
});

router.delete("/fights/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid fight id" });
    return;
  }
  await db.delete(fightsTable).where(eq(fightsTable.id, id));
  res.status(204).send();
});

export default router;
