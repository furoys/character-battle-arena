# Threat Model

## Project Overview

A.v.A (Anyone vs Anyone) is a pnpm monorepo with a React + Vite frontend in `artifacts/fight-club` and an Express 5 + PostgreSQL/Drizzle API in `artifacts/api-server`. Users can browse characters, run fight simulations, review fight history, and submit fighter suggestions. A lightweight admin flow reviews pending suggestions.

Production scope for security review is the Express API plus the deployed `fight-club` frontend. `artifacts/mockup-sandbox` is a development-only preview environment and should be ignored unless future scans show it is reachable in production. Assume `NODE_ENV=production` in deployed environments, platform TLS terminates traffic correctly, and mockup sandbox is never deployed.

## Assets

- **Admin moderation capability** — the ability to review, approve, reject, create, or delete content. Compromise lets an attacker change site content and moderation outcomes.
- **Application data** — character records, pending suggestions, fight history, cached fight outcomes, and narrative content stored in PostgreSQL.
- **Service availability** — public fight simulation and streaming endpoints can consume database and AI resources; abuse can degrade the app for all users.
- **Application secrets** — `DATABASE_URL`, `ADMIN_PIN`, and OpenAI integration credentials. Exposure would enable database access, privileged moderation, or unauthorized AI usage.

## Trust Boundaries

- **Browser to API** — every client request crosses from an untrusted browser into the Express server. All write operations and privileged reads must be authenticated and authorized server-side.
- **API to PostgreSQL** — the API has direct read/write access to persistent data. Any injection or missing access control at the API layer becomes full data tampering.
- **API to OpenAI integration** — the fight simulator calls an external AI service with server-held credentials. Unbounded or attacker-amplified usage can create cost and availability risk.
- **Public to admin boundary** — most site functionality is public, but suggestion review and any destructive content-management operations are privileged and must not rely on obscurity or frontend-only checks.
- **Dev-only to production boundary** — `artifacts/mockup-sandbox`, local scripts, and seeding utilities are non-production unless deployment evidence shows otherwise.

## Scan Anchors

- **Production entry points**: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/fight-club/src/main.tsx`, `artifacts/fight-club/src/App.tsx`
- **Highest-risk code areas**: `artifacts/api-server/src/routes/*.ts`, `artifacts/api-server/src/lib/fightSimulator.ts`, `artifacts/fight-club/src/pages/admin.tsx`, `lib/db/src/schema/*`
- **Public surfaces**: character browse APIs, fight simulation/history APIs, suggestion submission UI and API
- **Privileged surfaces**: suggestion review endpoints in `artifacts/api-server/src/routes/suggestions.ts` and the `/admin` frontend flow
- **Usually ignore as dev-only**: `artifacts/mockup-sandbox/**`, `scripts/**`, standalone seed/admin scripts unless proven production-reachable

## Threat Categories

### Spoofing

The project has a public site plus a privileged moderation surface. Any admin mechanism must resist guessing, reuse, and client-side leakage. Admin identity must be verified server-side with a secret or session that is not hardcoded, not defaulted, and not exposed to arbitrary browser scripts.

### Tampering

Public clients can submit requests directly to the API, so all create, update, approve, and delete actions must be constrained on the server. The system must not trust route obscurity, frontend locks, or client-supplied assumptions for data integrity.

### Information Disclosure

Pending suggestions and any future privileged data must be returned only to authorized callers. Secrets such as database credentials, AI API keys, and admin credentials must never appear in client bundles, browser storage unless strictly necessary, or logs.

### Denial of Service

Fight simulation and streaming endpoints can trigger database work and costly external AI generation. The application should bound request sizes, concurrency, and abuse from unauthenticated callers, and external calls should fail safely with timeouts and controlled fan-out.

### Elevation of Privilege

Privileged routes must require strong server-side authorization for every request. Public users must not be able to create official characters, approve suggestions, delete characters, or erase fight history without an authorized admin capability. All write endpoints must be reviewed as potential broken-access-control entry points.