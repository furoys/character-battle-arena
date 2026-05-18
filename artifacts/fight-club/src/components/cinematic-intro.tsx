import { useEffect, useMemo, useState } from "react";
import type { Character } from "@workspace/api-client-react";

type Phase = "fadeIn" | "logo" | "montage" | "duel" | "stinger" | "done";

interface Props {
  pickA: Character;
  pickB: Character;
  montage: Character[];
  onComplete: () => void;
  onSkip: () => void;
}

const PHASE_MS: Record<Phase, number> = {
  fadeIn: 700,
  logo: 2200,
  montage: 3000,
  duel: 2600,
  stinger: 1500,
  done: 0,
};

export function CinematicIntro({ pickA, pickB, montage, onComplete, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>("fadeIn");

  useEffect(() => {
    if (phase === "done") {
      onComplete();
      return;
    }
    const t = window.setTimeout(() => {
      setPhase(prev => {
        switch (prev) {
          case "fadeIn": return "logo";
          case "logo": return "montage";
          case "montage": return "duel";
          case "duel": return "stinger";
          case "stinger": return "done";
          default: return prev;
        }
      });
    }, PHASE_MS[phase]);
    return () => window.clearTimeout(t);
  }, [phase, onComplete]);

  const montagePicks = useMemo(() => {
    const taken = new Set([pickA.id, pickB.id]);
    const pool = montage.filter(c => c.imageUrl && !taken.has(c.id));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  }, [pickA.id, pickB.id, montage]);

  return (
    <div
      role="dialog"
      aria-label="Cinematic intro"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 95,
        background: "#000",
        opacity: phase === "fadeIn" ? 0 : 1,
        transition: "opacity 500ms ease",
        overflow: "hidden",
      }}
    >
      {/* Ambient red vignette pulse — runs throughout */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(120,0,30,0.35) 0%, rgba(0,0,0,0.85) 70%, #000 100%)",
          animation: "cinePulse 3.4s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* LOGO PHASE */}
      {(phase === "logo") && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            animation: "cineFadeIn 600ms ease both",
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "min(22vw, 180px)",
              lineHeight: 0.9,
              letterSpacing: "0.12em",
              color: "#fff",
              textShadow:
                "0 0 24px rgba(255,0,85,0.9), 0 0 60px rgba(255,0,85,0.55), 0 6px 18px rgba(0,0,0,0.9)",
              animation: "cineLogoSlam 900ms cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            A.v.A
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "min(5vw, 22px)",
              letterSpacing: "0.6em",
              paddingLeft: "0.6em",
              color: "rgba(255,255,255,0.78)",
              textShadow: "0 0 12px rgba(255,0,85,0.6)",
              animation: "cineTaglineIn 1200ms ease 500ms both",
            }}
          >
            ANYONE&nbsp;VS&nbsp;ANYONE
          </div>
        </div>
      )}

      {/* MONTAGE PHASE — rapid character flashes */}
      {(phase === "montage") && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: "cineFadeIn 300ms ease both",
          }}
        >
          {montagePicks.map((c, i) => {
            const delay = i * 320;
            // Pseudo-random offsets keyed by id — stable per render.
            const seed = (c.id * 9301 + 49297) % 233280;
            const tx = (seed % 60) - 30; // -30..30vw
            const ty = ((seed >> 4) % 40) - 20; // -20..20vh
            const rot = ((seed >> 2) % 14) - 7;
            return (
              <div
                key={c.id}
                style={{
                  position: "absolute",
                  left: `calc(50% + ${tx}vw)`,
                  top: `calc(50% + ${ty}vh)`,
                  transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                  width: "min(48vw, 280px)",
                  height: "min(64vw, 360px)",
                  opacity: 0,
                  animation: `cineFlash 600ms ease ${delay}ms both`,
                  filter: "drop-shadow(0 0 18px rgba(255,0,85,0.6))",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "2px solid rgba(255,0,85,0.6)",
                  background: "#111",
                }}
              >
                {c.imageUrl && (
                  <img
                    src={c.imageUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "top",
                      filter: "contrast(1.1) saturate(1.2)",
                    }}
                  />
                )}
              </div>
            );
          })}
          {/* Quick caption flashes layered on top */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              textAlign: "center",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "min(9vw, 56px)",
              letterSpacing: "0.3em",
              color: "#fff",
              textShadow: "0 0 24px rgba(255,0,85,0.9), 0 4px 12px #000",
              animation: "cineCaptionCycle 3000ms steps(3, end) both",
              pointerEvents: "none",
            }}
          >
            <div style={{ animation: "cineCap1 1000ms ease both" }}>HEROES.</div>
            <div style={{ marginTop: 6, animation: "cineCap2 1000ms ease 1000ms both", opacity: 0 }}>VILLAINS.</div>
            <div style={{ marginTop: 6, animation: "cineCap3 1000ms ease 2000ms both", opacity: 0 }}>LEGENDS.</div>
          </div>
        </div>
      )}

      {/* DUEL PHASE — split-screen slow-zoom */}
      {(phase === "duel") && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            animation: "cineFadeIn 400ms ease both",
          }}
        >
          {/* LEFT — pickA */}
          <div style={{ position: "relative", overflow: "hidden" }}>
            {pickA.imageUrl && (
              <img
                src={pickA.imageUrl}
                alt={pickA.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                  animation: "cineZoomL 2600ms ease-out both",
                  filter: "contrast(1.15) saturate(1.2) brightness(0.95)",
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.85) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "6%",
                bottom: "8%",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "min(7vw, 38px)",
                letterSpacing: "0.18em",
                color: "#fff",
                textShadow: "0 0 12px rgba(255,0,85,0.8), 0 4px 8px #000",
                animation: "cineNameInL 1100ms ease 600ms both",
                maxWidth: "85%",
                lineHeight: 1.0,
              }}
            >
              {pickA.name}
            </div>
          </div>
          {/* RIGHT — pickB */}
          <div style={{ position: "relative", overflow: "hidden" }}>
            {pickB.imageUrl && (
              <img
                src={pickB.imageUrl}
                alt={pickB.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                  animation: "cineZoomR 2600ms ease-out both",
                  filter: "contrast(1.15) saturate(1.2) brightness(0.95)",
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(270deg, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.85) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "6%",
                bottom: "8%",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "min(7vw, 38px)",
                letterSpacing: "0.18em",
                color: "#fff",
                textShadow: "0 0 12px rgba(255,0,85,0.8), 0 4px 8px #000",
                animation: "cineNameInR 1100ms ease 600ms both",
                textAlign: "right",
                maxWidth: "85%",
                lineHeight: 1.0,
              }}
            >
              {pickB.name}
            </div>
          </div>
          {/* CENTER VS */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "min(28vw, 200px)",
              color: "#ff0055",
              letterSpacing: "-0.04em",
              textShadow:
                "0 0 40px #ff0055, 0 0 80px rgba(255,0,85,0.7), 0 6px 18px #000",
              animation: "cineVsSlam 700ms cubic-bezier(0.2, 1.6, 0.4, 1) 900ms both",
              pointerEvents: "none",
            }}
          >
            VS
          </div>
        </div>
      )}

      {/* STINGER PHASE */}
      {(phase === "stinger") && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
            animation: "cineFadeIn 300ms ease both",
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "min(14vw, 96px)",
              letterSpacing: "0.18em",
              color: "#fff",
              textShadow:
                "0 0 30px rgba(255,0,85,0.95), 0 0 80px rgba(255,0,85,0.5), 0 8px 24px #000",
              animation: "cineStinger 1500ms cubic-bezier(0.16, 1, 0.3, 1) both",
              textAlign: "center",
              lineHeight: 0.95,
            }}
          >
            YOUR FIRST<br />FIGHT
          </div>
        </div>
      )}

      {/* SKIP */}
      {phase !== "done" && (
        <button
          onClick={onSkip}
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            padding: "8px 14px",
            background: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "rgba(255,255,255,0.65)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: "pointer",
            pointerEvents: "auto",
            zIndex: 2,
          }}
        >
          Skip Intro
        </button>
      )}

      <style>{`
        @keyframes cinePulse {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1; }
        }
        @keyframes cineFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cineLogoSlam {
          0%   { transform: scale(2.4); opacity: 0; letter-spacing: 0.4em; filter: blur(8px); }
          60%  { transform: scale(0.96); opacity: 1; letter-spacing: 0.10em; filter: blur(0); }
          100% { transform: scale(1);    opacity: 1; letter-spacing: 0.12em; }
        }
        @keyframes cineTaglineIn {
          0%   { opacity: 0; transform: translateY(8px); letter-spacing: 1em; }
          100% { opacity: 1; transform: translateY(0);   letter-spacing: 0.6em; }
        }
        @keyframes cineFlash {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6) rotate(var(--r, 0deg)); }
          30%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
          70%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes cineCap1 { 0% { opacity: 0; transform: scale(0.6); } 30%, 90% { opacity: 1; transform: scale(1); } 100% { opacity: 0; } }
        @keyframes cineCap2 { 0% { opacity: 0; transform: scale(0.6); } 30%, 90% { opacity: 1; transform: scale(1); } 100% { opacity: 0; } }
        @keyframes cineCap3 { 0% { opacity: 0; transform: scale(0.6); } 30%, 90% { opacity: 1; transform: scale(1); } 100% { opacity: 0; } }
        @keyframes cineCaptionCycle { from {} to {} }
        @keyframes cineZoomL {
          0%   { transform: scale(1.4) translateX(0); }
          100% { transform: scale(1.0) translateX(-2%); }
        }
        @keyframes cineZoomR {
          0%   { transform: scale(1.4) translateX(0); }
          100% { transform: scale(1.0) translateX(2%); }
        }
        @keyframes cineNameInL {
          0%   { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes cineNameInR {
          0%   { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes cineVsSlam {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(3.2); filter: blur(6px); }
          60%  { opacity: 1; transform: translate(-50%, -50%) scale(0.9); filter: blur(0); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes cineStinger {
          0%   { opacity: 0; transform: scale(0.4); letter-spacing: 0.6em; filter: blur(10px); }
          40%  { opacity: 1; transform: scale(1.05); letter-spacing: 0.15em; filter: blur(0); }
          100% { opacity: 1; transform: scale(1);   letter-spacing: 0.18em; }
        }
      `}</style>
    </div>
  );
}
