---
name: Drizzle migrations are hand-authored
description: How to add a DB migration in this repo — drizzle-kit generate is broken, write SQL + journal by hand.
---

# Drizzle migrations: hand-author, don't generate

`drizzle-kit generate` is broken in this repo (snapshot collision — it errors instead
of emitting a new migration). The team hand-authors every migration.

**How to add a migration:**
1. Edit/add the Drizzle schema in `lib/db/src/schema/` and export it from `lib/db/src/schema/index.ts`.
2. Hand-write the SQL file `lib/db/drizzle/NNNN_<name>.sql` (next index). Make it idempotent
   (e.g. `CREATE TABLE IF NOT EXISTS`) so it's safe to re-run.
3. Add a matching entry to `lib/db/drizzle/meta/_journal.json` (increment `idx`).
4. Apply with `pnpm --filter @workspace/db run migrate` (NOT `push`, except dev emergencies).

**Why:** generate's snapshot diff collides and aborts, so a clean generated migration
can't be produced. Manual SQL + journal entry is the supported path. Post-merge, the
reconciliation step runs `migrate` — that's the real production deploy path for schema
changes, so the hand-written SQL must stand on its own.
