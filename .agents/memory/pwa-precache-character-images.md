---
name: PWA precache vs content images
description: Why the fight-club production build can break on large character portraits, and the precache scope rule.
---

# PWA precache must exclude character portraits

The fight-club Vite build uses `vite-plugin-pwa` with `strategies: "injectManifest"`.
Its `injectManifest.globPatterns` includes `png`, so without an ignore it sweeps
**every** file under `public/characters/` into the service-worker precache manifest.

**The rule:** `public/characters/**` must stay in `injectManifest.globIgnores`.
Portraits are content images fetched on demand — they are not app-shell assets.

**Why:**
- `injectManifest` *hard-errors* (fails the build, not just warns) on any single
  asset larger than `maximumFileSizeToCacheInBytes` (default 2 MiB). AI portraits
  occasionally exceed 2 MB, so a single oversized portrait aborts the whole
  production build — and the failure surfaces only at publish time (no runtime
  deployment logs, because it dies in the build phase).
- Even under 2 MB, precaching ~1.5k portraits would bloat every SW install and
  re-download on every `autoUpdate`.

**How to apply:** When adding portraits or touching the PWA config, keep
`characters/**` ignored. If you ever need a build to precache more, raise the size
limit instead of removing the ignore — but the correct default is on-demand fetch.
Note the `workbox.runtimeCaching` block in `vite.config.ts` is **ignored** under
`injectManifest` (it only applies to `generateSW`); runtime caching would have to
live in `src/sw.ts`.
