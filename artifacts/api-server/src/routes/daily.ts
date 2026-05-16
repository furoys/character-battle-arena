import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  dailyMatchupsTable,
  dailyPicksTable,
  fightCacheTable,
} from "@workspace/db";
import { getOptionalUserId, requireAuth } from "../lib/auth";
import {
  DAILY_POOL,
  getDailyDateString,
  getDailyMatchupForDate,
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

// Ensure the daily_matchups row exists for `date`. Picks the deterministic
// matchup from DAILY_POOL on the first call of the day.
async function ensureDailyRow(date: string) {
  const existing = await db
    .select()
    .from(dailyMatchupsTable)
    .where(eq(dailyMatchupsTable.date, date))
    .limit(1);
  if (existing[0]) return existing[0];
  const pick = getDailyMatchupForDate(date);
  // Insert with ON CONFLICT DO NOTHING so racing requests at midnight don't
  // both crash trying to create the row.
  await db
    .insert(dailyMatchupsTable)
    .values({ date, matchupId: pick.id })
    .onConflictDoNothing();
  const [row] = await db
    .select()
    .from(dailyMatchupsTable)
    .where(eq(dailyMatchupsTable.date, date));
  return row!;
}

// Try to resolve winnerSide by reading the fight verdict cache. If the cache
// row exists, copy the winner into the daily_matchups row. Idempotent — safe
// to call on every GET.
async function tryResolveWinner(
  date: string,
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
    .where(eq(dailyMatchupsTable.date, date));
  return winnerSide;
}

// ── GET /api/daily ────────────────────────────────────────────────────────────
// Returns today's matchup + the caller's pick (if signed in) + community split
// + resolved winner (if any). Open to guests — they just don't get `userPick`.
router.get("/daily", async (req, res): Promise<void> => {
  const date = getDailyDateString();
  const row = await ensureDailyRow(date);
  const pool = DAILY_POOL.find((p) => p.id === row.matchupId);
  if (!pool) {
    // Pool drifted — rare, but don't 500. Reset the row to the canonical
    // pick for the date so the user sees the right matchup on next load.
    const fallback = getDailyMatchupForDate(date);
    await db
      .update(dailyMatchupsTable)
      .set({ matchupId: fallback.id, winnerSide: null, resolvedAt: null })
      .where(eq(dailyMatchupsTable.date, date));
    res.status(503).json({ error: "Daily matchup unavailable" });
    return;
  }

  // Lazy verdict resolution from the fight cache.
  const winnerSide = await tryResolveWinner(
    date,
    pool.team1Ids,
    pool.team2Ids,
    row.winnerSide,
  );

  // Caller's pick (only if signed in).
  const userId = getOptionalUserId(req);
  let userPick: number | null = null;
  if (userId) {
    const [pick] = await db
      .select()
      .from(dailyPicksTable)
      .where(
        and(eq(dailyPicksTable.date, date), eq(dailyPicksTable.userId, userId)),
      )
      .limit(1);
    if (pick) userPick = pick.pickedSide;
  }

  // Community split (counts only — no PII).
  const splitRows = await db
    .select({
      side: dailyPicksTable.pickedSide,
      count: sql<number>`count(*)::int`,
    })
    .from(dailyPicksTable)
    .where(eq(dailyPicksTable.date, date))
    .groupBy(dailyPicksTable.pickedSide);
  const team1Count = splitRows.find((r) => r.side === 1)?.count ?? 0;
  const team2Count = splitRows.find((r) => r.side === 2)?.count ?? 0;

  res.json({
    date,
    matchupId: pool.id,
    title: pool.title,
    hook: pool.hook,
    team1Ids: pool.team1Ids,
    team2Ids: pool.team2Ids,
    userPick,
    winnerSide,
    team1Count,
    team2Count,
  });
});

// ── POST /api/daily/pick ──────────────────────────────────────────────────────
// Lock a pick for today. Requires sign-in. One pick per user per day.
router.post("/daily/pick", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const { side } = req.body as { side?: unknown };
  if (side !== 1 && side !== 2) {
    res.status(400).json({ error: "side must be 1 or 2" });
    return;
  }
  const date = getDailyDateString();
  const row = await ensureDailyRow(date);

  // Hard-stop: once the verdict is known (either pre-stored on the row, or
  // already present in the fight cache), picks are closed. Otherwise users
  // could wait for the result to publish via GET /api/daily and then submit
  // a guaranteed-correct pick to inflate streaks and the leaderboard.
  const pool = DAILY_POOL.find((p) => p.id === row.matchupId);
  let winnerSide = row.winnerSide;
  if (winnerSide === null && pool) {
    winnerSide = await tryResolveWinner(date, pool.team1Ids, pool.team2Ids, null);
  }
  if (winnerSide !== null) {
    res.status(409).json({ error: "Picks closed — verdict already revealed" });
    return;
  }

  // Insert; ignore if a pick already exists (locked).
  await db
    .insert(dailyPicksTable)
    .values({ date, userId, pickedSide: side })
    .onConflictDoNothing();

  const [pick] = await db
    .select()
    .from(dailyPicksTable)
    .where(
      and(eq(dailyPicksTable.date, date), eq(dailyPicksTable.userId, userId)),
    )
    .limit(1);
  res.json({ pickedSide: pick?.pickedSide ?? side });
});

// ── GET /api/daily/leaderboard ────────────────────────────────────────────────
// Top users by total correct picks across all resolved daily matchups. Open
// to everyone (just a list of userIds + counts — Clerk usernames are looked
// up client-side or via /api/me).
router.get("/daily/leaderboard", async (_req, res): Promise<void> => {
  // Join picks against resolved matchups, count where pickedSide === winnerSide.
  const rows = await db
    .select({
      userId: dailyPicksTable.userId,
      correct: sql<number>`sum(case when ${dailyPicksTable.pickedSide} = ${dailyMatchupsTable.winnerSide} then 1 else 0 end)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(dailyPicksTable)
    .innerJoin(
      dailyMatchupsTable,
      eq(dailyPicksTable.date, dailyMatchupsTable.date),
    )
    .where(sql`${dailyMatchupsTable.winnerSide} IS NOT NULL`)
    .groupBy(dailyPicksTable.userId)
    .orderBy(
      // Deterministic tie-breakers: correct DESC → accuracy DESC → userId ASC.
      // Without these, ranking among users tied on `correct` is nondeterministic
      // across queries (Postgres can return them in any order).
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
// Personal daily history for the signed-in user. Used for the streak counter
// + "Your Stats" tile on the daily page.
router.get("/me/daily", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const rows = await db
    .select({
      date: dailyPicksTable.date,
      pickedSide: dailyPicksTable.pickedSide,
      winnerSide: dailyMatchupsTable.winnerSide,
    })
    .from(dailyPicksTable)
    .innerJoin(
      dailyMatchupsTable,
      eq(dailyPicksTable.date, dailyMatchupsTable.date),
    )
    .where(eq(dailyPicksTable.userId, userId))
    .orderBy(desc(dailyPicksTable.date))
    .limit(60);

  // Compute streak (consecutive correct from most-recent resolved entry).
  let currentStreak = 0;
  let longestStreak = 0;
  let running = 0;
  let correct = 0;
  let resolved = 0;
  let streakBroken = false;
  for (const r of rows) {
    if (r.winnerSide === null) continue;
    resolved += 1;
    const isCorrect = r.pickedSide === r.winnerSide;
    if (isCorrect) {
      running += 1;
      correct += 1;
      if (!streakBroken) currentStreak = running;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
      streakBroken = true;
    }
  }
  res.json({
    totalPicks: rows.length,
    resolvedPicks: resolved,
    correct,
    currentStreak,
    longestStreak,
    recent: rows.slice(0, 14),
  });
});

export default router;
