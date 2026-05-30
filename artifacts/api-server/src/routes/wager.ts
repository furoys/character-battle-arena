import { Router, type IRouter, type Request } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import {
  db,
  charactersTable,
  fightCacheTable,
  walletsTable,
  wagersTable,
  type Character,
} from "@workspace/db";
import { QuoteWagerBody, PlaceWagerBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getDailyDateString } from "../lib/dailyPool";
import { resolveFightVerdict } from "../lib/fightSimulator";
import {
  WAGER_STARTING_BALANCE,
  WAGER_DAILY_DROP,
  WAGER_MIN_STAKE,
  WAGER_MAX_STAKE,
  difficultyToWinRate,
  clampWinProb,
  oddsBpForWinProb,
  payoutFor,
} from "../lib/wagerOdds";

const router: IRouter = Router();

function userIdOf(req: Request): string {
  return (req as Request & { userId: string }).userId;
}

// ── Cache key helper (mirrors fights.ts / tournaments.ts getCacheKey) ─────────
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

// Fetch characters for a list of ids, preserving the caller's ordering. Returns
// null if any id is missing so the route can 400 cleanly.
async function loadTeam(ids: number[]): Promise<Character[] | null> {
  const unique = Array.from(new Set(ids));
  const rows = await db
    .select()
    .from(charactersTable)
    .where(inArray(charactersTable.id, unique));
  const byId = new Map(rows.map((c) => [c.id, c]));
  const ordered: Character[] = [];
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) return null;
    ordered.push(c);
  }
  return ordered;
}

// Resolve the deterministic verdict for a matchup, reading/writing the shared
// fightCacheTable so the wager agrees with any prior or future fight of the same
// teams (and a later cinematic replay shows the IDENTICAL winner). Returns the
// winner side (1 = team1, 2 = team2) plus per-side implied win probabilities and
// a short blurb.
async function resolveVerdict(
  team1: Character[],
  team2: Character[],
): Promise<{
  winnerSide: 1 | 2;
  team1WinProb: number;
  team2WinProb: number;
  turningPoint: string;
}> {
  const t1Ids = team1.map((c) => c.id);
  const t2Ids = team2.map((c) => c.id);
  const { cacheKey, teamAIsTeam1 } = getCacheKey(t1Ids, t2Ids);

  const [existing] = await db
    .select()
    .from(fightCacheTable)
    .where(eq(fightCacheTable.cacheKey, cacheKey))
    .limit(1);

  if (existing) {
    const winnerSide: 1 | 2 =
      (existing.winnerTeam === 1 && teamAIsTeam1) ||
      (existing.winnerTeam === 2 && !teamAIsTeam1)
        ? 1
        : 2;
    const winnerWinRate = difficultyToWinRate(existing.difficulty);
    const team1WinProb = winnerSide === 1 ? winnerWinRate : 100 - winnerWinRate;
    return {
      winnerSide,
      team1WinProb: clampWinProb(team1WinProb),
      team2WinProb: clampWinProb(100 - team1WinProb),
      turningPoint: existing.turningPoint,
    };
  }

  const { winner, resolution } = resolveFightVerdict(team1, team2);
  const winnerTeamCanonical = teamAIsTeam1 ? winner : winner === 1 ? 2 : 1;

  try {
    await db.insert(fightCacheTable).values({
      cacheKey,
      teamAIds: teamAIsTeam1 ? t1Ids : t2Ids,
      teamBIds: teamAIsTeam1 ? t2Ids : t1Ids,
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
    // Unique-constraint race — verdict is deterministic, so the stored winner
    // already matches ours.
  }

  const winnerWinRate = difficultyToWinRate(resolution.difficulty);
  const team1WinProb = winner === 1 ? winnerWinRate : 100 - winnerWinRate;
  return {
    winnerSide: winner,
    team1WinProb: clampWinProb(team1WinProb),
    team2WinProb: clampWinProb(100 - team1WinProb),
    turningPoint: resolution.turningPoint,
  };
}

function buildWalletPayload(wallet: typeof walletsTable.$inferSelect) {
  const today = getDailyDateString();
  return {
    balance: wallet.balance,
    currentStreak: wallet.currentStreak,
    bestStreak: wallet.bestStreak,
    canClaimDaily: wallet.lastDailyClaim !== today,
    dailyDropAmount: WAGER_DAILY_DROP,
    lastDailyClaim: wallet.lastDailyClaim,
  };
}

// Lazy-create the wallet row for a user (seed balance) and return it.
async function ensureWallet(userId: string): Promise<typeof walletsTable.$inferSelect> {
  await db
    .insert(walletsTable)
    .values({ userId, balance: WAGER_STARTING_BALANCE })
    .onConflictDoNothing();
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .limit(1);
  return wallet;
}

// ── GET /wager/wallet ─────────────────────────────────────────────────────────
router.get("/wager/wallet", requireAuth, async (req, res): Promise<void> => {
  const userId = userIdOf(req);
  const wallet = await ensureWallet(userId);
  res.json(buildWalletPayload(wallet));
});

// ── POST /wager/claim-daily ─────────────────────────────────────────────────
router.post("/wager/claim-daily", requireAuth, async (req, res): Promise<void> => {
  const userId = userIdOf(req);
  await ensureWallet(userId);
  const today = getDailyDateString();

  const result = await db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId))
      .for("update")
      .limit(1);

    if (wallet.lastDailyClaim === today) {
      return { wallet, claimed: false };
    }

    const [updated] = await tx
      .update(walletsTable)
      .set({
        balance: wallet.balance + WAGER_DAILY_DROP,
        lastDailyClaim: today,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.userId, userId))
      .returning();
    return { wallet: updated, claimed: true };
  });

  const payload = buildWalletPayload(result.wallet);
  res.json({
    claimed: result.claimed,
    balance: payload.balance,
    dailyDropAmount: WAGER_DAILY_DROP,
    canClaimDaily: payload.canClaimDaily,
    lastDailyClaim: payload.lastDailyClaim,
  });
});

// ── POST /wager/quote ─────────────────────────────────────────────────────────
router.post("/wager/quote", requireAuth, async (req, res): Promise<void> => {
  const parsed = QuoteWagerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid matchup" });
    return;
  }
  const { team1: t1Ids, team2: t2Ids } = parsed.data;

  const [team1, team2] = await Promise.all([loadTeam(t1Ids), loadTeam(t2Ids)]);
  if (!team1 || !team2) {
    res.status(400).json({ error: "Unknown character in matchup" });
    return;
  }

  const verdict = await resolveVerdict(team1, team2);
  res.json({
    team1: {
      winProbPct: verdict.team1WinProb,
      oddsBp: oddsBpForWinProb(verdict.team1WinProb),
    },
    team2: {
      winProbPct: verdict.team2WinProb,
      oddsBp: oddsBpForWinProb(verdict.team2WinProb),
    },
    minStake: WAGER_MIN_STAKE,
  });
});

// ── POST /wager/place ─────────────────────────────────────────────────────────
router.post("/wager/place", requireAuth, async (req, res): Promise<void> => {
  const userId = userIdOf(req);
  const parsed = PlaceWagerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid wager" });
    return;
  }
  const { team1: t1Ids, team2: t2Ids, side, stake } = parsed.data;

  if (!Number.isInteger(stake) || stake < WAGER_MIN_STAKE) {
    res.status(400).json({ error: `Minimum stake is ${WAGER_MIN_STAKE} coins` });
    return;
  }
  if (stake > WAGER_MAX_STAKE) {
    res.status(400).json({ error: `Maximum stake is ${WAGER_MAX_STAKE} coins` });
    return;
  }

  const [team1, team2] = await Promise.all([loadTeam(t1Ids), loadTeam(t2Ids)]);
  if (!team1 || !team2) {
    res.status(400).json({ error: "Unknown character in matchup" });
    return;
  }

  await ensureWallet(userId);

  // Resolve the matchup verdict to get the favored side + each side's implied
  // win probability, then lock odds for the picked side BEFORE touching the
  // balance so the payout can't shift mid-settlement.
  //
  // IMPORTANT — why settlement is a probabilistic roll, not the raw verdict:
  // the deterministic engine always crowns the same winner, and the quote
  // exposes which side that is. If the bet simply paid out the deterministic
  // winner, a user could back the favorite every time and print coins forever
  // (the house margin would be meaningless). Instead the bet is a genuine
  // gamble: the favored side wins with probability == its implied win rate, so
  // backing a 72% favorite at ~1.27x is a real risk and the 8% house margin
  // makes every bet slightly -EV, exactly like a real book.
  const verdict = await resolveVerdict(team1, team2);
  const favoredSide = verdict.winnerSide; // deterministic engine's pick
  const favoredWinProb = favoredSide === 1 ? verdict.team1WinProb : verdict.team2WinProb;
  const favoredWins = Math.random() * 100 < favoredWinProb;
  const winnerSide: 1 | 2 = favoredWins ? favoredSide : favoredSide === 1 ? 2 : 1;
  // When the underdog wins the roll, a cinematic replay must show that upset
  // (the engine alone would crown the favorite), so the client passes this
  // flag straight into the fight stream's `upset` option.
  const upset = !favoredWins;

  const pickedWinProb = side === 1 ? verdict.team1WinProb : verdict.team2WinProb;
  const oddsBp = oddsBpForWinProb(pickedWinProb);
  const won = winnerSide === side;
  const payout = won ? payoutFor(stake, oddsBp) : 0;

  const team1Names = team1.map((c) => c.name);
  const team2Names = team2.map((c) => c.name);

  type SettleOutcome =
    | { kind: "ok"; wagerId: number; balance: number; currentStreak: number; bestStreak: number }
    | { kind: "insufficient"; balance: number };

  const outcome = await db.transaction(async (tx): Promise<SettleOutcome> => {
    const [wallet] = await tx
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId))
      .for("update")
      .limit(1);

    if (wallet.balance < stake) {
      return { kind: "insufficient", balance: wallet.balance };
    }

    // Net balance change: lose the stake, gain the gross payout on a win.
    const newBalance = wallet.balance - stake + payout;
    const newCurrentStreak = won ? wallet.currentStreak + 1 : 0;
    const newBestStreak = Math.max(wallet.bestStreak, newCurrentStreak);

    await tx
      .update(walletsTable)
      .set({
        balance: newBalance,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.userId, userId));

    const [inserted] = await tx
      .insert(wagersTable)
      .values({
        userId,
        team1Ids: t1Ids,
        team2Ids: t2Ids,
        team1Names,
        team2Names,
        pickedSide: side,
        // Persist the rolled outcome (which the payout + `won` were settled
        // from), NOT the deterministic favorite — otherwise stored history
        // disagrees with what the user actually won/lost.
        winnerSide,
        stake,
        oddsBp,
        payout,
        status: won ? "won" : "lost",
      })
      .returning();

    return {
      kind: "ok",
      wagerId: inserted.id,
      balance: newBalance,
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
    };
  });

  if (outcome.kind === "insufficient") {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  res.json({
    id: outcome.wagerId,
    won,
    pickedSide: side,
    winnerSide,
    upset,
    stake,
    oddsBp,
    payout,
    newBalance: outcome.balance,
    currentStreak: outcome.currentStreak,
    bestStreak: outcome.bestStreak,
    team1Ids: t1Ids,
    team2Ids: t2Ids,
    team1Names,
    team2Names,
    // The cached blurb describes the deterministic (favorite) outcome, so it
    // only makes sense when the favorite actually won the roll.
    turningPoint: upset ? "" : verdict.turningPoint,
  });
});

// ── GET /wager/wagers ─────────────────────────────────────────────────────────
router.get("/wager/wagers", requireAuth, async (req, res): Promise<void> => {
  const userId = userIdOf(req);
  const rows = await db
    .select()
    .from(wagersTable)
    .where(eq(wagersTable.userId, userId))
    .orderBy(desc(wagersTable.createdAt))
    .limit(50);

  res.json(
    rows.map((r) => ({
      id: r.id,
      team1Names: r.team1Names,
      team2Names: r.team2Names,
      pickedSide: r.pickedSide,
      winnerSide: r.winnerSide,
      stake: r.stake,
      oddsBp: r.oddsBp,
      payout: r.payout,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

export default router;
