import { useEffect, useLayoutEffect, useState, useRef, useCallback, type MutableRefObject } from "react";

// ── Cast — 15 characters from across every universe ───────────────────────────
const CAST = [
  { name: "DARTH VADER",   sub: "Star Wars",           img: "darth-vader.jpg",   color: "#a855f7" },
  { name: "GOKU",          sub: "Dragon Ball Z",       img: "goku.jpg",          color: "#f59e0b" },
  { name: "BATMAN",        sub: "Legacy Comics",       img: "batman.jpg",        color: "#c084fc" },
  { name: "KRATOS",        sub: "God of War",          img: "kratos.jpg",        color: "#dc2626" },
  { name: "SPAWN",         sub: "Image Comics",        img: "spawn.jpg",         color: "#00f0ff" },
  { name: "ALL MIGHT",     sub: "My Hero Academia",    img: "all-might.jpg",     color: "#3b82f6" },
  { name: "DEADPOOL",      sub: "Multiverse Comics",   img: "deadpool.jpg",      color: "#ef4444" },
  { name: "ALUCARD",       sub: "Hellsing",            img: "alucard.jpg",       color: "#b91c1c" },
  { name: "JOKER",         sub: "Legacy Comics",       img: "joker.jpg",         color: "#84cc16" },
  { name: "SPIDER-MAN",    sub: "Multiverse Comics",   img: "spider-man.jpg",    color: "#ef4444" },
  { name: "ACHILLES",      sub: "Greek Mythology",     img: "achilles.jpg",      color: "#ca8a04" },
  { name: "AGENT SMITH",   sub: "The Matrix",          img: "agent-smith.jpg",   color: "#4ade80" },
  { name: "MILES MORALES", sub: "Spider-Verse",        img: "miles-morales.jpg", color: "#3b82f6" },
  { name: "ALIEN QUEEN",   sub: "Sci-Fi Horror",       img: "alien-queen.jpg",   color: "#86efac" },
  { name: "PITT",          sub: "Full Bleed Studios",  img: "pitt.jpg",          color: "#00f0ff" },
];

// ── Per-character durations — scaled to fit the 33.802s intro speech audio ────
// Proportional scale: 33,802ms total / 24,980ms previous = ×1.3531
// Starts slower, accelerates, ends fast — same ramp shape, longer window.
//    i:  0     1     2     3     4     5     6     7     8    9   10   11   12   13   14
const CHAR_DURATIONS = [2172, 1969, 1786, 1637, 1482, 1353, 1231, 1123, 1022, 934, 839, 771, 697, 812, 758];
const TOTAL_SHOWCASE_MS = CHAR_DURATIONS.reduce((a, b) => a + b, 0); // 18,586ms

// ── Stage durations (ms) — total = 33,802ms ≈ intro-speech.mp3 (33.802s) ─────
const STAGE_DURATIONS = [
  1448,              // 0 — black awakening        (×1.3531 from 1070ms)
  217,               // 1 — opening crackle-flash  (×1.3531 from 160ms)
  3247,              // 2 — icon slams in          (×1.3531 from 2400ms)
  TOTAL_SHOWCASE_MS, // 3 — character showcase     18,586ms
  359,               // 4 — impact flash           (×1.3531 from 265ms)
  3978,              // 5 — ANYONE VS ANYONE       (×1.3531 from 2940ms)
  4702,              // 6 — logo assembled         (×1.3531 from 3475ms)
  1265,              // 7 — iris-out               (×1.3531 from 935ms)
];

const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

// ── Smooth volume ramp for HTMLAudioElement ────────────────────────────────────
// Cancels any in-progress ramp before starting a new one so stage transitions
// never stack. Uses ease-out quadratic so the target level is reached crisply.
function rampVolume(
  el: HTMLAudioElement,
  target: number,
  durationMs: number,
  rafRef: MutableRefObject<number | null>,
) {
  if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  const startVol = el.volume;
  const diff = target - startVol;
  if (durationMs <= 16 || Math.abs(diff) < 0.004) { el.volume = Math.max(0, Math.min(1, target)); return; }
  const t0 = performance.now();
  const tick = () => {
    const frac = Math.min((performance.now() - t0) / durationMs, 1);
    const ease = 1 - Math.pow(1 - frac, 2); // ease-out quadratic
    el.volume  = Math.max(0, Math.min(1, startVol + diff * ease));
    rafRef.current = frac < 1 ? requestAnimationFrame(tick) : null;
  };
  rafRef.current = requestAnimationFrame(tick);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// `enabled` gates the whole timeline so visuals never run ahead of audio
// (critical on iOS where audio can be blocked until a user gesture).
function useStage(onFinish: () => void, enabled: boolean) {
  const [stage, setStage] = useState(0);
  const cleanupRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let s = 0;
    const advance = () => {
      s++;
      if (s >= STAGE_DURATIONS.length) { onFinish(); return; }
      const t = setTimeout(() => { setStage(s); advance(); }, STAGE_DURATIONS[s - 1]);
      cleanupRef.current.push(t);
    };
    const t0 = setTimeout(advance, STAGE_DURATIONS[0]);
    cleanupRef.current.push(t0);
    return () => cleanupRef.current.forEach(clearTimeout);
  }, [enabled]);

  return stage;
}

function imgUrl(filename: string) {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${base}/characters/${filename}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Grain() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: NOISE, backgroundSize: "256px 256px",
      opacity: 0.55, mixBlendMode: "overlay",
    }} />
  );
}

function Scanlines() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 3px)",
    }} />
  );
}

// ── Brand constants (match logo.svg exactly) ──────────────────────────────────
const BRAND_A_GRAD = "linear-gradient(180deg, #e0ffff 0%, #00f0ff 18%, #0088cc 60%, #001e33 100%)";
const BRAND_V_GRAD = "linear-gradient(180deg, #fff0aa 0%, #ff7722 22%, #cc1100 68%, #550008 100%)";
const BRAND_FONT = "'Impact', 'Arial Black', sans-serif";

function GradLetter({
  children, grad, glow, fontSize, anim, delay = 0,
}: {
  children: string; grad: string; glow: string;
  fontSize: string; anim: string; delay?: number;
}) {
  return (
    <span style={{
      fontFamily: BRAND_FONT, fontWeight: 900,
      fontSize, lineHeight: 1,
      background: grad,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      filter: `drop-shadow(0 0 18px ${glow}) drop-shadow(0 0 40px ${glow}80)`,
      animation: `${anim} 0.45s ${delay}s cubic-bezier(0.16,1,0.3,1) both`,
      display: "inline-block",
    }}>
      {children}
    </span>
  );
}

/** Stage 2 — A·v·A letters crash in with electric energy ring */
function AvaTitle() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      {/* Glitch horizontal tears */}
      {[22, 49, 71].map((pct, i) => (
        <div key={i} style={{
          position: "absolute", left: 0, right: 0,
          top: `${pct}%`, height: "1px",
          background: i < 2
            ? `rgba(0,240,255,${0.3 + i * 0.1})`
            : "rgba(255,119,34,0.4)",
          animation: `glitch-tear ${0.4 + i * 0.15}s ${i * 0.08}s ease-out both`,
        }} />
      ))}

      {/* ── Electric energy ring (scales in, then spins) ── */}
      <div style={{
        position: "absolute", pointerEvents: "none",
        width: "min(84vw, 470px)", height: "min(84vw, 470px)",
        animation: "ring-in 0.65s 0.08s cubic-bezier(0.16,1,0.3,1) both",
      }}>
        {/* Main spinning blue-fire ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg, #000a2e 0deg, #001a6e 30deg, #0044cc 75deg, #0088ff 120deg, #00ccff 155deg, #88eeff 180deg, #00ccff 205deg, #0088ff 240deg, #0044cc 285deg, #001a6e 330deg, #000a2e 360deg)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 5px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 5px))",
          animation: "ring-spin 6s linear infinite",
          filter: "blur(0.4px)",
        }} />
        {/* Inner blue glow halo */}
        <div style={{
          position: "absolute", inset: -10, borderRadius: "50%",
          boxShadow: "0 0 0 1px rgba(0,140,255,0.15), 0 0 50px rgba(0,100,255,0.55), 0 0 100px rgba(0,60,220,0.3)",
          pointerEvents: "none",
        }} />
        {/* Outer diffuse blue glow */}
        <div style={{
          position: "absolute", inset: -20, borderRadius: "50%",
          boxShadow: "0 0 90px rgba(0,80,255,0.18), 0 0 160px rgba(0,50,200,0.1)",
          pointerEvents: "none",
        }} />
        {/* Counter-rotating cyan-white sparks */}
        <div style={{
          position: "absolute", inset: 6, borderRadius: "50%",
          background: "conic-gradient(from 90deg, transparent 0deg, rgba(150,220,255,0.7) 5deg, transparent 10deg, transparent 175deg, rgba(200,240,255,0.5) 180deg, transparent 185deg, transparent 355deg)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
          animation: "ring-spin-reverse 2.6s linear infinite",
          filter: "blur(1px)",
        }} />
      </div>

      {/* A·v·A in exact brand colors — sit on top of ring */}
      <div style={{ display: "flex", alignItems: "center", lineHeight: 1, position: "relative" }}>
        <GradLetter
          grad={BRAND_A_GRAD} glow="#00f0ff"
          fontSize="clamp(80px, 26vw, 150px)"
          anim="crash-left"
        >A</GradLetter>

        <GradLetter
          grad={BRAND_V_GRAD} glow="#ff7722"
          fontSize="clamp(48px, 16vw, 88px)"
          anim="crash-center" delay={0.15}
        >·v·</GradLetter>

        <GradLetter
          grad={BRAND_A_GRAD} glow="#00f0ff"
          fontSize="clamp(80px, 26vw, 150px)"
          anim="crash-right"
        >A</GradLetter>
      </div>

      <div style={{
        fontSize: "clamp(9px, 2.8vw, 13px)", letterSpacing: "0.6em",
        color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
        fontWeight: 700, marginTop: 18, position: "relative",
        animation: "fade-up 0.7s 0.6s ease-out both",
      }}>
        Anyone vs Anyone
      </div>
    </div>
  );
}

/** Stage 3 — One character at a time, full-screen cinematic portrait.
 *  Adapts text speed + layout to card duration (fast cards = snappier text). */
function CharCard({ char, idx, duration }: { char: typeof CAST[0]; idx: number; duration: number }) {
  const fromRight = idx % 2 === 1;
  // Rotate through 3 layout moods: standard | centered | corner
  const mood = idx % 3;
  const isFast = duration < 540;
  const textDelay = isFast ? 0 : 0.15;
  const textDur   = isFast ? 0.2 : 0.4;
  const textAnim  = isFast ? "text-slam" : fromRight ? "slide-up-text" : "slide-right-text";

  // Accent bar direction varies by mood
  const barSide = mood === 0 ? (fromRight ? "right" : "left") : mood === 1 ? "left" : "right";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Portrait — Ken Burns zoom, faster on quick cards */}
      <img
        src={imgUrl(char.img)}
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "top center",
          animation: `ken-burns ${isFast ? "0.4s" : "0.85s"} ease-out both`,
          transformOrigin: mood === 1 ? "center center" : "center top",
        }}
      />

      {/* Layered overlays — mood 1 (centered): heavier side vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: mood === 1
          ? [
              "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.6) 30%, transparent 55%)",
              "linear-gradient(to right, rgba(0,0,0,0.65) 0%, transparent 40%, rgba(0,0,0,0.65) 100%)",
              `radial-gradient(ellipse at 50% 55%, ${char.color}1a 0%, transparent 60%)`,
            ].join(", ")
          : [
              "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.55) 35%, transparent 60%)",
              "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 18%)",
              `radial-gradient(ellipse at ${fromRight ? "70%" : "30%"} 50%, ${char.color}16 0%, transparent 55%)`,
            ].join(", "),
      }} />

      {/* Colored accent bar */}
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        [barSide]: 0,
        width: isFast ? 3 : 5,
        background: char.color,
        boxShadow: `0 0 ${isFast ? 20 : 40}px ${char.color}, 0 0 ${isFast ? 40 : 80}px ${char.color}60`,
        animation: "bar-drop 0.35s ease-out both",
      }} />

      {/* On fast cards: thin top bar too for extra energy */}
      {isFast && (
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${char.color}, transparent)`,
          boxShadow: `0 0 16px ${char.color}`,
          animation: "bar-expand 0.2s ease-out both",
        }} />
      )}

      {/* Character info — position varies by mood */}
      <div style={{
        position: "absolute",
        bottom: mood === 1 ? 48 : 60,
        left: mood === 0 && fromRight ? undefined : 20,
        right: mood === 0 && fromRight ? 20 : undefined,
        textAlign: mood === 1 ? "center" : (mood === 0 && fromRight) ? "right" : "left",
        animation: `${textAnim} ${textDur}s ${textDelay}s cubic-bezier(0.16,1,0.3,1) both`,
      }}>
        {!isFast && (
          <div style={{
            fontSize: "clamp(7px, 2.2vw, 9px)", letterSpacing: "0.5em",
            color: char.color, textTransform: "uppercase", fontWeight: 800,
            textShadow: `0 0 16px ${char.color}`,
            marginBottom: 8,
          }}>
            {char.sub}
          </div>
        )}

        <div style={{
          fontFamily: BRAND_FONT,
          fontSize: isFast
            ? "clamp(32px, 11vw, 62px)"
            : "clamp(38px, 13vw, 74px)",
          fontWeight: 900, lineHeight: 0.88,
          color: "#ffffff", textTransform: "uppercase",
          letterSpacing: "-0.02em",
          textShadow: `0 2px 20px rgba(0,0,0,0.9), 0 0 50px ${char.color}35`,
        }}>
          {char.name}
        </div>

        {isFast && (
          <div style={{
            fontSize: "clamp(7px, 2vw, 9px)", letterSpacing: "0.35em",
            color: char.color, textTransform: "uppercase",
            fontWeight: 700, marginTop: 6,
            textShadow: `0 0 12px ${char.color}`,
          }}>
            {char.sub}
          </div>
        )}
      </div>

      {/* Entry flash-wipe */}
      <div style={{
        position: "absolute", inset: 0,
        background: "#fff",
        animation: `flash-wipe ${isFast ? "0.1s" : "0.16s"} ease-out both`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

/** Stage 5 — ANYONE VS ANYONE collision */
function AnyoneVsAnyone() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      animation: "shake 0.35s ease-out both",
      overflow: "hidden",
    }}>
      {/* Top ANYONE — cyan glow */}
      <div style={{
        fontFamily: BRAND_FONT,
        fontSize: "clamp(44px, 15vw, 90px)",
        fontWeight: 900, letterSpacing: "0.04em",
        color: "#e0ffff", textTransform: "uppercase",
        lineHeight: 1, whiteSpace: "nowrap",
        textShadow: "0 0 30px rgba(0,240,255,0.6), 0 0 60px rgba(0,240,255,0.3)",
        animation: "slam-from-left 0.4s cubic-bezier(0.16,1,0.3,1) both",
      }}>ANYONE</div>

      {/* VS — brand orange-red explosion */}
      <div style={{
        fontFamily: BRAND_FONT,
        fontSize: "clamp(100px, 38vw, 220px)",
        fontWeight: 900, lineHeight: 0.78,
        color: "#ff7722",
        textShadow: "0 0 60px #ff7722, 0 0 120px rgba(255,119,34,0.6), 0 0 200px rgba(204,17,0,0.4)",
        letterSpacing: "-0.04em",
        animation: "vs-explode 0.45s 0.15s cubic-bezier(0.16,1,0.3,1) both",
      }}>VS</div>

      {/* Bottom ANYONE — warm glow */}
      <div style={{
        fontFamily: BRAND_FONT,
        fontSize: "clamp(44px, 15vw, 90px)",
        fontWeight: 900, letterSpacing: "0.04em",
        color: "#ffe0aa", textTransform: "uppercase",
        lineHeight: 1, whiteSpace: "nowrap",
        textShadow: "0 0 30px rgba(255,119,34,0.5), 0 0 60px rgba(204,17,0,0.3)",
        animation: "slam-from-right 0.4s 0.08s cubic-bezier(0.16,1,0.3,1) both",
      }}>ANYONE</div>

      {/* Horizontal energy line — brand cyan-to-orange */}
      <div style={{
        position: "absolute",
        left: 0, right: 0,
        top: "50%", height: 2,
        background: "linear-gradient(90deg, transparent 0%, #00f0ff 20%, #ffffff 50%, #ff7722 80%, transparent 100%)",
        boxShadow: "0 0 30px rgba(0,240,255,0.5), 0 0 60px rgba(255,119,34,0.4)",
        animation: "energy-line 0.5s 0.2s ease-out both",
        pointerEvents: "none",
      }} />
    </div>
  );
}

/** Stage 6 — A·v·A SVG logo assembled, surrounded by electric energy ring */
function FinalLogo() {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      {/* Electric ring — same construction as AvaTitle, slower spin */}
      <div style={{
        position: "absolute", pointerEvents: "none",
        width: "min(84vw, 470px)", height: "min(84vw, 470px)",
        animation: "logo-assemble 0.7s cubic-bezier(0.16,1,0.3,1) both",
      }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg, #000a2e 0deg, #001a6e 30deg, #0044cc 75deg, #0088ff 120deg, #00ccff 155deg, #88eeff 180deg, #00ccff 205deg, #0088ff 240deg, #0044cc 285deg, #001a6e 330deg, #000a2e 360deg)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #fff calc(100% - 4px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #fff calc(100% - 4px))",
          animation: "ring-spin 9s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: -12, borderRadius: "50%",
          boxShadow: "0 0 0 1px rgba(0,140,255,0.12), 0 0 55px rgba(0,100,255,0.55), 0 0 110px rgba(0,60,220,0.25)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: -24, borderRadius: "50%",
          boxShadow: "0 0 100px rgba(0,80,255,0.18), 0 0 180px rgba(0,50,200,0.1)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 6, borderRadius: "50%",
          background: "conic-gradient(from 270deg, transparent 0deg, rgba(150,220,255,0.6) 5deg, transparent 10deg, transparent 175deg, rgba(200,240,255,0.5) 180deg, transparent 185deg, transparent 355deg)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px))",
          animation: "ring-spin-reverse 3.5s linear infinite",
          filter: "blur(1px)",
        }} />
      </div>

      {/* Actual brand SVG logo — on top of ring */}
      <div style={{
        position: "relative",
        animation: "logo-assemble 0.55s cubic-bezier(0.16,1,0.3,1) both",
        filter: [
          "drop-shadow(0 0 24px rgba(0,150,255,0.7))",
          "drop-shadow(0 0 50px rgba(0,100,255,0.35))",
          "drop-shadow(0 0 80px rgba(0,60,220,0.2))",
        ].join(" "),
      }}>
        <img
          src={`${base}/logo.svg`}
          alt="A·v·A"
          style={{ width: "clamp(220px, 66vw, 360px)", display: "block" }}
        />
      </div>

      {/* Slow pulse rings radiating outward */}
      {[
        { delay: 0,   color: "rgba(0,240,255,0.22)" },
        { delay: 0.5, color: "rgba(255,119,34,0.18)" },
        { delay: 1.0, color: "rgba(0,240,255,0.14)" },
      ].map(({ delay, color }) => (
        <div key={delay} style={{
          position: "absolute",
          width: "80vw", height: "80vw", maxWidth: 540, maxHeight: 540,
          borderRadius: "50%",
          border: `1px solid ${color}`,
          animation: `ring-expand 2.8s ${delay}s ease-out infinite`,
          pointerEvents: "none",
        }} />
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function IntroSequence({ onDone }: { onDone: () => void }) {
  const [charIdx, setCharIdx] = useState(0);
  const [flashFrame, setFlashFrame] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);

  // ── Audio gating ──────────────────────────────────────────────────────────
  // iOS Safari blocks audio until a user gesture happens INSIDE the same call
  // stack — and the sticky activation from the sign-in button is lost during
  // Clerk's redirect. So we never assume audio will start; we wait until both
  // music.play() resolves AND AudioContext is running. Only then do visuals
  // begin. If audio is blocked, we show a "TAP TO START" overlay whose click
  // handler runs play() / resume() synchronously to satisfy iOS.
  const [audioStarted, setAudioStarted] = useState(false);
  // Flips true once the speech MP3 has finished decoding. Used together with
  // `audioStarted` so the speech-start effect re-fires if the user taps BEFORE
  // decode completes (otherwise the intro plays silently on slow networks).
  const [decodedReady, setDecodedReady] = useState(false);

  // Web Audio refs for the AI voice effect chain
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sourceRef     = useRef<AudioBufferSourceNode | null>(null);
  const decodedRef    = useRef<AudioBuffer | null>(null);
  const speechStartedRef = useRef(false);
  // performance.now() at the moment the user tapped — i.e. when the visual
  // timeline started. Used to compute audioOffset if decode lags behind tap.
  const gateOpenedAtRef = useRef<number | null>(null);

  // Background music — plain HTML audio element for simplicity
  const musicRef    = useRef<HTMLAudioElement | null>(null);
  // Tracks any in-flight volume ramp so new transitions cancel old ones
  const musicRampRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    // Smooth fade out via Web Audio API master gain (speech)
    const master = masterGainRef.current;
    const ctx = audioCtxRef.current;
    if (master && ctx && ctx.state !== "closed") {
      const t = ctx.currentTime;
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.55);
    }
    // Cancel any in-progress volume ramp, then linear fade to silence
    if (musicRampRef.current !== null) { cancelAnimationFrame(musicRampRef.current); musicRampRef.current = null; }
    const music = musicRef.current;
    if (music) {
      const fade = setInterval(() => {
        if (music.volume <= 0.04) { music.pause(); clearInterval(fade); return; }
        music.volume = Math.max(0, music.volume - 0.04);
      }, 35);
    }
    setExiting(true);
    setTimeout(onDone, 650);
  }, [onDone]);

  const stage = useStage(finish, audioStarted);

  // ── Eagerly create + resume AudioContext ─────────────────────────────────
  // useLayoutEffect fires synchronously after React commits but before the
  // browser paints — the earliest possible React hook. If the component
  // mounts as a result of a user gesture (age-gate click), the browser's
  // sticky activation flag is still set here, so ctx.resume() succeeds
  // without needing a subsequent tap.  We also add a one-shot fallback
  // listener for returning users (no age-gate) so the first tap anywhere
  // resumes the context instead of waiting until the next full gesture.
  useLayoutEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    ctx.resume().catch(() => {});

    const unlock = () => { if (ctx.state !== "running") ctx.resume().catch(() => {}); };
    document.addEventListener("click",      unlock, { capture: true, once: true });
    document.addEventListener("touchstart", unlock, { capture: true, once: true });

    return () => {
      document.removeEventListener("click",      unlock, { capture: true });
      document.removeEventListener("touchstart", unlock, { capture: true });
      ctx.close().catch(() => {});
    };
  }, []);

  // ── Voice audio engine ───────────────────────────────────────────────────
  // Fetch + decode the speech MP3 immediately, but stash the AudioBuffer in a
  // ref instead of starting it. Actual `source.start()` happens in the
  // start-on-gate effect below once `audioStarted` flips true. This lets us
  // pre-warm the decode while waiting for the iOS tap.
  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    fetch(`${base}/intro-speech.mp3`)
      .then(r => r.arrayBuffer())
      .then(buf => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        return ctx.decodeAudioData(buf).then(decoded => {
          decodedRef.current = decoded;
          // Trigger the start effect if the user has already tapped while we
          // were still decoding — otherwise the speech would never play.
          setDecodedReady(true);
        });
      })
      .catch(() => {});

    return () => {
      try { sourceRef.current?.stop(); } catch { /**/ }
    };
  }, []);

  // Schedule the speech buffer through the effect chain — only runs once the
  // audio gate opens (audioStarted === true). On iOS, this fires inside the
  // tap handler's react render commit, which is still within the activation
  // window since the tap handler called setAudioStarted(true) synchronously.
  useEffect(() => {
    if (!audioStarted || !decodedReady || speechStartedRef.current) return;
    const ctx = audioCtxRef.current;
    const decoded = decodedRef.current;
    if (!ctx || !decoded) return;
    speechStartedRef.current = true;

    const master = ctx.createGain();
    master.gain.value = 1.0;
    masterGainRef.current = master;
    master.connect(ctx.destination);

    const source = ctx.createBufferSource();
    source.buffer = decoded;
    sourceRef.current = source;

    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = "lowshelf"; lowShelf.frequency.value = 180; lowShelf.gain.value = 1.2;
    const lowMid = ctx.createBiquadFilter();
    lowMid.type = "peaking"; lowMid.frequency.value = 270; lowMid.Q.value = 1.4; lowMid.gain.value = -2.2;
    const rpForward = ctx.createBiquadFilter();
    rpForward.type = "peaking"; rpForward.frequency.value = 900; rpForward.Q.value = 2.8; rpForward.gain.value = 2.0;
    const presence = ctx.createBiquadFilter();
    presence.type = "peaking"; presence.frequency.value = 3200; presence.Q.value = 1.8; presence.gain.value = 2.2;
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = "highshelf"; highShelf.frequency.value = 8000; highShelf.gain.value = 2.0;

    const shaper = ctx.createWaveShaper();
    {
      const N = 512; const curve = new Float32Array(N);
      for (let i = 0; i < N; i++) { const x = (i * 2) / N - 1; curve[i] = Math.tanh(x * 1.2) / Math.tanh(1.2); }
      shaper.curve = curve; shaper.oversample = "2x";
    }

    const chorusDelay = ctx.createDelay(0.06); chorusDelay.delayTime.value = 0.024;
    const chorusLfo = ctx.createOscillator(); const chorusLfoGain = ctx.createGain();
    chorusLfo.type = "sine"; chorusLfo.frequency.value = 0.55; chorusLfoGain.gain.value = 0.0018;
    chorusLfo.connect(chorusLfoGain); chorusLfoGain.connect(chorusDelay.delayTime); chorusLfo.start();
    const chorusWet = ctx.createGain(); chorusWet.gain.value = 0.07;

    const revSR = ctx.sampleRate; const revLen = Math.floor(revSR * 0.55);
    const revIR = ctx.createBuffer(2, revLen, revSR);
    for (let ch = 0; ch < 2; ch++) {
      const d = revIR.getChannelData(ch);
      for (let i = 0; i < revLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (revSR * 0.14));
    }
    const reverb = ctx.createConvolver(); reverb.buffer = revIR;
    const reverbWet = ctx.createGain(); reverbWet.gain.value = 0.14;
    const dry = ctx.createGain(); dry.gain.value = 0.88;

    source.connect(lowShelf); lowShelf.connect(lowMid); lowMid.connect(rpForward);
    rpForward.connect(presence); presence.connect(highShelf); highShelf.connect(shaper);
    shaper.connect(dry);         dry.connect(master);
    shaper.connect(chorusDelay); chorusDelay.connect(chorusWet); chorusWet.connect(master);
    shaper.connect(reverb);      reverb.connect(reverbWet);      reverbWet.connect(master);

    // Start from the very beginning — visuals start in lockstep via useStage.
    // If the tap happened before decode finished, skip into the buffer by the
    // elapsed time since the gate opened so the speech still lands on the
    // right visual frame.
    const gateAt = gateOpenedAtRef.current;
    const elapsedSec = gateAt != null ? (performance.now() - gateAt) / 1000 : 0;
    const audioOffset = Math.max(0, Math.min(elapsedSec, decoded.duration - 0.1));
    source.start(ctx.currentTime, audioOffset);
  }, [audioStarted, decodedReady]);

  // ── Background music ─────────────────────────────────────────────────────
  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const el = new Audio(`${base}/intro-music.mp3`);
    // Start silent — rampVolume will fade in over the black awakening (stage 0).
    // This prevents the music from popping on at full blast.
    el.volume = 0;
    el.preload = "auto";
    musicRef.current = el;

    // Don't auto-play — every browser allows it inconsistently, and iOS in
    // particular needs the play() call inside a synchronous gesture handler.
    // Playback is kicked off by the big "TAP TO START" button render below.

    return () => {
      // Cancel any pending volume ramp before tearing down the element
      if (musicRampRef.current !== null) { cancelAnimationFrame(musicRampRef.current); musicRampRef.current = null; }
      el.pause(); el.src = "";
    };
  }, []);

  // ── Music volume sculpting — smooth ramps on every stage transition ───────
  // Each ramp cancels any in-flight one (via musicRampRef) so transitions
  // never pile up. Durations are tuned to each stage's dramatic weight:
  //   fast ducks (stages 1, 4) respond to sharp visual hits;
  //   slow swells (stages 3, 6) breathe with the cinematic build.
  useEffect(() => {
    const el = musicRef.current;
    if (!el) return;
    if      (stage === 1) rampVolume(el, 0.83, 100,  musicRampRef); // reactive dip for opening flash
    else if (stage === 2) rampVolume(el, 0.42, 350,  musicRampRef); // duck under A·v·A slam speech
    else if (stage === 3) rampVolume(el, 0.93, 700,  musicRampRef); // ease up, music breathes under narration
    else if (stage === 4) rampVolume(el, 0.23, 55,   musicRampRef); // sharp impact-flash punch
    else if (stage === 5) rampVolume(el, 0.42, 280,  musicRampRef); // duck under "Anyone vs Anyone" speech
    else if (stage === 6) rampVolume(el, 1.0,  900,  musicRampRef); // big cinematic swell for final logo
  }, [stage]);

  // Preload character images + app icon (used in stages 2 & 6)
  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const icon = new Image();
    icon.src = `${base}/app-icon.png`;
    CAST.forEach(c => { const i = new Image(); i.src = imgUrl(c.img); });
  }, []);

  // Boost speech gain for the final ~4 seconds (stages 6 + 7)
  useEffect(() => {
    if (stage !== 6) return;
    const master = masterGainRef.current;
    const ctx = audioCtxRef.current;
    if (!master || !ctx || ctx.state === "closed") return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(1.7, t + 0.4);
  }, [stage]);

  // Skip button after 2s
  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Character cycling during stage 3
  // Bug-fix: charIdx and flash change together so the old card never re-appears
  // after the flash. Timing accelerates via CHAR_DURATIONS[idx].
  useEffect(() => {
    if (stage !== 3) return;
    setCharIdx(0);           // always start at 0
    setFlashFrame(false);
    let idx = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const advance = () => {
      idx++;
      if (idx >= CAST.length) return;
      // Atomically: new card + flash in same React batch → old card never resurfaces
      setCharIdx(idx);
      setFlashFrame(true);
      const t1 = setTimeout(() => setFlashFrame(false), 70);
      timers.push(t1);
      // Schedule next advance using THIS card's display duration
      const dur = CHAR_DURATIONS[idx] ?? 300;
      const t2 = setTimeout(advance, dur);
      timers.push(t2);
    };

    // First card shows for its own duration, then we advance
    const t0 = setTimeout(advance, CHAR_DURATIONS[0]);
    timers.push(t0);
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  const isFlashing = stage === 1 || stage === 4 || flashFrame;

  // ── Tap-to-start handler ─────────────────────────────────────────────────
  // MUST be synchronous: ctx.resume() and audio.play() have to happen inside
  // the same call stack as the user gesture or iOS Safari will block them.
  const handleStart = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state !== "running") {
      ctx.resume().catch(() => {});
    }
    const music = musicRef.current;
    if (music) {
      music.play()
        .then(() => rampVolume(music, 1.0, 1200, musicRampRef))
        .catch(() => {});
    }
    gateOpenedAtRef.current = performance.now();
    setAudioStarted(true);
  }, []);

  // While waiting for tap, render only the start button — no visuals, no audio.
  if (!audioStarted) {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "#000", overflow: "hidden",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 28,
        }}
      >
        <Grain />
        <Scanlines />
        <button
          onClick={handleStart}
          aria-label="Start intro"
          style={{
            position: "relative",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            outline: "none",
            animation: "start-pulse 2.4s ease-in-out infinite",
            filter: [
              "drop-shadow(0 0 28px rgba(0,150,255,0.7))",
              "drop-shadow(0 0 60px rgba(0,100,255,0.4))",
              "drop-shadow(0 0 100px rgba(0,60,220,0.25))",
            ].join(" "),
          }}
        >
          <img
            src={`${base}/logo.svg`}
            alt="A·v·A"
            style={{ width: "clamp(240px, 70vw, 380px)", display: "block", pointerEvents: "none" }}
          />
        </button>
        <div style={{
          fontFamily: BRAND_FONT, fontSize: "clamp(11px, 3vw, 14px)",
          letterSpacing: "0.5em", color: "rgba(255,255,255,0.55)",
          textTransform: "uppercase", fontWeight: 700,
          animation: "fade-up 0.6s 0.2s ease-out both",
          pointerEvents: "none",
        }}>
          Tap to Begin
        </div>
        <style>{`
          @keyframes start-pulse {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.06); }
          }
          @keyframes fade-up {
            0%   { opacity:0; transform: translateY(10px); }
            100% { opacity:1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      onClick={canSkip ? finish : undefined}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        overflow: "hidden",
        background: isFlashing ? "#fff" : "#000",
        opacity: exiting ? 0 : 1,
        transition: exiting
          ? "opacity 650ms ease"
          : isFlashing ? "none" : "background 80ms linear",
        cursor: canSkip ? "pointer" : "default",
      }}
    >
      <Grain />
      <Scanlines />

      {stage === 2 && <AvaTitle />}

      {stage === 3 && !flashFrame && (
        <CharCard key={charIdx} char={CAST[charIdx]} idx={charIdx} duration={CHAR_DURATIONS[charIdx]} />
      )}

      {stage === 5 && <AnyoneVsAnyone />}

      {stage === 6 && <FinalLogo />}

      {/* SKIP button */}
      {canSkip && stage < 7 && !exiting && (
        <button
          onClick={(e) => { e.stopPropagation(); finish(); }}
          style={{
            position: "absolute", bottom: 32, right: 24,
            background: "none",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.35)",
            fontSize: 9, fontWeight: 800,
            letterSpacing: "0.3em", textTransform: "uppercase",
            padding: "7px 16px", cursor: "pointer",
            fontFamily: "inherit",
            animation: "fade-up 0.4s ease-out both",
          }}
        >
          SKIP ›
        </button>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes ring-in {
          0%   { opacity:0; transform: scale(0.25) rotate(-15deg); }
          55%  { opacity:1; transform: scale(1.06) rotate(2deg); }
          75%  { transform: scale(0.97) rotate(-1deg); }
          100% { opacity:1; transform: scale(1) rotate(0deg); }
        }
        @keyframes ring-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ring-spin-reverse {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes crash-left {
          0%   { opacity:0; transform: translateX(-120px) skewX(-6deg); filter: blur(8px); }
          60%  { opacity:1; transform: translateX(6px) skewX(1deg); filter: blur(0); }
          80%  { transform: translateX(-2px) skewX(0); }
          100% { opacity:1; transform: translateX(0) skewX(0); }
        }
        @keyframes crash-right {
          0%   { opacity:0; transform: translateX(120px) skewX(6deg); filter: blur(8px); }
          60%  { opacity:1; transform: translateX(-6px) skewX(-1deg); filter: blur(0); }
          80%  { transform: translateX(2px) skewX(0); }
          100% { opacity:1; transform: translateX(0) skewX(0); }
        }
        @keyframes crash-center {
          0%   { opacity:0; transform: scale(2.5); filter: blur(12px); }
          50%  { opacity:1; transform: scale(0.92); filter: blur(0); }
          70%  { transform: scale(1.04); }
          100% { opacity:1; transform: scale(1); }
        }
        @keyframes glitch-tear {
          0%   { transform: scaleX(0); opacity:0; }
          40%  { transform: scaleX(1.2); opacity:1; }
          70%  { transform: scaleX(0.6); opacity:0.6; }
          100% { transform: scaleX(1); opacity:0; }
        }
        @keyframes shockwave {
          0%   { transform: scale(0); opacity:0.8; }
          100% { transform: scale(2.5); opacity:0; }
        }
        @keyframes ken-burns {
          0%   { transform: scale(1.12); }
          100% { transform: scale(1.0); }
        }
        @keyframes bar-drop {
          0%   { transform: scaleY(0); transform-origin: top; opacity:0; }
          100% { transform: scaleY(1); transform-origin: top; opacity:1; }
        }
        @keyframes slide-up-text {
          0%   { opacity:0; transform: translateY(40px); }
          60%  { opacity:1; transform: translateY(-4px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes slide-right-text {
          0%   { opacity:0; transform: translateX(-30px); }
          60%  { opacity:1; transform: translateX(3px); }
          100% { opacity:1; transform: translateX(0); }
        }
        @keyframes text-slam {
          0%   { opacity:0; transform: scale(1.15); filter: blur(4px); }
          50%  { opacity:1; transform: scale(0.98); filter: blur(0); }
          100% { opacity:1; transform: scale(1); }
        }
        @keyframes flash-wipe {
          0%   { opacity:1; }
          100% { opacity:0; }
        }
        @keyframes slam-from-left {
          0%   { opacity:0; transform: translateX(-110vw); }
          70%  { opacity:1; transform: translateX(6px); }
          85%  { transform: translateX(-3px); }
          100% { opacity:1; transform: translateX(0); }
        }
        @keyframes slam-from-right {
          0%   { opacity:0; transform: translateX(110vw); }
          70%  { opacity:1; transform: translateX(-6px); }
          85%  { transform: translateX(3px); }
          100% { opacity:1; transform: translateX(0); }
        }
        @keyframes vs-explode {
          0%   { opacity:0; transform: scale(0.3); filter: blur(20px); }
          55%  { opacity:1; transform: scale(1.06); filter: blur(0); }
          75%  { transform: scale(0.97); }
          100% { opacity:1; transform: scale(1); }
        }
        @keyframes energy-line {
          0%   { transform: scaleX(0); opacity:0; }
          50%  { opacity:1; transform: scaleX(1); }
          100% { opacity:0.4; transform: scaleX(1); }
        }
        @keyframes shake {
          0%   { transform: translate(0,0); }
          15%  { transform: translate(-5px, 3px); }
          30%  { transform: translate(4px, -2px); }
          45%  { transform: translate(-3px, 1px); }
          60%  { transform: translate(2px, -1px); }
          75%  { transform: translate(-1px, 1px); }
          100% { transform: translate(0,0); }
        }
        @keyframes logo-assemble {
          0%   { opacity:0; transform: translateY(30px) scale(0.94); filter: blur(6px); }
          60%  { opacity:1; transform: translateY(-4px) scale(1.01); filter: blur(0); }
          80%  { transform: translateY(1px) scale(1); }
          100% { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes bar-expand {
          0%   { transform: scaleX(0); opacity:0; transform-origin: center; }
          100% { transform: scaleX(1); opacity:1; transform-origin: center; }
        }
        @keyframes fade-up {
          0%   { opacity:0; transform: translateY(12px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes ring-expand {
          0%   { transform: scale(0.6); opacity:0.5; }
          100% { transform: scale(2); opacity:0; }
        }
        @keyframes breathe {
          0%   { transform: scale(0.9); opacity:0.6; }
          100% { transform: scale(1.15); opacity:1; }
        }
      `}</style>
    </div>
  );
}
