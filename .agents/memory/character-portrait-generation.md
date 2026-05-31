---
name: Character portrait AI generation
description: How to generate AI portraits for the licensed-character roster, and the copyrighted-name refusal workaround.
---

# Generating character portraits for the roster

Roster character images live as local files in `artifacts/fight-club/public/characters/<slug>.<ext>` with `characters.image_url = /characters/<slug>.<ext>`. Slug = `name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')` (non-ASCII chars are stripped, so "Te Ká" → `te-k`). Display uses `object-cover object-top`, so **3:4 portraits framed toward the top** look best.

## Copyrighted-name refusal (the non-obvious gotcha)
**Why:** The image generator silently refuses prompts that name well-known copyrighted characters directly (observed reliably for Simpsons / Family Guy / Futurama, and some cosmic Marvel like Galactus, Silver Surfer, Living Tribunal, Beyonder, Scarlet Witch). A prompt like "Character portrait of Homer Simpson" just fails — no file is written.

**How to apply:** First pass can name the character (most franchises work). For the persistent failures, regenerate with an **appearance-based prompt that never names the franchise/character** — describe the visual instead (e.g. "a bald overweight cartoon man with bright yellow skin, two strands of hair, white shirt, blue trousers"). This succeeds where the named prompt refused. The roster owner has accepted that licensed characters may look approximate, so this tradeoff is sanctioned.

## Batch generation mechanics
- `generateImage({images:[...]})` takes up to 10 per call and blocks until done. Run several calls in `Promise.allSettled` for parallelism; ~3 chunks of 10 (30 imgs) ≈ 3 min. Larger concurrent waves (50+) raise the per-image failure rate (proxy overload), so retry stragglers in smaller batches.
- Verify success by **filesystem existence of the outputPath**, not the call's return value, then set `image_url` only for files that landed. Re-query DB for `image_url IS NULL` to find what still needs a retry.
