import { Router, type IRouter } from "express";
import { inArray, desc, eq, and, or, isNull, lt } from "drizzle-orm";
import { db, charactersTable, fightsTable, fightCacheTable, challengesTable } from "@workspace/db";
import { normalizeModifierId, getModifier } from "../lib/modifiers";
import {
  SimulateFightBody,
  ListFightsResponse,
  SimulateFightResponse,
  GetFightResponse,
} from "@workspace/api-zod";
import { simulateFight, type SimulateFightProgress } from "../lib/fightSimulator";
import { getOptionalUserId, requireAuth } from "../lib/auth";
import { consumeEnergy, OutOfEnergyError } from "../lib/energy";
import { getDailyMatchupsForDate, getDailyDateString } from "../lib/dailyPool";

// Verify a request's `dailyMatchupId` matches a real matchup in today's
// lineup AND that the team rosters line up (in either order — the daily UI
// always shows the lineup's team1 on the left and team2 on the right, but
// the request itself can come in either orientation). When this passes,
// energy is NOT consumed for the fight — daily matchups are free.
function isValidDailyMatchupRequest(
  dailyMatchupId: string | null | undefined,
  team1Ids: number[],
  team2Ids: number[],
): boolean {
  if (!dailyMatchupId) return false;
  const lineup = getDailyMatchupsForDate(getDailyDateString());
  const entry = lineup.find((e) => e.id === dailyMatchupId);
  if (!entry) return false;
  const norm = (a: number[]) => [...a].sort((x, y) => x - y).join(",");
  const t1 = norm(team1Ids);
  const t2 = norm(team2Ids);
  const e1 = norm(entry.team1Ids);
  const e2 = norm(entry.team2Ids);
  return (t1 === e1 && t2 === e2) || (t1 === e2 && t2 === e1);
}

// Helper for the challenge wait branch — poll the DB for the OTHER player's
// fightId to appear, then return it. Returns null on timeout or close.
// Result of a waiter poll. `fightId` means the other player generated and we
// should replay. `claimAvailable` means the other player released the
// generation slot (e.g. ran out of energy) and we should attempt to claim it
// ourselves. Otherwise keep waiting.
type WaitResult =
  | { kind: "fightId"; fightId: number }
  | { kind: "claimAvailable" }
  | { kind: "timeout" };

async function waitForChallengeFightId(
  code: string,
  timeoutMs: number,
  isClosed: () => boolean,
): Promise<WaitResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isClosed()) return { kind: "timeout" };
    await new Promise((r) => setTimeout(r, 1500));
    const [c] = await db
      .select({
        fightId: challengesTable.fightId,
        generatingAt: challengesTable.generatingAt,
      })
      .from(challengesTable)
      .where(eq(challengesTable.code, code))
      .limit(1);
    if (c?.fightId) return { kind: "fightId", fightId: c.fightId };
    // Slot was released (other player ran out of energy / aborted) — let the
    // caller take a turn at claiming it instead of waiting the full timeout.
    if (c && c.generatingAt === null) return { kind: "claimAvailable" };
  }
  return { kind: "timeout" };
}

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
        modifierId: f.modifierId ?? null,
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
      whyWon: fight.whyWon ?? [],
      modifierId: fight.modifierId ?? null,
      simulatedAt: fight.simulatedAt,
    }),
  );
});

// ── Authenticated user's own fights & stats ──────────────────────────────────
// "Show me only the fights I started" — used by the Profile page. Guests get
// 401 since this only makes sense for a signed-in user. Stats are computed
// from the same row set so they match what's displayed.
router.get("/me/fights", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const fights = await db
    .select()
    .from(fightsTable)
    .where(eq(fightsTable.userId, userId))
    .orderBy(desc(fightsTable.simulatedAt))
    .limit(100);

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

router.get("/me/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const fights = await db
    .select({
      winner: fightsTable.winner,
      team1Names: fightsTable.team1Names,
      team2Names: fightsTable.team2Names,
    })
    .from(fightsTable)
    .where(eq(fightsTable.userId, userId));

  // Count appearances and wins per character across all of this user's fights.
  // "Used" is total appearances (either team), "wins" is appearances on the
  // winning team. Top fighters are sorted by usage, top winners by win count.
  const usage: Record<string, { used: number; wins: number }> = {};
  let team1Wins = 0;
  let team2Wins = 0;
  for (const f of fights) {
    if (f.winner === 1) team1Wins++;
    else team2Wins++;
    const winnerNames = f.winner === 1 ? f.team1Names : f.team2Names;
    const winnerSet = new Set(winnerNames);
    for (const n of [...f.team1Names, ...f.team2Names]) {
      const entry = usage[n] ?? { used: 0, wins: 0 };
      entry.used++;
      if (winnerSet.has(n)) entry.wins++;
      usage[n] = entry;
    }
  }

  const characters = Object.entries(usage)
    .map(([name, s]) => ({ name, used: s.used, wins: s.wins }))
    .sort((a, b) => b.used - a.used || b.wins - a.wins);

  res.json({
    totalFights: fights.length,
    team1Wins,
    team2Wins,
    characters,
  });
});

router.post("/fights", async (req, res): Promise<void> => {
  const parsed = SimulateFightBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { team1: team1Ids, team2: team2Ids, mode = "cinematic", upset = false, challengeCode } = parsed.data;
  // Server-truth: when this fight is bound to a challenge, the challenge row's
  // modifier wins over anything the body claims. Mirrors /fights/stream so
  // tampered body rules can never override the agreed-upon chaos rules.
  let modifierId = normalizeModifierId(parsed.data.modifierId);
  if (challengeCode) {
    const code = challengeCode.toUpperCase();
    const [ch] = await db
      .select({ modifierId: challengesTable.modifierId })
      .from(challengesTable)
      .where(eq(challengesTable.code, code))
      .limit(1);
    if (ch) modifierId = normalizeModifierId(ch.modifierId);
  }
  // Modifiers that flip the verdict (Underdog) must bypass the verdict cache
  // entirely — the cache key is composition-only, so a flipped winner would
  // poison subsequent normal fights of the same matchup.
  const skipCache = upset || getModifier(modifierId)?.flipUnderdog === true;
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

  // ── Energy gate (signed-in users only) ────────────────────────────────────
  // The streaming endpoint (/fights/stream) is the one the UI actually calls,
  // but this non-streaming endpoint is still exposed and would otherwise be a
  // bypass. POST /fights always generates a fresh fight (no claim/replay
  // races to worry about), so charge unconditionally for signed-in users
  // UNLESS the request is a verified daily-matchup viewing (free).
  const postFightsUserId = getOptionalUserId(req);
  const postFightsIsDaily = isValidDailyMatchupRequest(
    parsed.data.dailyMatchupId ?? null,
    team1Ids,
    team2Ids,
  );
  if (postFightsUserId && !postFightsIsDaily) {
    try {
      await consumeEnergy(postFightsUserId);
    } catch (err) {
      if (err instanceof OutOfEnergyError) {
        res.status(402).json({ error: "out-of-energy" });
        return;
      }
      throw err;
    }
  }

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const { cacheKey, teamAIsTeam1 } = getCacheKey(team1Ids, team2Ids);
  let cachedResolution = null;
  let cachedEntry = null;
  let rematchCount = 0;
  let settled = false;
  let winRate: number | undefined;

  if (!skipCache) {
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
  const result = await simulateFight(team1, team2, mode ?? "cinematic", cachedResolution, rematchCount, undefined, modifierId);

  // ── Store verdict in cache if this was a fresh simulation ────────────────
  if (!skipCache && !cachedEntry && result.resolution) {
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
      whyWon: result.whyWon ?? [],
      userId: getOptionalUserId(req),
      modifierId: modifierId ?? null,
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
      modifierId: modifierId ?? null,
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

  const { team1: team1Ids, team2: team2Ids, mode = "cinematic", upset = false, challengeCode, dailyMatchupId } = parsed.data;
  // Modifier id can come from either the request body or — for challenge
  // fights — the challenge row itself. Server-truth (challenge row) wins so a
  // tampered client can't change the agreed-upon rules mid-match.
  let modifierId = normalizeModifierId(parsed.data.modifierId);
  const normalizedChallengeCode = challengeCode ? challengeCode.toUpperCase() : null;
  // Daily-matchup viewings bypass the energy gate. The server verifies the
  // matchup id is in today's lineup AND the teams match — a tampered client
  // can't pass a random id and get free fights.
  const isDailyMatchup = isValidDailyMatchupRequest(dailyMatchupId ?? null, team1Ids, team2Ids);
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

  // ── Energy gate (signed-in users only) ────────────────────────────────────
  // Guests are unaffected — the gate is per-user and guests have no profile.
  //
  // For SOLO fights we consume up-front so we can return a clean 402 before
  // opening the SSE stream.
  //
  // For CHALLENGE fights we defer the consume until we know this client is
  // actually going to GENERATE the fight (i.e. wins the slot-claim race
  // below). The other paths in challenge mode are pure replay of an
  // already-generated saved fight — charging for them would violate the
  // "don't deduct energy when viewing saved fights" + "only deduct once
  // per fight" safeguards (otherwise both players would be charged).
  const gateUserId = getOptionalUserId(req);
  const isChallengeFight = !!normalizedChallengeCode;
  if (gateUserId && !isChallengeFight && !isDailyMatchup) {
    try {
      await consumeEnergy(gateUserId);
    } catch (err) {
      if (err instanceof OutOfEnergyError) {
        res.status(402).json({ error: "out-of-energy" });
        return;
      }
      throw err;
    }
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

  // Replay a previously-saved fight as init + complete events. Used when this
  // request is the SECOND player in a PvP challenge: the first player already
  // generated the fight, we just hand the same saved row back so both players
  // see identical narrative text. Mirrors the client-side hook's expectation
  // that `complete` carries a full FightResult-shaped payload.
  const replaySavedFight = async (fightId: number): Promise<void> => {
    const [fight] = await db.select().from(fightsTable).where(eq(fightsTable.id, fightId)).limit(1);
    if (!fight) {
      send("error", { message: "Saved fight not found" });
      return;
    }
    const rounds = fight.rounds as Array<{ round: number; attacker: string; narrative: string; team1Hp: number; team2Hp: number }>;
    send("init", {
      team1: team1.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })),
      team2: team2.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })),
      winner: fight.winner,
      arena: { name: "", description: "" },
      rounds: rounds.map((r, i) => ({
        round: i + 1,
        attacker: 1 as 1 | 2,
        narrative: r.narrative,
        team1Hp: r.team1Hp,
        team2Hp: r.team2Hp,
      })),
      settled: true,
      rematchCount: 0,
    });
    send("complete", SimulateFightResponse.parse({
      id: fight.id,
      team1,
      team2,
      winner: fight.winner,
      rounds,
      summary: fight.summary,
      arenaIntro: fight.arenaIntro ?? "",
      intro: fight.intro ?? "",
      whyWon: fight.whyWon ?? [],
      settled: true,
      rematchCount: 0,
      modifierId: fight.modifierId ?? null,
      simulatedAt: fight.simulatedAt,
    }));
  };

  try {
    // ── PvP challenge sync ────────────────────────────────────────────────────
    // If this fight is part of a challenge, the first player to start
    // generates the narrative and writes its fight id back to the challenge.
    // The other player polls for that fight id to appear, then replays the
    // SAME saved fight — so both see identical text instead of independently
    // generated different stories.
    let claimedChallenge = false;
    if (normalizedChallengeCode) {
      const [challenge] = await db
        .select()
        .from(challengesTable)
        .where(eq(challengesTable.code, normalizedChallengeCode))
        .limit(1);
      if (!challenge) {
        send("error", { message: "Challenge not found" });
        return;
      }
      // Authoritative modifier id always comes from the challenge row.
      modifierId = normalizeModifierId(challenge.modifierId);
      // Already played → instant replay from saved fight
      if (challenge.fightId) {
        await replaySavedFight(challenge.fightId);
        return;
      }
      // Lobby gate — both sides must hit READY before generation is allowed.
      // The client-side lobby UI is the primary gate; this is defence-in-depth
      // so a stale tab or a manually-crafted request can't bypass the lobby.
      if (!challenge.team1Ready || !challenge.team2Ready) {
        send("error", { message: "Both players must be ready before the fight can start." });
        return;
      }

      const STALE_MS = 120_000;

      // Try to claim the generation slot. If we lose the race, wait for the
      // winner's fightId — but if they release the slot (e.g. ran out of
      // energy), retake it ourselves. We loop at most 3 times so a pair of
      // out-of-energy players can't bounce the slot forever.
      let attempts = 0;
      while (attempts < 3 && !claimedChallenge) {
        attempts++;
        const staleCutoff = new Date(Date.now() - STALE_MS);
        const claimed = await db
          .update(challengesTable)
          .set({ generatingAt: new Date() })
          .where(
            and(
              eq(challengesTable.code, normalizedChallengeCode),
              isNull(challengesTable.fightId),
              or(
                isNull(challengesTable.generatingAt),
                lt(challengesTable.generatingAt, staleCutoff),
              ),
            ),
          )
          .returning({ id: challengesTable.id });

        if (claimed.length > 0) {
          claimedChallenge = true;
          break;
        }
        // Other player owns generation — wait for fightId or for the slot
        // to free up so we can take over.
        const w = await waitForChallengeFightId(normalizedChallengeCode, STALE_MS, () => closed);
        if (w.kind === "fightId") {
          await replaySavedFight(w.fightId);
          return;
        }
        if (w.kind === "timeout") {
          send("error", { message: "Other player's fight is taking too long. Try again." });
          return;
        }
        // claimAvailable → fall through and re-attempt the claim.
      }

      if (!claimedChallenge) {
        send("error", { message: "Could not start fight. Both players may be out of energy." });
        return;
      }

      // Deferred energy gate (challenge fights). Now that we know we're the
      // generator (not the replayer), charge the user. If they're empty,
      // release the claim so the other player can take over instead of the
      // challenge timing out at staleCutoff.
      if (gateUserId) {
        try {
          await consumeEnergy(gateUserId);
        } catch (err) {
          if (err instanceof OutOfEnergyError) {
            await db
              .update(challengesTable)
              .set({ generatingAt: null })
              .where(eq(challengesTable.code, normalizedChallengeCode));
            send("error", { message: "out-of-energy" });
            return;
          }
          throw err;
        }
      }
    }

    // ── Cache lookup (same logic as POST /fights) ────────────────────────────
    // Same skip rule as POST /fights — verdict-flipping modifiers (Underdog)
    // must never read or write the composition-keyed verdict cache, or they
    // will poison subsequent normal fights for the same matchup.
    const skipCache = upset || getModifier(modifierId)?.flipUnderdog === true;
    const { cacheKey, teamAIsTeam1 } = getCacheKey(team1Ids, team2Ids);
    let cachedResolution = null;
    let cachedEntry = null;
    let rematchCount = 0;
    let settled = false;
    let winRate: number | undefined;

    if (!skipCache) {
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

    const result = await simulateFight(team1, team2, mode ?? "cinematic", cachedResolution, rematchCount, progress, modifierId);

    // ── Cache write (verdict only — narrative stays fresh every fight) ──────
    if (!skipCache && !cachedEntry && result.resolution) {
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
        whyWon: result.whyWon ?? [],
        userId: getOptionalUserId(req),
        modifierId: modifierId ?? null,
      })
      .returning();

    // If we generated this on behalf of a challenge, attach the fight id so
    // the other player's pending stream can pick it up and replay the same
    // narrative instead of generating its own.
    if (claimedChallenge && normalizedChallengeCode) {
      await db
        .update(challengesTable)
        .set({ fightId: saved.id, status: "completed" })
        .where(eq(challengesTable.code, normalizedChallengeCode));
    }

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
      modifierId: modifierId ?? null,
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
