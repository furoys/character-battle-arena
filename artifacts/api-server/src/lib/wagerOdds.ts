// ── Wager Mode economy + odds math (VIRTUAL coins only) ───────────────────────
// All values are play money. No real currency is ever involved.

export const WAGER_STARTING_BALANCE = 1000; // seed balance for a new wallet
export const WAGER_DAILY_DROP = 500; // coins granted by the once-per-day drop
export const WAGER_MIN_STAKE = 10; // smallest allowed bet
export const WAGER_MAX_STAKE = 1_000_000; // largest allowed single bet (bounds payout < int4 max)
export const WAGER_HOUSE_MARGIN = 0.08; // 8% margin shaved off fair odds

// Map a deterministic fight difficulty to the winner's implied win rate %.
// Mirrors fights.ts / tournaments.ts difficultyToWinRate so odds agree with the
// rest of the app.
export function difficultyToWinRate(difficulty: string): number {
  if (difficulty === "easy") return 90;
  if (difficulty === "moderate") return 72;
  if (difficulty === "hard") return 57;
  return 75;
}

// Clamp a win probability into a bettable 1-99 range.
export function clampWinProb(pct: number): number {
  return Math.min(99, Math.max(1, Math.round(pct)));
}

// Decimal payout odds for a given implied win probability (percent). Fair odds
// would be 100/p; we shave the house margin off the *profit* portion so the
// favorite and underdog are both priced consistently. Returns decimal odds
// (e.g. 1.85 means a winning 100-coin bet returns 185 gross).
export function oddsForWinProb(winProbPct: number): number {
  const p = clampWinProb(winProbPct);
  const fair = 100 / p;
  const odds = 1 + (fair - 1) * (1 - WAGER_HOUSE_MARGIN);
  return Math.max(1.01, odds);
}

// Convert decimal odds to integer basis points (decimal odds × 10000) for
// lossless storage.
export function oddsToBp(odds: number): number {
  return Math.round(odds * 10000);
}

// Locked odds (basis points) for a side, straight from its win probability.
export function oddsBpForWinProb(winProbPct: number): number {
  return oddsToBp(oddsForWinProb(winProbPct));
}

// Gross coins returned for a winning bet at the given locked odds.
export function payoutFor(stake: number, oddsBp: number): number {
  return Math.floor((stake * oddsBp) / 10000);
}
