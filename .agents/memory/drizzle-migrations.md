---
name: drizzle migrations in this repo
description: How to add a DB migration safely here — generate is broken, migrate is the real deploy mechanism, write idempotent SQL by hand.
---

# Adding a DB schema change

**`drizzle-kit generate` is broken** — `lib/db/drizzle/meta/` has a pre-existing
snapshot collision (multiple snapshots point to the same parent), so generate
aborts. Do NOT rely on it. There is no `generate` npm script either.

**`drizzle-kit migrate` IS the real mechanism.** `scripts/post-merge.sh`
(the reconciliation that runs after every task merge) runs
`pnpm --filter db migrate`. Deploy postBuild does NOT migrate. So a new table
only reaches prod if it has a tracked journal entry + SQL file.

**How to add a migration:**
1. Hand-write `lib/db/drizzle/NNNN_name.sql` using `CREATE TABLE IF NOT EXISTS` /
   `ADD COLUMN IF NOT EXISTS` (idempotent — dev DBs are populated via
   `drizzle-kit push`, so the objects may already exist).
2. Append an entry to `lib/db/drizzle/meta/_journal.json` with an `idx` one higher
   than the last and a `when` (epoch ms) strictly greater than the previous —
   migrate applies entries whose `when` > last-applied `created_at` in
   `drizzle.__drizzle_migrations`. No snapshot file is needed for migrate.
3. Verify: `pnpm --filter @workspace/db run migrate` (safe to re-run — idempotent).

**Why:** `drizzle migrate` replays from the last applied `when`, not from scratch,
so older non-idempotent migrations (e.g. 0000_initial) are never re-run on an
existing DB. Confirmed by checking `drizzle.__drizzle_migrations` row count.

**Gotcha:** journal entries can drift from SQL files — a migration's `.sql` can
exist on disk but be missing from `_journal.json` (it was applied via `push`
during dev and never tracked). Such a migration is silently skipped by
post-merge migrate. When adding a new one, backfill any missing prior entries
(safe because they're `IF NOT EXISTS`).
