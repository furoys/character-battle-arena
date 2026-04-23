# A.v.A — Anyone vs Anyone

## Overview

A mobile-friendly web app where users pick two teams of fictional characters and simulate dramatic round-by-round fight outcomes. Includes a character database, fight history, and the ability to add new characters.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/fight-club), with Tailwind CSS v4 and Radix UI
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Features

- Browse a roster of 956+ characters from 104+ universes (includes all 45 US presidents + 55 other Historical figures = 100 Historical characters)
- Select up to 5 characters per team (Team 1 and Team 2)
- Simulate fights with cinematic AI narratives — phase-based (opening/escalation/turning point/finish) driven by each character's v3Profile (abilities, weapons, gadgets, combatStyle, battleIQ, temperament, finishers)
- Tier-calibrated outcomes (Cosmic → Street) using exponential 0-10M power stats; stronger always wins
- v3Profile jsonb column populated for 633/735 characters from PDF roster v3
- AI narrative follows user's cinematic spec: SETTING / ENTRANCE / FIGHT PHASES / RESULT / WHY THEY WON
- WHY THEY WON uses AI-generated text (5 parsed sentences), falls back to stat-computed bullets if AI returns nothing
- Re-read full match feature in History tab — expands round-by-round narrative with arenaIntro and intro text
- FAVES pill is on its own pinned row above the scrollable universe filter pills (won't get scrolled out)
- Debate Room has a "Developer Legends" tab featuring Chris Henry & Troy Wilson with the Betrayal Protocol matchup
- Developer Legends: Chris Henry and Troy Wilson are seeded at max stats (99999 all stats). When on opposing teams, the AI override makes them refuse to fight each other and brutally betray their partners to win together
- View fight history; add/delete characters; universe breakdown stats; character leaderboard
- **PvP Challenge Links**: CHALLENGE button on home page (next to FIGHT/RANDOM) creates a shareable 6-char code. Creator sees a share box + waiting screen (`/challenge/<code>?creator=1`). Opponent opens the plain URL, picks their team, and clicks ACCEPT & FIGHT
- **Blind Pick**: same flow but challenger's team is hidden (shown as ??? silhouettes) until opponent locks in — then both teams reveal and the fight auto-starts after a 1.6s reveal flash

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run migrate` — apply drizzle migration files (dev & prod)
- `pnpm --filter @workspace/db run push` — force-push schema without migrations (emergency/dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/characters.ts` — Characters table
- `lib/db/src/schema/fights.ts` — Fights history table
- `artifacts/api-server/src/routes/characters.ts` — Characters CRUD routes
- `artifacts/api-server/src/routes/fights.ts` — Fight simulation routes
- `artifacts/api-server/src/lib/fightSimulator.ts` — Fight simulation logic
- `artifacts/fight-club/src/` — React frontend

## AI Narrative (OpenAI via Replit proxy)

- Uses `@workspace/integrations-openai-ai-server` (OpenAI SDK configured with `AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY`)
- Model: `gpt-5-mini` with `stream: true` — streaming is REQUIRED; non-streaming requests return empty content
- `max_completion_tokens` must be 8192 — proxy rejects lower limits with `finish_reason: length` + empty body
- Format: `=== ARENA ===` intro + `=== ROUND N ===` sections parsed by regex in `generateAINarrative()`
- Fight rounds capped at 6–8 to keep AI generation under 80 seconds
- Falls back to template-based narratives if AI times out or errors
- Narrative generation is parallelized for fights with 3+ rounds: Call A writes SETTING + ENTRANCE + first half of rounds; Call B writes second half + RESULT + WHY THEY WON. Both calls share the same character profiles, locked verdict, resolution brief, and HP timeline. Each is wrapped in PARTIAL OUTPUT MODE framing so the model emits only the requested sections starting with the first === marker. Outputs are concatenated; existing parseSections (first-wins on duplicates) merges them. Roughly 25–40% wall-clock reduction with no quality change.
- SSE streaming endpoint `POST /api/fights/stream` emits sections as they finish (init → section per `=== MARKER ===` block → complete). `aiTextWithTimeout` accepts an `onDelta` callback; `makeSectionStreamer` watches the streaming buffer via `parseSections` and fires `onSection(name, content)` as soon as the next marker appears (one-ahead boundary detection). The frontend consumes via `useSimulateFightStream` (fetch + ReadableStream — `EventSource` can't POST); result builds progressively and `FightScreen.revealOne` polls every 200ms for the next round's narrative, with a watchdog that bypasses the wait once `result.id !== -1` (complete event arrived → server fallbacks guaranteed). Same gpt-4o, same prompts, same parallel split — perceived time drops from ~50s of spinner → first content in 6–10s.
- PvP challenge sync: when a fight is part of a challenge (request includes `challengeCode`), both players see the **same** narrative instead of independently generating different ones. Mechanism: `challengesTable` has `fightId` (nullable int) and `generatingAt` (nullable timestamp). On `POST /api/fights/stream` with a `challengeCode`: (1) if `challenge.fightId` is set → instantly emit `init`+`complete` from `fightsTable[fightId]`. (2) Otherwise try atomic claim — `UPDATE challenges SET generating_at=NOW() WHERE code=? AND fight_id IS NULL AND (generating_at IS NULL OR generating_at < NOW()-120s)`. (3) Whoever wins the claim runs the normal AI stream and writes `fight_id` back when the fight row is persisted. (4) Whoever loses the claim polls every 1.5s for `fight_id` to appear (max 120s), then replays. Stale-lock recovery means a crashed/aborted generation doesn't deadlock the challenge. `fightsTable.whyWon` (jsonb) was added so the replay path can show the same "Why They Won" panel — previously only `summary`/`rounds`/`arenaIntro`/`intro` were persisted. The frontend hook needs no changes; it already treats `complete` as canonical and fills the UI immediately on the replay path.
- Verdict-only cache: `fightCacheTable` stores who wins (and the resolution brief — difficulty, fightType, keyFactors, turningPoint, loserShowcase, winnerProof) keyed by canonical sorted team IDs, so rematches between the same characters always end the same way unless Upset Mode is on. The narrative itself is **always regenerated** on every fight so each one reads as a unique story — variety is the whole point. (An earlier experiment cached the full narrative payload for sub-100ms rematches, but it was reverted because users want every fight to feel new. The `narrative` jsonb column on `fightCacheTable` is still present from that experiment but is no longer read or written.)
- Token-level streaming: `makeSectionStreamer` also accepts an optional `onSectionDelta(name, append)` callback that fires per AI chunk for the currently in-progress section, with trailing partial markers (`=== ROU…`) stripped. The SSE route emits these as `delta` events; the hook accumulates per-section live buffers and flushes via `requestAnimationFrame` (~60fps cap) so the UI types out narrative as the AI writes it. `WHY THEY WON` skips delta streaming since it parses into a numbered list. The canonical `section` event still fires at marker boundaries and overwrites whatever the deltas built. With this on, ROUND 1 starts appearing at ~15s instead of being dropped as a wall of text at ~43s — same total time, same content, dramatically less static screen time.
- Loader→narrative handoff: the hook exposes a `streaming` flag (true on first delta or section), and `home.tsx` uses `isPending && !streaming` for `isSimulating` so the cinematic FightLoadingSequence keeps playing all the way until real text starts arriving — no more static gap between init (~7s) and first text chunk (~12s). The 7 phases tick every 1400ms (was 3200ms) so they all play through within the typical pre-text window, and the last phase holds rather than looping.
- Round reveal pacing: `scheduleNarrativePause` was tightened from 400/1400/1900/1400ms to 250/900/550ms (turning point still gets the extra beat), so the auto-reveal stagger doesn't feel baggy when text is already in the buffer. The reveal loop also got a defensive watchdog: it always polls 150ms for the round's narrative to be present, but if the stream has been complete for >2.5s and a round is still empty, it reveals anyway so the UI cannot strand on an empty box.
- Manual round progression: the auto-reveal loop was replaced with a user-controlled flow. After SETTING + COMBATANTS ENTER finish streaming, a "Begin Match →" button appears. Clicking it reveals Round 1; once that round's narrative is fully complete, a "Next Round →" button appears below it; repeat for each round. After the last round's narrative is complete (and `whyWon`/summary have arrived), the winner reveal banner becomes available. The hook tracks `completedSections: Set<string>` (UPPERCASE section names that have received their canonical `section` event, plus all of them on `complete` for cache-hit safety), and FightScreen uses that set to decide when each gating button is allowed to render — buttons never appear mid-stream. "Skip" stays in the bottom bar throughout the fight and jumps straight to the winner banner; it's hidden once the banner is showing (nothing left to skip).

## Notes

- `lib/api-spec/orval.config.ts` — removed the `schemas` option to avoid TypeScript duplicate export conflicts
- `lib/api-spec/package.json` codegen script patches `lib/api-zod/src/index.ts` after orval runs to fix the export conflict
