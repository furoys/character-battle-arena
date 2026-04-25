import { useEffect, useState, useRef } from "react";

const SKIP_DELAY = 800;

const FIGHTERS = [
  { name: "SPIDER-MAN",  color: "#ff0055" },
  { name: "DARTH VADER", color: "#c084fc" },
  { name: "GOKU",        color: "#f59e0b" },
  { name: "SPAWN",       color: "#00f0ff" },
  { name: "WOLVERINE",   color: "#facc15" },
];

const STAGE_DURATIONS = [
  500,   // 0 → black noise
  180,   // 1 → white flash
  750,   // 2 → A·v·A glitch in
  1500,  // 3 → fighter name rapid cuts (300ms × 5)
  900,   // 4 → ANYONE VS ANYONE slab
  1300,  // 5 → logo + tagline assembled
  700,   // 6 → outro flash → done
];

function totalBefore(stage: number) {
  return STAGE_DURATIONS.slice(0, stage).reduce((a, b) => a + b, 0);
}

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;

export function IntroSequence({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const [fighterIdx, setFighterIdx] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    setTimeout(onDone, 550);
  };

  useEffect(() => {
    const skipTimer = setTimeout(() => setCanSkip(true), SKIP_DELAY);
    return () => clearTimeout(skipTimer);
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const advance = (s: number) => {
      if (s >= STAGE_DURATIONS.length) { finish(); return; }
      t = setTimeout(() => { setStage(s); advance(s + 1); }, STAGE_DURATIONS[s - 1] ?? 0);
    };
    advance(1);
    return () => clearTimeout(t);
  }, []);

  // Fighter name cycle during stage 3
  useEffect(() => {
    if (stage !== 3) return;
    let idx = 0;
    const cycle = () => {
      idx++;
      if (idx >= FIGHTERS.length) return;
      setFighterIdx(idx);
      setTimeout(cycle, 300);
    };
    const t = setTimeout(cycle, 300);
    return () => clearTimeout(t);
  }, [stage]);

  const fighter = FIGHTERS[fighterIdx];

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: stage === 1 ? "#ffffff" : "#000000",
    opacity: exiting ? 0 : 1,
    transition: exiting ? "opacity 500ms ease" : stage === 1 ? "none" : "background 250ms ease",
  };

  return (
    <div style={containerStyle} onClick={canSkip ? finish : undefined}>
      {/* Grain overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: NOISE_SVG,
        backgroundSize: "200px 200px",
        opacity: stage === 1 ? 0 : 0.6,
      }} />

      {/* Scanlines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px)",
        opacity: stage === 1 ? 0 : 1,
      }} />

      {/* ── Stage 0-1: Black / White flash — nothing shown ── */}

      {/* ── Stage 2: A·v·A glitch-in ── */}
      {stage === 2 && (
        <div style={{ textAlign: "center", animation: "ava-glitch-in 0.6s ease-out forwards" }}>
          <div style={{
            fontFamily: "monospace",
            fontSize: "clamp(64px, 22vw, 120px)",
            fontWeight: 900,
            letterSpacing: "0.04em",
            color: "#fff",
            textShadow: "0 0 40px rgba(255,0,85,0.9), 0 0 80px rgba(255,0,85,0.4)",
            lineHeight: 1,
          }}>
            A<span style={{ color: "#ff0055", textShadow: "0 0 30px #ff0055" }}>·v·</span>A
          </div>
        </div>
      )}

      {/* ── Stage 3: Fighter name rapid cuts ── */}
      {stage === 3 && (
        <div style={{
          textAlign: "center",
          animation: "fighter-slam 0.18s cubic-bezier(0.22,1,0.36,1) forwards",
          key: fighterIdx,
        }}>
          <div style={{
            fontSize: "clamp(10px, 3.5vw, 14px)",
            letterSpacing: "0.55em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            marginBottom: 10,
            fontWeight: 700,
          }}>VS ANYONE</div>
          <div style={{
            fontFamily: "'Arial Black', sans-serif",
            fontSize: "clamp(52px, 18vw, 100px)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: fighter?.color ?? "#fff",
            textShadow: `0 0 60px ${fighter?.color ?? "#fff"}99, 0 0 120px ${fighter?.color ?? "#fff"}40`,
            lineHeight: 0.9,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            {fighter?.name}
          </div>
        </div>
      )}

      {/* ── Stage 4: ANYONE VS ANYONE ── */}
      {stage === 4 && (
        <div style={{ textAlign: "center", animation: "slab-in 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}>
          <div style={{
            fontFamily: "'Arial Black', sans-serif",
            fontSize: "clamp(36px, 11vw, 70px)",
            fontWeight: 900,
            letterSpacing: "0.06em",
            color: "#ffffff",
            textTransform: "uppercase",
            lineHeight: 1,
            textShadow: "0 4px 30px rgba(0,0,0,0.8)",
          }}>ANYONE</div>
          <div style={{
            fontFamily: "'Arial Black', sans-serif",
            fontSize: "clamp(60px, 22vw, 130px)",
            fontWeight: 900,
            letterSpacing: "0em",
            color: "#ff0055",
            textTransform: "uppercase",
            lineHeight: 0.85,
            textShadow: "0 0 60px rgba(255,0,85,0.9), 0 0 120px rgba(255,0,85,0.5)",
            animation: "vs-pulse 0.5s ease-out forwards",
          }}>VS</div>
          <div style={{
            fontFamily: "'Arial Black', sans-serif",
            fontSize: "clamp(36px, 11vw, 70px)",
            fontWeight: 900,
            letterSpacing: "0.06em",
            color: "#ffffff",
            textTransform: "uppercase",
            lineHeight: 1,
            textShadow: "0 4px 30px rgba(0,0,0,0.8)",
          }}>ANYONE</div>
        </div>
      )}

      {/* ── Stage 5: Full logo assembled ── */}
      {stage >= 5 && stage < 6 && (
        <div style={{
          textAlign: "center",
          animation: "logo-assemble 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}>
          {/* Red accent bar */}
          <div style={{
            width: 48, height: 2, background: "#ff0055",
            boxShadow: "0 0 20px #ff0055",
            animation: "bar-expand 0.4s 0.15s ease-out both",
          }} />

          {/* Main logotype */}
          <div>
            <div style={{
              fontFamily: "monospace",
              fontSize: "clamp(72px, 24vw, 140px)",
              fontWeight: 900,
              letterSpacing: "-0.01em",
              color: "#ffffff",
              textShadow: "0 0 60px rgba(0,240,255,0.5), 0 0 120px rgba(0,240,255,0.2)",
              lineHeight: 1,
            }}>
              A<span style={{ color: "#ff0055", textShadow: "0 0 40px #ff0055, 0 0 80px rgba(255,0,85,0.5)" }}>·v·</span>A
            </div>
            <div style={{
              fontSize: "clamp(8px, 2.5vw, 11px)",
              letterSpacing: "0.55em",
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
              fontWeight: 700,
              marginTop: 6,
              animation: "fade-up 0.5s 0.35s ease-out both",
            }}>
              Anyone vs Anyone
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            width: 48, height: 2, background: "#ff0055",
            boxShadow: "0 0 20px #ff0055",
            animation: "bar-expand 0.4s 0.15s ease-out both",
          }} />

          {/* Glow rings */}
          <div style={{
            position: "absolute",
            width: "60vw", height: "60vw",
            maxWidth: 400, maxHeight: 400,
            borderRadius: "50%",
            border: "1px solid rgba(255,0,85,0.12)",
            boxShadow: "0 0 80px rgba(255,0,85,0.08) inset",
            animation: "ring-pulse 1.2s ease-out infinite",
            pointerEvents: "none",
          }} />
        </div>
      )}

      {/* ── Stage 6: outro flash ── */}
      {stage === 6 && (
        <div style={{ animation: "outro-flash 0.6s ease-out forwards", position: "absolute", inset: 0, background: "#fff" }} />
      )}

      {/* Skip button */}
      {canSkip && stage < 6 && !exiting && (
        <button
          onClick={(e) => { e.stopPropagation(); finish(); }}
          style={{
            position: "absolute",
            bottom: 32, right: 24,
            background: "none",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.4)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            padding: "6px 14px",
            cursor: "pointer",
            fontFamily: "inherit",
            animation: "fade-up 0.4s ease-out both",
          }}
        >
          SKIP ›
        </button>
      )}

      <style>{`
        @keyframes ava-glitch-in {
          0%   { opacity: 0; transform: scale(1.4); filter: blur(12px); }
          40%  { opacity: 1; transform: scale(0.96); filter: blur(0); }
          60%  { transform: scale(1.03); }
          80%  { transform: scale(0.99); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes fighter-slam {
          0%   { opacity: 0; transform: translateX(-60px) skewX(-8deg); filter: blur(6px); }
          60%  { opacity: 1; transform: translateX(4px) skewX(0deg); filter: blur(0); }
          100% { opacity: 1; transform: translateX(0) skewX(0deg); }
        }
        @keyframes slab-in {
          0%   { opacity: 0; transform: scale(0.8); filter: blur(8px); }
          60%  { opacity: 1; transform: scale(1.02); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes vs-pulse {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes logo-assemble {
          0%   { opacity: 0; transform: translateY(24px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes bar-expand {
          0%   { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes fade-up {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ring-pulse {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes outro-flash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
