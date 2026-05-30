---
name: Audio engine vs intro overlay ownership
description: Why the MusicEngine must "stand down" while the cinematic intro overlay is on screen, and the effect-ordering trick that makes it reliable.
---

# Intro overlay owns audio; the shared MusicEngine must defer

The cinematic intro (`intro-sequence.tsx`) plays its OWN audio (`intro-music.mp3` + speech via a private AudioContext). The shared `MusicEngine` singleton (`lib/music-engine.ts`) plays lobby/battle/victory. These are independent audio graphs — nothing coordinates them by default.

**The bug:** pages mount UNDERNEATH the intro overlay (`App.tsx`: `{children}{showIntro && <IntroSequence/>}`). `home.tsx` calls `setTrack("lobby")` in a mount `useEffect`, so the engine's lobby track starts playing ON TOP of the intro's music+speech → overlapping/"doubled" audio during the intro.

**The fix:** `MusicEngine.beginIntro()/endIntro()` + an `introActive` flag. While `introActive`, `setTrack()` only records `pendingTrack` and plays nothing; `endIntro()` resumes the pending track. The intro calls `beginIntro()` / `endIntro()`.

**Why:** two unrelated audio graphs can't see each other; the only safe coordination point is the shared singleton refusing to play while the intro holds the floor.

**How to apply (the non-obvious part):** `beginIntro()` MUST be called from a `useLayoutEffect`, not `useEffect`. React runs ALL layout effects (in tree order) during commit, then ALL passive effects. `home.tsx`'s `setTrack("lobby")` is a passive `useEffect`. So a layout effect in the intro wins the race and sets `introActive=true` before home's request arrives — home's call then just records `pendingTrack`. If you ever move this to `useEffect`, the race returns and lobby music leaks under the intro again. Release in the effect's cleanup so finish/skip/unmount all hand audio back.
