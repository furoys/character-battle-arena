import { useEffect, useState, useRef, useCallback } from "react";

// ── Cast ──────────────────────────────────────────────────────────────────────
const CAST = [
  { name: "GOKU",          sub: "Dragon Ball Z",       img: "goku.jpg",          color: "#f59e0b" },
  { name: "BATMAN",        sub: "Legacy Comics",       img: "batman.jpg",        color: "#c084fc" },
  { name: "SPAWN",         sub: "Image Comics",        img: "spawn.jpg",         color: "#00f0ff" },
  { name: "DARTH VADER",   sub: "Star Wars",           img: "darth-vader.jpg",   color: "#a855f7" },
  { name: "DEADPOOL",      sub: "Multiverse Comics",   img: "deadpool.jpg",      color: "#ef4444" },
  { name: "KRATOS",        sub: "God of War",          img: "kratos.jpg",        color: "#dc2626" },
  { name: "MILES MORALES", sub: "Spider-Verse",        img: "miles-morales.jpg", color: "#3b82f6" },
  { name: "PITT",          sub: "Full Bleed Studios",  img: "pitt.jpg",          color: "#00f0ff" },
];

// ── Stage durations (ms) ──────────────────────────────────────────────────────
//  0 → black static awakening
//  1 → opening crackle-flash
//  2 → A·v·A logo crashes in
//  3 → character showcase  (CHAR_DURATION × CAST.length)
//  4 → impact flash between showcase and ANYONE VS ANYONE
//  5 → ANYONE VS ANYONE slab collision
//  6 → full logo assembled, rings breathing
//  7 → iris-out fade
const CHAR_DURATION = 900;
const STAGE_DURATIONS = [
  800,                          // 0
  120,                          // 1
  1800,                         // 2
  CHAR_DURATION * CAST.length,  // 3 = 7200
  200,                          // 4
  2200,                         // 5
  2600,                         // 6
  700,                          // 7
];

const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function useStage(onFinish: () => void) {
  const [stage, setStage] = useState(0);
  const cleanupRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
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
  }, []);

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

/** Stage 2 — A·v·A crashes in with glitch energy */
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
          background: `rgba(255,0,85,${0.25 + i * 0.1})`,
          animation: `glitch-tear ${0.4 + i * 0.15}s ${i * 0.08}s ease-out both`,
        }} />
      ))}

      {/* Letters */}
      <div style={{ display: "flex", alignItems: "center", lineHeight: 1, gap: 0 }}>
        <span style={{
          fontFamily: "monospace", fontWeight: 900,
          fontSize: "clamp(80px, 26vw, 150px)",
          color: "#fff",
          textShadow: "0 0 60px rgba(255,0,85,0.7), 0 0 120px rgba(255,0,85,0.3)",
          animation: "crash-left 0.45s cubic-bezier(0.16,1,0.3,1) both",
          display: "inline-block",
        }}>A</span>

        <span style={{
          fontFamily: "monospace", fontWeight: 900,
          fontSize: "clamp(48px, 16vw, 90px)",
          color: "#ff0055",
          textShadow: "0 0 40px #ff0055, 0 0 80px rgba(255,0,85,0.7)",
          animation: "crash-center 0.4s 0.15s cubic-bezier(0.16,1,0.3,1) both",
          display: "inline-block",
        }}>·v·</span>

        <span style={{
          fontFamily: "monospace", fontWeight: 900,
          fontSize: "clamp(80px, 26vw, 150px)",
          color: "#fff",
          textShadow: "0 0 60px rgba(255,0,85,0.7), 0 0 120px rgba(255,0,85,0.3)",
          animation: "crash-right 0.45s cubic-bezier(0.16,1,0.3,1) both",
          display: "inline-block",
        }}>A</span>
      </div>

      <div style={{
        fontSize: "clamp(9px, 2.8vw, 13px)", letterSpacing: "0.6em",
        color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
        fontWeight: 700, marginTop: 18,
        animation: "fade-up 0.7s 0.6s ease-out both",
      }}>
        Anyone vs Anyone
      </div>

      {/* Shockwave ring */}
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: "80vw", height: "80vw", maxWidth: 600, maxHeight: 600,
        border: "1px solid rgba(255,0,85,0.4)",
        animation: "shockwave 1.8s 0.2s ease-out both",
        pointerEvents: "none",
      }} />
    </div>
  );
}

/** Stage 3 — One character at a time, full-screen cinematic portrait */
function CharCard({ char, idx }: { char: typeof CAST[0]; idx: number }) {
  const fromRight = idx % 2 === 1;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Portrait */}
      <img
        src={imgUrl(char.img)}
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "top center",
          animation: "ken-burns 0.9s ease-out both",
          transformOrigin: "center top",
        }}
      />

      {/* Layered overlays */}
      <div style={{
        position: "absolute", inset: 0,
        background: [
          "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.55) 35%, transparent 65%)",
          "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%)",
          `radial-gradient(ellipse at ${fromRight ? "70%" : "30%"} 50%, ${char.color}18 0%, transparent 55%)`,
        ].join(", "),
      }} />

      {/* Colored accent bar — left or right alternating */}
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        [fromRight ? "right" : "left"]: 0,
        width: 5,
        background: char.color,
        boxShadow: `0 0 40px ${char.color}, 0 0 80px ${char.color}60`,
        animation: "bar-drop 0.5s ease-out both",
      }} />

      {/* Character info — bottom */}
      <div style={{
        position: "absolute", bottom: 64, left: 24, right: 24,
        animation: `slide-up-text 0.45s 0.18s cubic-bezier(0.16,1,0.3,1) both`,
      }}>
        <div style={{
          fontSize: "clamp(8px, 2.5vw, 10px)", letterSpacing: "0.5em",
          color: char.color, textTransform: "uppercase", fontWeight: 800,
          textShadow: `0 0 20px ${char.color}`,
          marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            display: "inline-block", width: 24, height: 1.5,
            background: char.color, boxShadow: `0 0 8px ${char.color}`,
          }} />
          vs anyone
          <span style={{
            display: "inline-block", width: 24, height: 1.5,
            background: char.color, boxShadow: `0 0 8px ${char.color}`,
          }} />
        </div>

        <div style={{
          fontFamily: "'Arial Black', 'Impact', sans-serif",
          fontSize: "clamp(38px, 13vw, 76px)",
          fontWeight: 900, lineHeight: 0.88,
          color: "#ffffff", textTransform: "uppercase",
          letterSpacing: "-0.02em",
          textShadow: `0 2px 30px rgba(0,0,0,0.9), 0 0 60px ${char.color}30`,
        }}>
          {char.name}
        </div>

        <div style={{
          fontSize: "clamp(8px, 2.2vw, 10px)", letterSpacing: "0.3em",
          color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
          fontWeight: 600, marginTop: 10,
        }}>
          {char.sub}
        </div>
      </div>

      {/* Entry flash-wipe */}
      <div style={{
        position: "absolute", inset: 0,
        background: "#fff",
        animation: "flash-wipe 0.18s ease-out both",
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
      {/* Top ANYONE */}
      <div style={{
        fontFamily: "'Arial Black', 'Impact', sans-serif",
        fontSize: "clamp(44px, 15vw, 90px)",
        fontWeight: 900, letterSpacing: "0.04em",
        color: "#fff", textTransform: "uppercase",
        lineHeight: 1, whiteSpace: "nowrap",
        textShadow: "0 0 40px rgba(255,255,255,0.25)",
        animation: "slam-from-left 0.4s cubic-bezier(0.16,1,0.3,1) both",
      }}>ANYONE</div>

      {/* VS — blood red explosion */}
      <div style={{
        fontFamily: "'Arial Black', 'Impact', sans-serif",
        fontSize: "clamp(100px, 38vw, 220px)",
        fontWeight: 900, lineHeight: 0.78,
        color: "#ff0055",
        textShadow: "0 0 80px #ff0055, 0 0 160px rgba(255,0,85,0.6), 0 0 240px rgba(255,0,85,0.3)",
        letterSpacing: "-0.04em",
        animation: "vs-explode 0.45s 0.15s cubic-bezier(0.16,1,0.3,1) both",
      }}>VS</div>

      {/* Bottom ANYONE */}
      <div style={{
        fontFamily: "'Arial Black', 'Impact', sans-serif",
        fontSize: "clamp(44px, 15vw, 90px)",
        fontWeight: 900, letterSpacing: "0.04em",
        color: "#fff", textTransform: "uppercase",
        lineHeight: 1, whiteSpace: "nowrap",
        textShadow: "0 0 40px rgba(255,255,255,0.25)",
        animation: "slam-from-right 0.4s 0.08s cubic-bezier(0.16,1,0.3,1) both",
      }}>ANYONE</div>

      {/* Horizontal energy line */}
      <div style={{
        position: "absolute",
        left: 0, right: 0,
        top: "50%", height: 2,
        background: "linear-gradient(90deg, transparent 0%, #ff0055 20%, #fff 50%, #ff0055 80%, transparent 100%)",
        boxShadow: "0 0 30px #ff0055, 0 0 60px rgba(255,0,85,0.5)",
        animation: "energy-line 0.5s 0.2s ease-out both",
        pointerEvents: "none",
      }} />
    </div>
  );
}

/** Stage 6 — Full A·v·A logo, assembled and breathing */
function FinalLogo() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      {/* Top accent line */}
      <div style={{
        width: 64, height: 2, background: "#ff0055",
        boxShadow: "0 0 24px #ff0055",
        animation: "bar-expand 0.5s ease-out both",
        marginBottom: 24,
      }} />

      {/* Logo */}
      <div style={{
        fontFamily: "monospace", fontWeight: 900,
        fontSize: "clamp(80px, 28vw, 160px)",
        color: "#fff", lineHeight: 1,
        textShadow: "0 0 60px rgba(0,240,255,0.4), 0 0 120px rgba(0,240,255,0.2)",
        animation: "logo-assemble 0.55s cubic-bezier(0.16,1,0.3,1) both",
      }}>
        A<span style={{
          color: "#ff0055",
          textShadow: "0 0 50px #ff0055, 0 0 100px rgba(255,0,85,0.6)",
        }}>·v·</span>A
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: "clamp(9px, 3vw, 13px)", letterSpacing: "0.65em",
        color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
        fontWeight: 700, marginTop: 18,
        animation: "fade-up 0.7s 0.4s ease-out both",
      }}>
        Anyone vs Anyone
      </div>

      {/* Bottom accent line */}
      <div style={{
        width: 64, height: 2, background: "#ff0055",
        boxShadow: "0 0 24px #ff0055",
        animation: "bar-expand 0.5s 0.1s ease-out both",
        marginTop: 24,
      }} />

      {/* Three expanding shockwave rings */}
      {[0, 0.4, 0.8].map((delay) => (
        <div key={delay} style={{
          position: "absolute",
          width: "75vw", height: "75vw", maxWidth: 520, maxHeight: 520,
          borderRadius: "50%",
          border: "1px solid rgba(255,0,85,0.25)",
          animation: `ring-expand 2.4s ${delay}s ease-out infinite`,
          pointerEvents: "none",
        }} />
      ))}

      {/* Breathing glow blob */}
      <div style={{
        position: "absolute",
        width: "50vw", height: "50vw", maxWidth: 360, maxHeight: 360,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,0,85,0.08) 0%, transparent 70%)",
        animation: "breathe 2s 0.5s ease-in-out infinite alternate",
        pointerEvents: "none",
      }} />
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

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    setTimeout(onDone, 650);
  }, [onDone]);

  const stage = useStage(finish);

  // Preload all character images
  useEffect(() => {
    CAST.forEach(c => { const i = new Image(); i.src = imgUrl(c.img); });
  }, []);

  // Skip button after 2s
  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Character cycling during stage 3
  useEffect(() => {
    if (stage !== 3) return;
    let idx = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const step = () => {
      idx++;
      if (idx >= CAST.length) return;
      // Short white flash between chars
      setFlashFrame(true);
      const t1 = setTimeout(() => setFlashFrame(false), 80);
      const t2 = setTimeout(() => { setCharIdx(idx); step(); }, CHAR_DURATION);
      timers.push(t1, t2);
    };
    const t0 = setTimeout(step, CHAR_DURATION);
    timers.push(t0);
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  const isFlashing = stage === 1 || stage === 4 || flashFrame;

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
        <CharCard key={charIdx} char={CAST[charIdx]} idx={charIdx} />
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
