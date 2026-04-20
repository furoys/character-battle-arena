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

- Browse a roster of 806+ fictional characters from 104+ universes
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

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
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

## Notes

- `lib/api-spec/orval.config.ts` — removed the `schemas` option to avoid TypeScript duplicate export conflicts
- `lib/api-spec/package.json` codegen script patches `lib/api-zod/src/index.ts` after orval runs to fix the export conflict
