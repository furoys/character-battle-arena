---
name: Leaderboard / record scoring integrity
description: How to safely write user-facing competitive records (tournament vs-CPU record, leaderboard) so they can't be forged or corrupted.
---

Any endpoint that writes a competitive aggregate (win/loss record, streak, leaderboard standing) must treat the client as hostile.

**Rule:**
1. Never trust a client-supplied outcome (`won`) or target id alone. Load the underlying entity (the tournament), verify the caller owns/participated in it, verify it's the right mode, and **derive the outcome server-side** from stored state (e.g. the bracket's final-match winner `owner`).
2. Make scoring idempotent with a per-(user, entity) ledger table (composite PK) claimed via `insert … onConflictDoNothing … returning`. "Last id only" dedup is not enough — users can replay distinct past wins to inflate.
3. Wrap the ledger claim **and** the aggregate read-modify-write in one `db.transaction`, and take a per-user row lock (`.for("update")`) on the aggregate row before computing the new streak/totals. Insert-on-conflict-do-nothing the aggregate row first so the lock has a row to take. Without this you get either claim-without-count (crash between the two writes → permanent undercount) or lost updates (concurrent submissions read the same `prev`).

**Why:** A first pass trusted client `won` + `tournamentId`, letting any signed-in user POST `won:true` for arbitrary ids and dominate the public leaderboard. Even after deriving the outcome, non-atomic claim+update and read-modify-write races corrupt streak/wins.

**How to apply:** Whenever adding or editing a record/leaderboard write path in `me.ts` (or any future scoring endpoint), keep all three properties. The streak math is conditional (sign-dependent) so it can't be a pure SQL increment — that's exactly why the row lock is required.
