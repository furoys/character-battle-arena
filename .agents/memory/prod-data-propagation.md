---
name: Propagating character/roster data to production
description: How character data added in dev reaches the prod DB (it is NOT via publish) for the A.v.A app.
---

# Getting roster/character data into production

Publishing only migrates the **schema** to prod — it does **not** copy table data
(rows added in dev stay in dev). Production `executeSql` is **read-only** (a replica),
so you cannot write to the prod DB directly.

The app's intended mechanism: `seedNewChars()` (in `artifacts/api-server/src/lib/seedNewChars.ts`)
runs on **API-server startup** and does a "full-roster sync" — for each entry in
`charactersFullDump.json` it inserts by **name** if missing from the local DB.
It is **insert-only**: it never updates or deletes already-present rows (aside from a
few hardcoded one-off cleanups).

**To push new characters to prod:** regenerate `charactersFullDump.json` from the
current dev DB (script: `pnpm --filter @workspace/scripts run regen-full-dump`,
exports all `archived=0` rows in the dump's camelCase shape), then **deploy** — prod
self-syncs the missing characters on boot.

**Why:** there is no first-class dev→prod data sync; this dump+deploy path is the
designed propagation route (there's a code comment to that effect).

**How to apply / gotchas:**
- Archived rows are excluded from the dump → prod never receives them (= effectively removed in prod).
- Insert-by-name means **edits to existing prod rows do NOT propagate** (no update path). Only brand-new names get added.
- Portrait files live in `artifacts/fight-club/public/characters/` and ship with the
  frontend build — verify referenced `imageUrl` files exist AND are git-tracked, or prod images 404.
- No DB uniqueness on `name`; rely on the existing-name check, avoid introducing case/spacing variants.
