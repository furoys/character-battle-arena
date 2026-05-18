import { useEffect, useRef, useState } from "react";
import type { Character } from "@workspace/api-client-react";
import { CinematicIntro } from "./cinematic-intro";

const STORAGE_KEY = "ava.firstFightTutorialDone";

type Step =
  | "intro"
  | "pickTeam1"
  | "synergy"
  | "showSynergy"
  | "pickTeam2"
  | "modifier"
  | "fight"
  | "celebrate"
  | "done";

interface Props {
  /** Two iconic, recognizable characters to stage during the tutorial. If
   *  null (e.g. roster not yet loaded), the tutorial waits and self-bails. */
  tutorialPicks: [Character, Character] | null;
  /** Optional 3rd pick — a Team-1 partner from the SAME universe as
   *  tutorialPicks[0], so the synergy step actually triggers a real
   *  same-universe bonus pill in the dock. Null when no same-universe
   *  partner exists in the roster, in which case the synergy step is skipped. */
  tutorialSynergyPick: Character | null;
  /** Characters used for the pre-tutorial cinematic montage. A small slice of
   *  the loaded roster is sufficient — recognizable images flash on screen. */
  montageCharacters: Character[];
  team1Count: number;
  team2Count: number;
  fightStarted: boolean;
  /** `append=true` adds the character to the team; `append=false` replaces
   *  it. Tutorial uses append for the synergy partner so we end up with a
   *  2-fighter Team 1 instead of clobbering the champion pick. */
  onPickForTeam: (character: Character, slot: 1 | 2, append?: boolean) => void;
  /** Fires once when the tutorial transitions out of its active state, for
   *  any reason (skip, completed FIGHT tap, pre-populated bail, fight closed).
   *  Used by the parent to flip the "tutorial pending" UI gating off. */
  onFinish?: () => void;
}

interface HandPosition {
  x: number;
  y: number;
  scale: number;
  tap: boolean;
}

const CAPTIONS: Record<Step, string> = {
  intro: "Welcome to A.v.A",
  pickTeam1: "Choose Champion",
  synergy: "Team Up · Same Universe",
  showSynergy: "Synergy Bonus Unlocked",
  pickTeam2: "Choose Nemesis",
  modifier: "Chaos Rules · Twist Fate",
  fight: "Awaken Combat",
  celebrate: "Legendary.",
  done: "",
};

export function GhostHandTutorial({
  tutorialPicks,
  tutorialSynergyPick,
  montageCharacters,
  team1Count,
  team2Count,
  fightStarted,
  onPickForTeam,
  onFinish,
}: Props) {
  const [active, setActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) !== "1";
    } catch {
      return false;
    }
  });
  // Pre-tutorial cinematic plays first. The ghost-hand choreography blocks
  // until the cinematic completes (or the user skips it).
  const [cineDone, setCineDone] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [hand, setHand] = useState<HandPosition>({ x: -200, y: -200, scale: 1, tap: false });
  const [captionVisible, setCaptionVisible] = useState(true);
  const cancelledRef = useRef(false);
  // Flipped true once the choreography itself starts calling `onPickForTeam`.
  // After that, team-count changes are EXPECTED (we caused them) and must NOT
  // trigger the pre-populated-team bail — that would self-cancel the tutorial
  // immediately after Step 1.
  const scriptedPickingRef = useRef(false);
  const finishedRef = useRef(false);

  // Bail reactively if teams ever get pre-populated (e.g. async daily preload
  // hydrates after mount). Must NOT be mount-only — async state would slip
  // past a single check and we'd overwrite the user's real picks. But once
  // OUR scripted picking has started, count changes are us, not the user.
  useEffect(() => {
    if (!active) return;
    if (scriptedPickingRef.current) return;
    if (team1Count > 0 || team2Count > 0) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, team1Count, team2Count]);

  function finish() {
    cancelledRef.current = true;
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setStep("done");
    setActive(false);
    if (!finishedRef.current) {
      finishedRef.current = true;
      try { onFinish?.(); } catch { /* ignore parent errors */ }
    }
  }

  function skip() {
    finish();
  }

  // Locate a DOM element's center in viewport coords.
  function centerOf(selector: string): { x: number; y: number } | null {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // Try repeatedly to locate an element (cards may still be mounting), then
  // smooth-scroll it into view so the hand lands somewhere the user can see.
  async function waitForCenter(selector: string, timeoutMs = 3000): Promise<{ x: number; y: number } | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (cancelledRef.current) return null;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        try { el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }); } catch { /* ignore */ }
        // Let the scroll settle before measuring final coords.
        await new Promise(r => setTimeout(r, 420));
        if (cancelledRef.current) return null;
        const c = centerOf(selector);
        if (c && c.x > 0 && c.y > 0) return c;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }

  async function sleep(ms: number) {
    await new Promise(r => setTimeout(r, ms));
  }

  async function flashCaption(next: Step) {
    setCaptionVisible(false);
    await sleep(180);
    if (cancelledRef.current) return;
    setStep(next);
    setCaptionVisible(true);
  }

  async function moveHandTo(target: { x: number; y: number }) {
    setHand(h => ({ ...h, x: target.x, y: target.y, scale: 1, tap: false }));
    await sleep(950);
  }

  async function doTap() {
    setHand(h => ({ ...h, scale: 0.82, tap: true }));
    await sleep(260);
    setHand(h => ({ ...h, scale: 1, tap: false }));
    await sleep(220);
  }

  // Main choreography. Re-runs only when `active` flips on (effectively once).
  // Any failure path (missing DOM target, timeout) calls finish() so the user
  // can never get stranded behind a stuck overlay.
  useEffect(() => {
    if (!active) return;
    if (!cineDone) return; // wait for cinematic intro to finish first
    if (!tutorialPicks) return; // wait for iconic picks to be resolved
    let cancelled = false;
    cancelledRef.current = false;
    const aborted = () => cancelled || cancelledRef.current;
    const [pickA, pickB] = tutorialPicks;

    (async () => {
      try {
        // Brief intro caption — slower for a more cinematic feel
        await sleep(900);
        if (aborted()) return;
        await flashCaption("pickTeam1");

        // STEP 1 — Team 1 pick (champion)
        const targetA = await waitForCenter(`[data-tutorial-id="${pickA.id}"]`);
        if (aborted()) return;
        if (!targetA) { finish(); return; }
        await moveHandTo(targetA);
        await doTap();
        if (aborted()) return;
        // Mark scripted-pick phase BEFORE we mutate parent state, so the
        // reactive bail effect doesn't fire on the resulting team-count tick.
        scriptedPickingRef.current = true;
        onPickForTeam(pickA, 1);
        await sleep(950);
        if (aborted()) return;

        // STEP 2 — Synergy partner (optional, only when a same-universe
        // partner exists in the roster). We APPEND so Team 1 ends up with
        // both the champion and the partner, then highlight the synergy
        // strip so the +bonus pill is the focal point.
        if (tutorialSynergyPick) {
          await flashCaption("synergy");
          const targetSyn = await waitForCenter(`[data-tutorial-id="${tutorialSynergyPick.id}"]`);
          if (aborted()) return;
          if (targetSyn) {
            await moveHandTo(targetSyn);
            await doTap();
            if (aborted()) return;
            onPickForTeam(tutorialSynergyPick, 1, true);
            await sleep(1100);
            if (aborted()) return;

            // Point at the synergy pill itself so the user understands WHAT
            // they just unlocked. No tap — it's not interactive.
            await flashCaption("showSynergy");
            const targetPill = await waitForCenter('[data-tutorial-id="synergy-strip"]', 2500);
            if (!aborted() && targetPill) {
              await moveHandTo(targetPill);
              await sleep(2600);
            }
            if (aborted()) return;
          }
          // If the partner card never showed up we silently fall through —
          // never strand the user behind a missing step.
        }

        // STEP 3 — Team 2 pick (nemesis)
        await flashCaption("pickTeam2");
        const targetB = await waitForCenter(`[data-tutorial-id="${pickB.id}"]`);
        if (aborted()) return;
        if (!targetB) { finish(); return; }
        await moveHandTo(targetB);
        await doTap();
        if (aborted()) return;
        onPickForTeam(pickB, 2);
        await sleep(1100);
        if (aborted()) return;

        // STEP 4 — Chaos modifier preview. Point at the chip and explain;
        // do NOT open the picker (per UX decision — keep first run fast).
        await flashCaption("modifier");
        const targetMod = await waitForCenter('[data-tutorial-id="modifier-chip"]', 3000);
        if (!aborted() && targetMod) {
          await moveHandTo(targetMod);
          await sleep(2600);
        }
        if (aborted()) return;

        // STEP 5 — Hover on FIGHT, wait for real tap
        await flashCaption("fight");
        // FIGHT button only renders once both teams are populated — wait a beat.
        const fightTarget = await waitForCenter('[data-testid="button-fight"]', 4000);
        if (aborted()) return;
        if (!fightTarget) { finish(); return; }
        await moveHandTo(fightTarget);
        // Linger pulsing — no auto-tap. We wait for the user.
      } catch {
        // Any unexpected error → never strand the overlay.
        if (!aborted()) finish();
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tutorialPicks, tutorialSynergyPick]);

  // When the real FIGHT starts, finalize regardless of which step we're on.
  // If the user starts a fight before tutorial gets to the FIGHT step (e.g.,
  // they skip ahead and tap real cards themselves), we still dismiss cleanly.
  useEffect(() => {
    if (!active) return;
    if (!fightStarted) return;
    (async () => {
      // Only run the celebrate beat if we actually reached the FIGHT prompt;
      // otherwise just dismiss silently so we don't pop a banner over a fight
      // the user initiated on their own.
      if (step === "fight") {
        await flashCaption("celebrate");
        await sleep(1400);
      }
      finish();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fightStarted, active]);

  if (!active) return null;

  // Cinematic intro plays first — full-bleed black overlay above the page.
  // We render it as a SIBLING to the choreography overlay (returned together
  // in a fragment) so the user sees the pre-roll, then the choreography
  // takes over once `cineDone` flips. Both gate on `tutorialPicks` being
  // resolved — the roster has to be loaded for either to show anything.
  if (!cineDone) {
    if (!tutorialPicks) return null;
    return (
      <CinematicIntro
        pickA={tutorialPicks[0]}
        pickB={tutorialPicks[1]}
        montage={montageCharacters}
        onComplete={() => setCineDone(true)}
        onSkip={() => setCineDone(true)}
      />
    );
  }

  const showHand =
    step === "pickTeam1" ||
    step === "synergy" ||
    step === "showSynergy" ||
    step === "pickTeam2" ||
    step === "modifier" ||
    step === "fight";

  return (
    <div
      role="dialog"
      aria-label="Welcome tutorial"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        pointerEvents: "none", // never block taps; we want user to tap FIGHT
      }}
    >
      {/* Soft vignette so the hand and caption read against any background */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            step === "celebrate"
              ? "radial-gradient(ellipse at center, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.9) 100%)"
              : "radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)",
          transition: "background 350ms ease",
        }}
      />

      {/* Ghost hand */}
      {showHand && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate(${hand.x - 24}px, ${hand.y - 8}px) scale(${hand.scale})`,
            transformOrigin: "24px 8px",
            transition:
              "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
            pointerEvents: "none",
            filter: "drop-shadow(0 0 12px rgba(255,0,85,0.7)) drop-shadow(0 4px 8px rgba(0,0,0,0.8))",
          }}
        >
          {/* Pulse ring on FIGHT step, and on info-only beats (synergy /
              modifier highlight) so the user's eye latches on. */}
          {(step === "fight" || step === "showSynergy" || step === "modifier") && (
            <div
              style={{
                position: "absolute",
                left: 8,
                top: -8,
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "2px solid #ff0055",
                animation: "ghostPulse 1.2s ease-out infinite",
                pointerEvents: "none",
              }}
            />
          )}
          {/* Tap ripple */}
          {hand.tap && (
            <div
              style={{
                position: "absolute",
                left: 8,
                top: -8,
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(255,0,85,0.35)",
                animation: "ghostTap 380ms ease-out forwards",
                pointerEvents: "none",
              }}
            />
          )}
          {/* Hand SVG — stylized pointing index finger */}
          <svg width="56" height="64" viewBox="0 0 56 64" fill="none">
            <defs>
              <linearGradient id="ghostHandFill" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="1" stopColor="#ffd8e4" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            {/* Index finger */}
            <rect x="20" y="2" width="12" height="22" rx="6" fill="url(#ghostHandFill)" stroke="#ff0055" strokeWidth="1.5" />
            {/* Palm */}
            <path
              d="M10 22 Q10 16 16 16 L36 16 Q42 16 42 22 L42 46 Q42 58 28 58 Q14 58 10 46 Z"
              fill="url(#ghostHandFill)"
              stroke="#ff0055"
              strokeWidth="1.5"
            />
            {/* Thumb */}
            <ellipse cx="10" cy="30" rx="6" ry="9" fill="url(#ghostHandFill)" stroke="#ff0055" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: step === "celebrate" ? "44%" : "12%",
          display: "flex",
          justifyContent: "center",
          opacity: captionVisible ? 1 : 0,
          transition: "opacity 220ms ease, top 350ms ease",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.85)",
            border: "1.5px solid #ff0055",
            padding: step === "celebrate" ? "16px 28px" : "10px 18px",
            color: "#fff",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: step === "celebrate" ? 32 : 18,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            textShadow: "0 0 14px rgba(255,0,85,0.7)",
            boxShadow: "0 0 24px rgba(255,0,85,0.35), 0 4px 16px rgba(0,0,0,0.8)",
          }}
        >
          {CAPTIONS[step]}
        </div>
      </div>

      {/* Skip button — always available, never hidden, pointerEvents:auto so it's tappable
          even though the rest of the overlay is non-interactive. */}
      {step !== "celebrate" && step !== "done" && (
        <button
          onClick={skip}
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            padding: "8px 14px",
            background: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "rgba(255,255,255,0.55)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          Skip
        </button>
      )}

      <style>{`
        @keyframes ghostPulse {
          0%   { transform: scale(0.75); opacity: 0.9; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes ghostTap {
          0%   { transform: scale(0.4); opacity: 0.9; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
