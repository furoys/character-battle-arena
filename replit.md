# Fictional Fight Club

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

- Browse a roster of 12+ pre-seeded fictional characters (Superman, Goku, Thor, etc.)
- Select up to 5 characters per team (Team 1 and Team 2)
- Simulate fight with round-by-round narrative outcomes and animated health bars
- View fight history
- Add new characters with a full stats form (strength, speed, intelligence, durability 1-100)
- Delete characters from the roster
- Universe breakdown stats summary

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

## Notes

- `lib/api-spec/orval.config.ts` — removed the `schemas` option to avoid TypeScript duplicate export conflicts
- `lib/api-spec/package.json` codegen script patches `lib/api-zod/src/index.ts` after orval runs to fix the export conflict
