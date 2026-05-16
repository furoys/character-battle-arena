import { Router, type IRouter } from "express";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  db,
  dailyMatchupsTable,
  dailyPicksTable,
  dailyAdBonusTable,
  fightCacheTable,
} from "@workspace/db";
import { getOptionalUserId, requireAuth } from "../lib/auth";
import {
  DAILY_POOL,
  DAILY_PICK_POINTS_BASE,
  DAILY_AD_BONUS_CAP,
  getDailyDateString,
  getDailyMatchupsForDate,
} from "../lib/dailyPool";

const router: IRouter = Router();

// Build canonical cache key (mirrors fights.ts getCacheKey logic) so we can
// look up the verdict without re-importing the helper from a sibling route.
function buildCacheKey(team1: number[], team2: number[]): {
  cacheKey: string;
  teamAIsTeam1: boolean;
} {
  const aKey = [...team1].sort((x, y) => x - y).join(",");
  const bKey = [...team2].sort((x, y) => x - y).join(",");
  const teamAIsTeam1 = aKey <= bKey;
  return {
    cacheKey: teamAIsTeam1 ? `${aKey}|${bKey}` : `${bKey}|${aKey}`,
    teamAIsTeam1,
  };
}

// Ensure all 10 daily_matchups rows exist for `date`. Idempotent — concurrent
// requests at midnight race safely thanks to the unique (date, matchupId)
// index + onConflictDoNothing.
async function ensureDailyRows(date: string) {
  const lineup = getDailyMatchupsForDate(date);
  // Insert any missing rows in one round-trip.
  await db
    .insert(dailyMatchupsTable)
    .values(lineup.map((entry) => ({ date, matchupId: entry.id })))
    .onConflictDoNothing();
  const rows = await db
    .select()
    .from(dailyMatchupsTable)
    .where(eq(dailyMatchupsTable.date, date));
  // Return in lineup order (DB order isn't guaranteed to match the deterministic
  // shuffle), and filter to the canonical 10 so any stale rows from a previous
  // pool revision don't leak into the response.
  const byId = new Map(rows.map((r) => [r.matchupId, r]));
  return lineup
    .map((entry) => ({ entry, row: byId.get(entry.id) }))
    .filter((x): x is { entry: typeof lineup[number]; row: typeof rows[number] } =>
      x.row !== undefined,
    );
}

// Try to resolve winnerSide by reading the fight verdict cache. If the cache
// row exists, copy the winner into the daily_matchups row. Idempotent — safe
// to call on every GET.
async function tryResolveWinner(
  date: string,
  matchupId: string,
  team1Ids: number[],
  team2Ids: number[],
  currentWinnerSide: number | null,
): Promise<number | null> {
  if (currentWinnerSide !== null) return currentWinnerSide;
  const { cacheKey, teamAIsTeam1 } = buildCacheKey(team1Ids, team2Ids);
  const [cached] = await db
    .select()
    .from(fightCacheTable)
    .where(eq(fightCacheTable.cacheKey, cacheKey))
    .limit(1);
  if (!cached) return null;
  // fightCacheTable.winnerTeam: 1 = canonical teamA wins, 2 = canonical teamB
  // wins. Translate back to the daily matchup's team1/team2 orientation.
  const winnerIsTeam1 =
    (cached.winnerTeam === 1 && teamAIsTeam1) ||
    (cached.winnerTeam === 2 && !teamAIsTeam1);
  const winnerSide = winnerIsTeam1 ? 1 : 2;
  await db
    .update(dailyMatchupsTable)
    .set({ winnerSide, resolvedAt: new Date() })
    .where(
      and(
        eq(dailyMatchupsTable.date, date),
        eq(dailyMatchupsTable.matchupId, matchupId),
      ),
    );
  return winnerSide;
}

// ── Pick-point economy helpers ────────────────────────────────────────────────
// Allowance = DAILY_PICK_POINTS_BASE + adPointsEarned. Used = number of picks
// the user has made today across all matchups. Remaining = max(0, allowance−used).
type PickPoints = { base: number; adBonus: number; adBonusCap: number; used: number; remaining: number };

async function readPickPoints(userId: string, date: string): Promise<PickPoints> {
  const [bonusRow] = await db
    .select()
    .from(dailyAdBonusTable)
    .where(
      and(eq(dailyAdBonusTable.date, date), eq(dailyAdBonusTable.userId, userId)),
    )
    .limit(1);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dailyPicksTable)
    .where(
      and(eq(dailyPicksTable.date, date), eq(dailyPicksTable.userId, userId)),
    );
  const adBonus = bonusRow?.adPointsEarned ?? 0;
  const used = countRow?.count ?? 0;
  const allowance = DAILY_PICK_POINTS_BASE + adBonus;
  return {
    base: DAILY_PICK_POINTS_BASE,
    adBonus,
    adBonusCap: DAILY_AD_BONUS_CAP,
    used,
    remaining: Math.max(0, allowance - used),
  };
}

// ── GET /api/daily ────────────────────────────────────────────────────────────
// Returns today's 10 matchups + the caller's picks (if signed in) + community
// split per matchup + resolved winner per matchup. Open to guests — they just
// don't get any `userPick` values.
router.get("/daily", async (req, res): Promise<void> => {
  const date = getDailyDateString();
  const pairs = await ensureDailyRows(date);
  const matchupIds = pairs.map((p) => p.entry.id);

  // Lazy verdict resolution per matchup (parallel cache lookups).
  const winners = await Promise.all(
    pairs.map((p) =>
      tryResolveWinner(date, p.entry.id, p.entry.team1Ids, p.entry.team2Ids, p.row.winnerSide),
    ),
  );

  // Caller's picks across today's matchups (one query for all 10).
  const userId = getOptionalUserId(req);
  let picksByMatchup = new Map<string, number>();
  if (userId && matchupIds.length > 0) {
    const picks = await db
      .select()
      .from(dailyPicksTable)
      .where(
        and(
          eq(dailyPicksTable.date, date),
          eq(dailyPicksTable.userId, userId),
          inArray(dailyPicksTable.matchupId, matchupIds),
        ),
      );
    picksByMatchup = new Map(picks.map((p) => [p.matchupId, p.pickedSide]));
  }

  // Community splits per matchup in one query.
  const splitRows = matchupIds.length === 0
    ? []
    : await db
        .select({
          matchupId: dailyPicksTable.matchupId,
          side: dailyPicksTable.pickedSide,
          count: sql<number>`count(*)::int`,
        })
        .from(dailyPicksTable)
        .where(
          and(
            eq(dailyPicksTable.date, date),
            inArray(dailyPicksTable.matchupId, matchupIds),
          ),
        )
        .groupBy(dailyPicksTable.matchupId, dailyPicksTable.pickedSide);
  const splitMap = new Map<string, { t1: number; t2: number }>();
  for (const r of splitRows) {
    const cur = splitMap.get(r.matchupId) ?? { t1: 0, t2: 0 };
    if (r.side === 1) cur.t1 = r.count;
    else if (r.side === 2) cur.t2 = r.count;
    splitMap.set(r.matchupId, cur);
  }

  const pickPoints = userId ? await readPickPoints(userId, date) : null;

  res.json({
    date,
    pickPoints,
    matchups: pairs.map((p, i) => {
      const split = splitMap.get(p.entry.id) ?? { t1: 0, t2: 0 };
      return {
        matchupId: p.entry.id,
        title: p.entry.title,
        hook: p.entry.hook,
        team1Ids: p.entry.team1Ids,
        team2Ids: p.entry.team2Ids,
        userPick: picksByMatchup.get(p.entry.id) ?? null,
        winnerSide: winners[i] ?? null,
        team1Count: split.t1,
        team2Count: split.t2,
      };
    }),
  });
});

// ── POST /api/daily/pick ──────────────────────────────────────────────────────
// Lock a pick for one of today's matchups. Requires sign-in. One pick per
// (user, matchup, day) — picks are closed once a matchup's verdict resolves.
router.post("/daily/pick", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const { side, matchupId } = req.body as { side?: unknown; matchupId?: unknown };
  if (side !== 1 && side !== 2) {
    res.status(400).json({ error: "side must be 1 or 2" });
    return;
  }
  if (typeof matchupId !== "string" || matchupId.length === 0) {
    res.status(400).json({ error: "matchupId is required" });
    return;
  }
  const date = getDailyDateString();
  const lineup = getDailyMatchupsForDate(date);
  const entry = lineup.find((p) => p.id === matchupId);
  if (!entry) {
    // Either an unknown id or one that isn't in today's lineup — clients
    // should only POST for matchups they got back from GET /api/daily.
    res.status(404).json({ error: "Matchup not part of today's lineup" });
    return;
  }
  await ensureDailyRows(date);

  // Hard-stop: once the verdict is known (pre-stored on the row or already
  // in the fight cache), picks for this matchup are closed.
  const [row] = await db
    .select()
    .from(dailyMatchupsTable)
    .where(
      and(eq(dailyMatchupsTable.date, date), eq(dailyMatchupsTable.matchupId, matchupId)),
    )
    .limit(1);
  let winnerSide = row?.winnerSide ?? null;
  if (winnerSide === null) {
    winnerSide = await tryResolveWinner(date, matchupId, entry.team1Ids, entry.team2Ids, null);
  }
  if (winnerSide !== null) {
    res.status(409).json({ error: "Picks closed — verdict already revealed" });
    return;
  }

  // ── Atomic pick-point spend + insert ──────────────────────────────────────
  // We need read-modify-write semantics on the user's daily pick budget so two
  // concurrent picks at point 0 can't both succeed. Strategy: lock the ad-bonus
  // row (creating with 0 if missing), count picks under the same transaction,
  // verify budget, then insert. If the user already has a pick on this matchup,
  // short-circuit — no double-charge for idempotent retries.
  type PickOutcome =
    | { kind: "ok"; pickedSide: number; pickPoints: PickPoints }
    | { kind: "duplicate"; pickedSide: number; pickPoints: PickPoints }
    | { kind: "out-of-points"; pickPoints: PickPoints };

  const outcome = await db.transaction(async (tx): Promise<PickOutcome> => {
    // Lazy-create ad bonus row so the lock target always exists, then take
    // the FOR UPDATE lock. Every operation below is serialized per-user for
    // today, so duplicate-pick + budget races are both eliminated.
    await tx
      .insert(dailyAdBonusTable)
      .values({ date, userId, adPointsEarned: 0 })
      .onConflictDoNothing();
    const [bonus] = await tx
      .select()
      .from(dailyAdBonusTable)
      .where(
        and(eq(dailyAdBonusTable.date, date), eq(dailyAdBonusTable.userId, userId)),
      )
      .for("update")
      .limit(1);
    // Existing pick? Idempotent — no spend. Checked AFTER the lock so two
    // concurrent calls for the same matchup can't both pass this check and
    // race to a unique-constraint-violation insert.
    const [existing] = await tx
      .select()
      .from(dailyPicksTable)
      .where(
        and(
          eq(dailyPicksTable.date, date),
          eq(dailyPicksTable.userId, userId),
          eq(dailyPicksTable.matchupId, matchupId),
        ),
      )
      .limit(1);
    const adBonus = bonus?.adPointsEarned ?? 0;
    const allowance = DAILY_PICK_POINTS_BASE + adBonus;
    const [countRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(dailyPicksTable)
      .where(
        and(eq(dailyPicksTable.date, date), eq(dailyPicksTable.userId, userId)),
      );
    const usedNow = countRow?.count ?? 0;
    const buildPoints = (used: number): PickPoints => ({
      base: DAILY_PICK_POINTS_BASE,
      adBonus,
      adBonusCap: DAILY_AD_BONUS_CAP,
      used,
      remaining: Math.max(0, allowance - used),
    });
    if (existing) {
      return { kind: "duplicate", pickedSide: existing.pickedSide, pickPoints: buildPoints(usedNow) };
    }
    if (usedNow >= allowance) {
      return { kind: "out-of-points", pickPoints: buildPoints(usedNow) };
    }
    await tx
      .insert(dailyPicksTable)
      .values({ date, matchupId, userId, pickedSide: side });
    return { kind: "ok", pickedSide: side, pickPoints: buildPoints(usedNow + 1) };
  });

  if (outcome.kind === "out-of-points") {
    res.status(403).json({
      error: "out-of-pick-points",
      message: "No pick points left. Watch an ad to earn one.",
      pickPoints: outcome.pickPoints,
    });
    return;
  }
  res.json({
    matchupId,
    pickedSide: outcome.pickedSide,
    pickPoints: outcome.pickPoints,
  });
});

// ── POST /api/daily/watch-ad ──────────────────────────────────────────────────
// Records a watched-ad credit, granting +1 pick point for today. Capped at
// DAILY_AD_BONUS_CAP so a user can never exceed the total lineup size. The
// "ad" itself is rendered + timed on the client — this endpoint just trusts
// the call (same risk profile as the rest of the daily moderation surface).
router.post("/daily/watch-ad", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const date = getDailyDateString();
  const result = await db.transaction(async (tx) => {
    await tx
      .insert(dailyAdBonusTable)
      .values({ date, userId, adPointsEarned: 0 })
      .onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(dailyAdBonusTable)
      .where(
        and(eq(dailyAdBonusTable.date, date), eq(dailyAdBonusTable.userId, userId)),
      )
      .for("update")
      .limit(1);
    const current = row?.adPointsEarned ?? 0;
    if (current >= DAILY_AD_BONUS_CAP) {
      return { granted: false, reason: "cap" as const, adBonus: current };
    }
    // Policy: only grant a bonus when the user has actually exhausted their
    // current allowance (base + already-earned bonus). Stops users from
    // pre-farming ad credits before they need them.
    const [countRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(dailyPicksTable)
      .where(
        and(eq(dailyPicksTable.date, date), eq(dailyPicksTable.userId, userId)),
      );
    const used = countRow?.count ?? 0;
    const allowance = DAILY_PICK_POINTS_BASE + current;
    if (used < allowance) {
      return { granted: false, reason: "not-exhausted" as const, adBonus: current };
    }
    const next = current + 1;
    await tx
      .update(dailyAdBonusTable)
      .set({ adPointsEarned: next, updatedAt: new Date() })
      .where(
        and(eq(dailyAdBonusTable.date, date), eq(dailyAdBonusTable.userId, userId)),
      );
    return { granted: true, adBonus: next };
  });
  if (!result.granted) {
    const pickPoints = await readPickPoints(userId, date);
    const error =
      result.reason === "cap" ? "ad-bonus-cap-reached" : "still-have-pick-points";
    res.status(409).json({ error, pickPoints });
    return;
  }
  const pickPoints = await readPickPoints(userId, date);
  res.json({ granted: true, pickPoints });
});

// ── GET /api/daily/leaderboard ────────────────────────────────────────────────
// Top users by total correct picks across all resolved daily matchups.
router.get("/daily/leaderboard", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      userId: dailyPicksTable.userId,
      correct: sql<number>`sum(case when ${dailyPicksTable.pickedSide} = ${dailyMatchupsTable.winnerSide} then 1 else 0 end)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(dailyPicksTable)
    .innerJoin(
      dailyMatchupsTable,
      and(
        eq(dailyPicksTable.date, dailyMatchupsTable.date),
        eq(dailyPicksTable.matchupId, dailyMatchupsTable.matchupId),
      ),
    )
    .where(sql`${dailyMatchupsTable.winnerSide} IS NOT NULL`)
    .groupBy(dailyPicksTable.userId)
    .orderBy(
      // Deterministic tie-breakers: correct DESC → accuracy DESC → userId ASC.
      desc(
        sql`sum(case when ${dailyPicksTable.pickedSide} = ${dailyMatchupsTable.winnerSide} then 1 else 0 end)`,
      ),
      desc(
        sql`sum(case when ${dailyPicksTable.pickedSide} = ${dailyMatchupsTable.winnerSide} then 1 else 0 end)::float / nullif(count(*), 0)`,
      ),
      dailyPicksTable.userId,
    )
    .limit(20);

  res.json({ leaders: rows });
});

// ── GET /api/me/daily ─────────────────────────────────────────────────────────
// Personal daily history for the signed-in user. With 10 picks/day, "streak"
// is a DAILY streak — number of consecutive days where the user went perfect
// on all of their RESOLVED picks for that day. Days with no resolved picks
// are skipped (don't extend or break the streak), so unresolved matchups
// don't punish active players who picked while verdicts were still pending.
router.get("/me/daily", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const rows = await db
    .select({
      date: dailyPicksTable.date,
      matchupId: dailyPicksTable.matchupId,
      pickedSide: dailyPicksTable.pickedSide,
      winnerSide: dailyMatchupsTable.winnerSide,
      createdAt: dailyPicksTable.createdAt,
    })
    .from(dailyPicksTable)
    .innerJoin(
      dailyMatchupsTable,
      and(
        eq(dailyPicksTable.date, dailyMatchupsTable.date),
        eq(dailyPicksTable.matchupId, dailyMatchupsTable.matchupId),
      ),
    )
    .where(eq(dailyPicksTable.userId, userId))
    .orderBy(desc(dailyPicksTable.date), desc(dailyPicksTable.createdAt))
    .limit(500);

  // Aggregate per-day totals so a single bad pick on a day breaks that day's
  // perfect run, but partial days (some picks not yet resolved) don't lie
  // about how the user did.
  const byDate = new Map<string, { resolvedPicks: number; correct: number }>();
  let totalCorrect = 0;
  let totalResolved = 0;
  for (const r of rows) {
    if (r.winnerSide === null) continue;
    totalResolved += 1;
    const isCorrect = r.pickedSide === r.winnerSide;
    if (isCorrect) totalCorrect += 1;
    const cur = byDate.get(r.date) ?? { resolvedPicks: 0, correct: 0 };
    cur.resolvedPicks += 1;
    if (isCorrect) cur.correct += 1;
    byDate.set(r.date, cur);
  }
  const datesDesc = [...byDate.keys()].sort().reverse();
  let currentStreak = 0;
  let longestStreak = 0;
  let running = 0;
  let streakBroken = false;
  for (const date of datesDesc) {
    const day = byDate.get(date)!;
    if (day.resolvedPicks === 0) continue;
    const perfect = day.correct === day.resolvedPicks;
    if (perfect) {
      running += 1;
      if (!streakBroken) currentStreak = running;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
      streakBroken = true;
    }
  }
  // Pick-streak: consecutive correct picks across all time, regardless of day.
  // `currentPickStreak` walks rows newest-first (rows are already ordered desc
  // by date then desc by createdAt) and counts correct picks until the first
  // wrong one. Unresolved picks are skipped so they neither extend nor break it.
  // `longestPickStreak` walks chronologically (oldest-first) tracking max run.
  let currentPickStreak = 0;
  for (const r of rows) {
    if (r.winnerSide === null) continue;
    if (r.pickedSide === r.winnerSide) currentPickStreak += 1;
    else break;
  }
  let longestPickStreak = 0;
  let runPick = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const r = rows[i]!;
    if (r.winnerSide === null) continue;
    if (r.pickedSide === r.winnerSide) {
      runPick += 1;
      if (runPick > longestPickStreak) longestPickStreak = runPick;
    } else {
      runPick = 0;
    }
  }
  res.json({
    totalPicks: rows.length,
    resolvedPicks: totalResolved,
    correct: totalCorrect,
    currentStreak,
    longestStreak,
    currentPickStreak,
    longestPickStreak,
    recent: rows.slice(0, 20).map((r) => ({
      date: r.date,
      matchupId: r.matchupId,
      pickedSide: r.pickedSide,
      winnerSide: r.winnerSide,
    })),
  });
});

export default router;
