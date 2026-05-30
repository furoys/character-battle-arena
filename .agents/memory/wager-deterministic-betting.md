---
name: Betting on a deterministic-outcome engine
description: Why Wager Mode settles bets with a probabilistic roll instead of the deterministic fight verdict.
---

# Wager Mode settlement must be a probabilistic roll, not the raw verdict

A.v.A's fight engine is **deterministic** — `resolveFightVerdict(team1, team2)` always
crowns the same winner for a given matchup, and that verdict is cached in
`fightCacheTable`. Wager Mode also exposes per-side win probabilities/odds via
`POST /api/wager/quote` *before* the user bets.

**The trap:** if a bet pays out the deterministic winner, a user can read the quote,
see which side is favored, always back that side, and print coins forever — the house
margin becomes meaningless because the outcome is never actually in doubt. (Caught in
code review of the first Wager Mode implementation.)

**The fix:** settlement is a genuine gamble. The favored side wins with probability
equal to its implied win rate (`Math.random()*100 < favoredWinProb`); the underdog can
win the roll (an "upset"). Odds are priced fairly to that probability with an 8% house
margin, so every bet is slightly −EV. See `artifacts/api-server/src/routes/wager.ts`
(`/wager/place`) and `artifacts/api-server/src/lib/wagerOdds.ts`.

**Why:** any betting game layered on a known/deterministic outcome is exploitable the
moment the odds (or the favored side) are revealed. Betting only works when the outcome
carries real uncertainty.

**How to apply:** when settling the bet must stay visually consistent with the cinematic
replay, persist/return an `upset` flag and pass it as `upset:` into
`useSimulateFightStream`/`POST /api/fights/stream` — `upset:true` makes the engine crown
the underdog, so the watched fight matches the paid-out result. Suppress any cached
favorite-oriented blurb (`turningPoint`) on an upset since it describes the wrong winner.
