# A.v.A — Anyone vs Anyone

**Live (production):** https://AnyoneVsAnyone.replit.app

## Overview

A mobile-friendly web app where users pick two teams of fictional characters and simulate dramatic round-by-round AI fight narratives. Includes a character database, daily matchups, tournaments, fight history, PvP challenge links, and the ability to add new characters.

## Stack

- **Monorepo**: pnpm workspaces · Node 24 · TypeScript 5.9
- **Frontend**: React + Vite (`artifacts/fight-club`), Tailwind CSS v4, Radix UI, wouter
- **API**: Express 5 (`artifacts/api-server`)
- **DB**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval from OpenAPI spec
- **Build**: esbuild

## Features

- **Arena**: pick up to 5 characters per team, simulate fights with cinematic, phase-based AI narratives driven by each character's `v3Profile`. Tier-calibrated outcomes (Cosmic → Street) on exponential 0–10M power stats; stronger always wins (unless Upset Mode).
- **Roster**: 956+ characters across 104+ universes (incl. 100 Historical figures). Add/delete characters; universe breakdown stats; character leaderboard.
- **Daily lineup**: 25 curated matchups posted at midnight ET (DST-aware). Selection is a *varied* daily mix with a day-of-week spotlight theme. Pool + theme classification live in `artifacts/api-server/src/lib/dailyPool.ts` and `dailyThemes.ts`; classification is baked-in (no runtime DB lookups). `GET /api/daily` returns `{ theme, matchups }`. To add a matchup: append to `DAILY_POOL` **and** add an `ENTRY_THEMES[id]` entry (omitted entries fall to wildcard-only).
- **Canonical daily replay**: everyone who picks a daily matchup sees the SAME fight (`daily_matchups.fight_id` + `generating_at` claim-lock; daily requests force `modifierId=null`, `upset=false`).
- **WHY? breakdown**: on resolved+picked daily matchups, an inline panel shows the cached Stage-1 verdict (cache-only, zero AI cost). Spoiler-gated to a TODAY pick row for that matchup.
- **Perfect-day badge & share**: client-side gold banner + 1080×1350 PNG share when a signed-in user goes perfect on the day.
- **Tournament Mode** (`/tournaments`, "Cup" tab): "Draft vs CPU" snake draft — you and the CPU alternate picks, then the bracket auto-runs with the **deterministic** engine (no per-match AI). Bracket sizes **8 / 16 / 32**. "Watch" any match replays the identical winner. Extras: running win/loss record + streak vs CPU (localStorage), draft grades (S–D) + "steal of the draft", and upset badges. Old non-draft cups still render.
- **PvP Challenge Links**: CHALLENGE creates a shareable 6-char code; both players see the same synced narrative. **Blind Pick** variant hides the challenger's team until the opponent locks in.
- **Ghost-hand tutorial**: first-run choreography in `ghost-hand-tutorial.tsx` (pick champion → synergy partner → nemesis → modifier chip → FIGHT), with `autoStartNarration` on the first staged fight.
- **Developer Legends (Betrayal Protocol)**: Chris Henry & Troy Wilson seeded at max stats; on opposing Arena teams the AI makes them refuse to fight and betray their partners. Barred from tournaments.

## Invariants & non-obvious constraints

- **Daily lineup stability**: once a date has any rows in `daily_matchups`, those rows ARE the canonical lineup for that date even if `DAILY_POOL` is later edited. `ensureDailyRows` returns rows by serial PK (insertion order), never by recomputing the shuffle; `POST /api/daily/pick` validates against materialized rows. Appending to the pool never reshuffles existing dates.
- **Verdict-only cache**: `fightCacheTable` stores who wins + the resolution brief, keyed by canonical sorted team IDs, so rematches end the same way (unless Upset Mode). The **narrative is always regenerated** — variety is intentional. (The legacy `narrative` jsonb column is no longer read/written.)
- **Daily rollover**: midnight ET via `getDailyDateString` / `msUntilNextDailyRollover` (tries EDT/EST offsets, DST-correct).

## AI Narrative (OpenAI via Replit proxy)

- Uses `@workspace/integrations-openai-ai-server`. Model: **`gpt-5-mini` with `stream: true`** — streaming is REQUIRED (non-streaming returns empty content).
- **`max_completion_tokens` must be 8192** — the proxy rejects lower limits with `finish_reason: length` + empty body.
- Format: `=== ARENA ===` intro + `=== ROUND N ===` sections, parsed by regex. Rounds capped at 6–8. Falls back to template narratives on timeout/error.
- Generation is parallelized (Call A: setting/entrance/first-half rounds; Call B: second-half + result + why-won) and streamed over SSE (`POST /api/fights/stream`) with section + token-level `delta` events. Frontend consumes via `useSimulateFightStream` (fetch + ReadableStream). Round reveal is user-driven ("Begin Match" → "Next Round" → winner), gated on `completedSections`.
- **PvP challenge sync**: `challengesTable.fightId` + `generatingAt` claim-lock so both players get one shared narrative; loser of the claim polls for `fight_id`, then replays. `fightsTable.whyWon` persisted for the replay panel.

## Auth (Clerk, optional)

- Provisioned via `setupClerkWhitelabelAuth`. Env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`. Prod-only proxy middleware in `clerkProxyMiddleware.ts`.
- API: `clerkMiddleware()` in `app.ts`. Helpers in `src/lib/auth.ts` — `getOptionalUserId` (guest-permissive) and `requireAuth` (401 for guests).
- Guests still write (`userId` stays null). Personal endpoints (signed-in only): `GET /api/me/fights`, `GET /api/me/stats`. `/profile` page shows stats + favorites + recent matches.
- **Vite gotcha**: `tailwindcss({ optimize: false })` + `@layer theme, base, clerk, components, utilities;` declared in `index.css` before the tailwind import so Clerk's stylesheet wins inside our shell.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from OpenAPI
- `pnpm --filter @workspace/db run migrate` — apply drizzle migrations (dev & prod)
- `pnpm --filter @workspace/db run push` — force-push schema without migrations (emergency/dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle schemas (characters, fights, tournaments, …)
- `artifacts/api-server/src/routes/` — API routes
- `artifacts/api-server/src/lib/fightSimulator.ts` — fight simulation logic
- `artifacts/fight-club/src/` — React frontend

## Parked features

- **Wager Mode** (virtual coins, play money only): fully built but hidden — `/wager` route + nav tab are commented out in `App.tsx`/`layout.tsx` (nav back to `grid-cols-3`); page/backend/schema remain. Settlement is intentionally a **probabilistic roll** (favorite wins at its implied win rate, 8% house margin) to kill the "back the guaranteed winner" exploit. To revive: uncomment the import + route in `App.tsx`, the nav item in `layout.tsx`, bump nav to `grid-cols-4`.

## Notes

- `lib/api-spec/orval.config.ts` omits the `schemas` option; codegen script patches `lib/api-zod/src/index.ts` afterward to avoid duplicate-export conflicts. Don't change the OpenAPI `info.title` (it controls generated filenames).
- `lib/db/drizzle.config.ts` uses relative paths so `drizzle-kit generate` resolves the snapshot file correctly.
