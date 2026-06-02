---
name: Tournament-only outcome tweaks must layer on top of the shared verdict cache
description: How to add tournament-specific fight outcome changes (e.g. risk/reward upsets) without polluting Arena fights, and how to keep "watch" replays consistent.
---

# Tournament-only outcome modifications

When a tournament needs an outcome that differs from the raw power verdict
(e.g. risk/reward "Giant Slayer" upsets), do NOT change what the resolver writes
to the shared `fightCacheTable`.

**Rule:** read/compute the raw verdict and read/write the shared cache exactly as
before (favorite wins). Then apply the tournament-only modification *on top* and
NEVER write the modified result back to the cache. Persist a flag (e.g.
`upset: boolean`) on the bracket match JSON instead.

**Why:** `fightCacheTable` is keyed by sorted team composition and is shared with
the Arena. Writing a flipped/forced winner there would make the same matchup
resolve differently in the Arena ("cache pollution"). The threat model and
existing invariants require Arena outcomes to stay deterministic.

**How to replay a flipped winner consistently in "Watch":** reuse the existing
`underdog` modifier (`flipUnderdog: true`). It (a) re-points the engine's
predicted winner to the weaker side and (b) sets `skipCache=true`, so the replay
reproduces the underdog win without ever touching the shared cache. Non-flipped
matches replay with `modifierId: null` (reads the raw cache = same favorite).
Because the base verdict is deterministic (cached or recomputed identically),
the persisted bracket winner and the watch replay agree within a session.

**Gotchas:**
- Only flag an upset when there is a real favorite/underdog gap. Guard with
  `costA !== costB` AND `underdogSide !== rawWinnerSide`; otherwise equal-cost
  matchups produce a side-order-biased "upset" with no actual underdog.
- Make the upset roll deterministic per matchup (hash of the two fighter ids),
  not `Math.random`, so the persisted bracket and any later replay match.
