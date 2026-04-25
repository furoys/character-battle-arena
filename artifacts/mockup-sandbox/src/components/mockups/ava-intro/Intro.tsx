import { useEffect, useRef, useState, useCallback } from "react";

type Phase =
  | "black"
  | "logo"
  | "montage"
  | "vs"
  | "glitch"
  | "arena"
  | "whowins"
  | "enter"
  | "done";

function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ctx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  const bassRumble = useCallback((duration = 1.2) => {
    const ac = ctx();
    const buf = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] =
        Math.sin((i / ac.sampleRate) * 2 * Math.PI * 42) * 0.6 *
        Math.exp(-i / (ac.sampleRate * 0.9));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.7, ac.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + duration);
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
  }, [ctx]);

  const electricHum = useCallback((duration = 0.6) => {
    const ac = ctx();
    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 60;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, ac.currentTime + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  }, [ctx]);

  const whoosh = useCallback(() => {
    const ac = ctx();
    const buf = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.08));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(2000, ac.currentTime);
    filter.frequency.linearRampToValueAtTime(200, ac.currentTime + 0.25);
    const gain = ac.createGain();
    gain.gain.value = 0.5;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start();
  }, [ctx]);

  const bassHit = useCallback(() => {
    const ac = ctx();
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.4);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.9, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.5);
  }, [ctx]);

  const impact = useCallback(() => {
    const ac = ctx();
    const buf = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] =
        (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.05)) * 0.8 +
        Math.sin((i / ac.sampleRate) * 2 * Math.PI * 55) * 0.5 *
          Math.exp(-i / (ac.sampleRate * 0.25));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    gain.gain.value = 0.85;
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
  }, [ctx]);

  return { bassRumble, electricHum, whoosh, bassHit, impact };
}

const MONTAGE_SCREENS = [
  {
    label: "CHARACTER SELECT",
    color: "#00f0ff",
    content: (
      <div className="flex gap-2 flex-wrap justify-center mt-4">
        {["Thor", "Hulk", "Batman", "Goku"].map((n) => (
          <div
            key={n}
            style={{
              width: 60, height: 80,
              border: "1.5px solid #00f0ff40",
              background: "linear-gradient(180deg,#00f0ff10 0%,#00f0ff04 100%)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              paddingBottom: 4, fontSize: 7, fontWeight: 700,
              letterSpacing: "0.1em", color: "#00f0ff80",
            }}
          >
            {n.toUpperCase()}
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "ARENA",
    color: "#ff3b30",
    content: (
      <div className="mt-4 flex items-center justify-center">
        <div
          style={{
            width: 220, height: 80,
            background: "linear-gradient(90deg,#ff3b3020,#ff005520,#ff3b3020)",
            border: "1px solid #ff3b3040",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, letterSpacing: "0.3em", color: "#ff3b30",
            fontWeight: 700,
          }}
        >
          BATTLE ARENA
        </div>
      </div>
    ),
  },
  {
    label: "VS",
    color: "#ff0055",
    content: (
      <div className="mt-4 flex items-center justify-center gap-6">
        <div style={{ width: 56, height: 72, borderRadius: "50% 50% 0 0", background: "#00f0ff20", border: "1.5px solid #00f0ff40" }} />
        <span style={{ fontSize: 28, fontWeight: 900, color: "#ff0055", WebkitTextStroke: "1px #ff0055", textShadow: "0 0 20px #ff005580" }}>VS</span>
        <div style={{ width: 56, height: 72, borderRadius: "50% 50% 0 0", background: "#ff3b3020", border: "1.5px solid #ff3b3040" }} />
      </div>
    ),
  },
  {
    label: "ENERGY METER",
    color: "#ffd700",
    content: (
      <div className="mt-4 flex flex-col gap-2 px-4">
        <div style={{ height: 8, background: "#00f0ff20", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: "72%", height: "100%", background: "linear-gradient(90deg,#00f0ff,#00ffcc)" }} />
        </div>
        <div style={{ height: 8, background: "#ff3b3020", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: "44%", height: "100%", background: "linear-gradient(90deg,#ff3b30,#ff0055)" }} />
        </div>
      </div>
    ),
  },
  {
    label: "WINNER",
    color: "#ffd700",
    content: (
      <div className="mt-4 flex items-center justify-center">
        <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.4em", color: "#ffd700", textShadow: "0 0 24px #ffd70080" }}>
          VICTOR
        </div>
      </div>
    ),
  },
];

export function Intro() {
  const [phase, setPhase] = useState<Phase>("black");
  const [montageIdx, setMontageIdx] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const [shake, setShake] = useState(false);
  const [started, setStarted] = useState(false);
  const audio = useAudioEngine();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  const runSequence = useCallback(() => {
    if (started) return;
    setStarted(true);

    // 0.0s — bass rumble
    audio.bassRumble(1.4);

    // 0.7s — logo
    schedule(() => {
      setPhase("logo");
      audio.electricHum(0.8);
    }, 700);

    // 1.5s — montage starts
    schedule(() => setPhase("montage"), 1500);
    schedule(() => { setMontageIdx(0); audio.whoosh(); }, 1500);
    schedule(() => { setMontageIdx(1); audio.whoosh(); }, 1800);
    schedule(() => { setMontageIdx(2); audio.whoosh(); }, 2100);
    schedule(() => { setMontageIdx(3); audio.whoosh(); }, 2400); // overlaps VS phase start but fine

    // 2.4s — VS silhouettes
    schedule(() => { setPhase("vs"); audio.bassHit(); }, 2700);

    // 3.4s — glitch
    schedule(() => {
      setPhase("glitch");
      setGlitchActive(true);
      setShake(true);
      audio.electricHum(0.6);
      setTimeout(() => setShake(false), 400);
    }, 3700);

    // 4.2s — arena
    schedule(() => {
      setGlitchActive(false);
      setPhase("arena");
    }, 4500);

    // 5.0s — WHO WINS
    schedule(() => { setPhase("whowins"); audio.impact(); }, 5300);

    // 5.8s — ENTER
    schedule(() => setPhase("enter"), 6200);
  }, [started, audio]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const done = () => setPhase("done");

  return (
    <div
      onClick={phase === "black" ? runSequence : undefined}
      style={{
        width: "100%",
        height: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        fontFamily: "'Rajdhani', 'Orbitron', 'Share Tech Mono', monospace",
        userSelect: "none",
        animation: shake ? "shake 0.08s linear 5" : "none",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&family=Orbitron:wght@700;900&display=swap');

        @keyframes shake {
          0%,100%{transform:translateX(0)}
          25%{transform:translateX(-4px) rotate(-0.3deg)}
          75%{transform:translateX(4px) rotate(0.3deg)}
        }
        @keyframes logoGlow {
          0%,100%{text-shadow:0 0 20px #00f0ff,0 0 40px #00f0ff60,0 0 80px #00f0ff30}
          50%{text-shadow:0 0 30px #00f0ff,0 0 60px #00f0ff80,0 0 120px #00f0ff50}
        }
        @keyframes fadeIn {
          from{opacity:0;transform:translateY(8px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes fadeInScale {
          from{opacity:0;transform:scale(0.9)}
          to{opacity:1;transform:scale(1)}
        }
        @keyframes slideLeft {
          from{transform:translateX(-100%);opacity:0}
          to{transform:translateX(0);opacity:1}
        }
        @keyframes slideRight {
          from{transform:translateX(100%);opacity:0}
          to{transform:translateX(0);opacity:1}
        }
        @keyframes titleStrike {
          from{opacity:0;letter-spacing:0.6em;transform:scaleX(1.15)}
          to{opacity:1;letter-spacing:0.25em;transform:scaleX(1)}
        }
        @keyframes glitchH {
          0%{clip-path:polygon(0 0,100% 0,100% 35%,0 35%)}
          25%{clip-path:polygon(0 20%,100% 20%,100% 55%,0 55%)}
          50%{clip-path:polygon(0 60%,100% 60%,100% 80%,0 80%)}
          75%{clip-path:polygon(0 10%,100% 10%,100% 40%,0 40%)}
          100%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}
        }
        @keyframes glitchOffset {
          0%,100%{transform:translate(0)}
          20%{transform:translate(-6px,2px)}
          40%{transform:translate(6px,-2px)}
          60%{transform:translate(-4px,4px)}
          80%{transform:translate(4px,-3px)}
        }
        @keyframes scanline {
          0%{transform:translateY(-100%)}
          100%{transform:translateY(100vh)}
        }
        @keyframes whoWinsPulse {
          0%,100%{text-shadow:0 0 30px #ff0055,0 0 60px #ff005560;transform:scale(1)}
          50%{text-shadow:0 0 50px #ff0055,0 0 100px #ff005580;transform:scale(1.02)}
        }
        @keyframes btnPulse {
          0%,100%{box-shadow:0 0 24px #ff005540,inset 0 0 24px #ff005510}
          50%{box-shadow:0 0 40px #ff005560,inset 0 0 40px #ff005520}
        }
        @keyframes particle {
          0%{transform:translate(0,0) scale(1);opacity:1}
          100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}
        }
        @keyframes arenaReveal {
          from{opacity:0;filter:blur(18px) brightness(0.4)}
          to{opacity:1;filter:blur(6px) brightness(0.6)}
        }
        @keyframes montageFlash {
          0%{opacity:0;transform:scale(1.04)}
          15%{opacity:1;transform:scale(1)}
          85%{opacity:1}
          100%{opacity:0}
        }
        @keyframes scanFlicker {
          0%,100%{opacity:0.04}50%{opacity:0.08}
        }
      `}</style>

      {/* Scanline overlay — always present */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.12) 3px,rgba(0,0,0,0.12) 4px)",
        }}
      />

      {/* Moving scanline beam */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg,transparent,rgba(0,240,255,0.15),transparent)",
          animation: "scanline 4s linear infinite",
          zIndex: 51, pointerEvents: "none",
        }}
      />

      {/* ── PHASE: BLACK ─────────────────────────────────────────────────────── */}
      {phase === "black" && (
        <div style={{ textAlign: "center", animation: "fadeIn 1s ease" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.4em", color: "rgba(255,255,255,0.2)", fontWeight: 700, marginBottom: 20, textTransform: "uppercase" }}>
            A cinematic experience
          </div>
          <div style={{ fontSize: 12, letterSpacing: "0.25em", color: "rgba(255,255,255,0.12)", textTransform: "uppercase", marginTop: 48 }}>
            Tap to begin
          </div>
          <div style={{ marginTop: 8, width: 24, height: 1, background: "rgba(255,255,255,0.1)", margin: "8px auto 0" }} />
        </div>
      )}

      {/* ── PHASE: LOGO ──────────────────────────────────────────────────────── */}
      {(phase === "logo" || phase === "montage" || phase === "vs" || phase === "glitch" || phase === "arena" || phase === "whowins" || phase === "enter") && (
        <div
          style={{
            position: "absolute",
            top: phase === "logo" ? "50%" : 32,
            left: "50%",
            transform: phase === "logo" ? "translate(-50%,-50%)" : "translate(-50%,0)",
            transition: "top 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: phase === "logo" ? 56 : 22,
              fontWeight: 900,
              letterSpacing: phase === "logo" ? "0.15em" : "0.25em",
              color: "#00f0ff",
              animation: "logoGlow 2s ease-in-out infinite, fadeIn 0.5s ease",
              transition: "font-size 0.5s ease, letter-spacing 0.5s ease",
              lineHeight: 1,
            }}
          >
            A.V.A
          </div>
          {phase === "logo" && (
            <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "rgba(0,240,255,0.5)", marginTop: 10, animation: "fadeIn 0.4s 0.3s ease both", textTransform: "uppercase", fontWeight: 700 }}>
              Automated fight simulator
            </div>
          )}
        </div>
      )}

      {/* ── PHASE: MONTAGE ───────────────────────────────────────────────────── */}
      {phase === "montage" && (
        <div
          key={montageIdx}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            animation: "montageFlash 0.35s ease forwards",
            zIndex: 5,
          }}
        >
          <div
            style={{
              width: 260,
              minHeight: 140,
              border: `1.5px solid ${MONTAGE_SCREENS[montageIdx].color}40`,
              background: `linear-gradient(180deg,${MONTAGE_SCREENS[montageIdx].color}08 0%,#000 100%)`,
              padding: "12px 16px",
            }}
          >
            <div style={{ fontSize: 8, letterSpacing: "0.3em", color: `${MONTAGE_SCREENS[montageIdx].color}80`, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
              {MONTAGE_SCREENS[montageIdx].label}
            </div>
            {MONTAGE_SCREENS[montageIdx].content}
          </div>
          <div style={{ marginTop: 12, fontSize: 10, letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 700 }}>
            WHERE ANYONE...
          </div>
        </div>
      )}

      {/* ── PHASE: VS / FIGHTER SILHOUETTES ──────────────────────────────────── */}
      {phase === "vs" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
          {/* Fighters */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 32, marginBottom: 16, width: "100%" }}>
            {/* Fighter 1 */}
            <div style={{ animation: "slideLeft 0.35s cubic-bezier(0.4,0,0.2,1) both" }}>
              <svg width="80" height="120" viewBox="0 0 80 120">
                <ellipse cx="40" cy="18" rx="16" ry="17" fill="#00f0ff20" stroke="#00f0ff40" strokeWidth="1" />
                <rect x="22" y="34" width="36" height="52" rx="4" fill="#00f0ff15" stroke="#00f0ff30" strokeWidth="1" />
                <rect x="6" y="36" width="14" height="36" rx="4" fill="#00f0ff10" stroke="#00f0ff25" strokeWidth="1" />
                <rect x="60" y="36" width="14" height="36" rx="4" fill="#00f0ff10" stroke="#00f0ff25" strokeWidth="1" />
                <rect x="26" y="86" width="12" height="32" rx="3" fill="#00f0ff12" stroke="#00f0ff20" strokeWidth="1" />
                <rect x="42" y="86" width="12" height="32" rx="3" fill="#00f0ff12" stroke="#00f0ff20" strokeWidth="1" />
                <line x1="40" y1="35" x2="40" y2="85" stroke="#00f0ff20" strokeWidth="0.5" />
              </svg>
              <div style={{ textAlign: "center", fontSize: 8, letterSpacing: "0.2em", color: "#00f0ff60", fontWeight: 700, marginTop: 4 }}>TEAM 1</div>
            </div>

            {/* Center VS */}
            <div style={{ textAlign: "center", flexShrink: 0, animation: "fadeInScale 0.3s 0.15s ease both" }}>
              <div style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 36,
                fontWeight: 900,
                color: "#fff",
                WebkitTextStroke: "1.5px #ff0055",
                textShadow: "0 0 24px #ff005580, 0 0 48px #ff005540",
                letterSpacing: "0.05em",
                lineHeight: 1,
              }}>
                VS
              </div>
            </div>

            {/* Fighter 2 */}
            <div style={{ animation: "slideRight 0.35s cubic-bezier(0.4,0,0.2,1) both" }}>
              <svg width="80" height="120" viewBox="0 0 80 120">
                <ellipse cx="40" cy="18" rx="16" ry="17" fill="#ff3b3020" stroke="#ff3b3040" strokeWidth="1" />
                <rect x="22" y="34" width="36" height="52" rx="4" fill="#ff3b3015" stroke="#ff3b3030" strokeWidth="1" />
                <rect x="6" y="36" width="14" height="36" rx="4" fill="#ff3b3010" stroke="#ff3b3025" strokeWidth="1" />
                <rect x="60" y="36" width="14" height="36" rx="4" fill="#ff3b3010" stroke="#ff3b3025" strokeWidth="1" />
                <rect x="26" y="86" width="12" height="32" rx="3" fill="#ff3b3012" stroke="#ff3b3020" strokeWidth="1" />
                <rect x="42" y="86" width="12" height="32" rx="3" fill="#ff3b3012" stroke="#ff3b3020" strokeWidth="1" />
                <line x1="40" y1="35" x2="40" y2="85" stroke="#ff3b3020" strokeWidth="0.5" />
              </svg>
              <div style={{ textAlign: "center", fontSize: 8, letterSpacing: "0.2em", color: "#ff3b3060", fontWeight: 700, marginTop: 4 }}>TEAM 2</div>
            </div>
          </div>

          {/* ANYONE VS ANYONE */}
          <div style={{ animation: "titleStrike 0.4s 0.1s cubic-bezier(0.2,0,0,1) both", textAlign: "center" }}>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.25em",
              color: "#fff",
              textTransform: "uppercase",
              textShadow: "0 0 20px rgba(255,255,255,0.4)",
              lineHeight: 1.2,
            }}>
              ANYONE VS ANYONE
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 9, letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 700, animation: "fadeIn 0.4s 0.4s ease both" }}>
            ...can fight anyone.
          </div>
        </div>
      )}

      {/* ── PHASE: GLITCH ────────────────────────────────────────────────────── */}
      {(phase === "glitch" || glitchActive) && (
        <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none" }}>
          {/* Glitch layers */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,240,255,0.06)",
              animation: "glitchOffset 0.15s linear 4",
            }}
          />
          <div
            style={{
              position: "absolute", inset: 0,
              animation: "glitchH 0.12s linear 5",
              background: "rgba(255,0,85,0.08)",
            }}
          />
          {/* Electric particles */}
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: i % 3 === 0 ? "#00f0ff" : i % 3 === 1 ? "#ff0055" : "#ffd700",
                left: `${15 + Math.random() * 70}%`,
                top: `${15 + Math.random() * 70}%`,
                "--dx": `${(Math.random() - 0.5) * 80}px`,
                "--dy": `${(Math.random() - 0.5) * 80}px`,
                animation: `particle ${0.4 + Math.random() * 0.3}s ease-out both`,
                animationDelay: `${Math.random() * 0.15}s`,
              } as React.CSSProperties}
            />
          ))}
          {/* Glitch text */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Orbitron', monospace",
            fontSize: 14, fontWeight: 900, color: "#fff",
            letterSpacing: "0.3em", textTransform: "uppercase",
            animation: "glitchOffset 0.1s linear 6",
          }}>
            PICK YOUR FIGHTERS.
          </div>
        </div>
      )}

      {/* ── PHASE: ARENA ─────────────────────────────────────────────────────── */}
      {phase === "arena" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
          <div
            style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0a0008 50%, #000 100%)",
              animation: "arenaReveal 0.8s ease forwards",
            }}
          />
          <div
            style={{
              position: "absolute", inset: 0,
              backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,0,85,0.03) 60px, rgba(255,0,85,0.03) 61px), repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(0,240,255,0.03) 60px, rgba(0,240,255,0.03) 61px)",
            }}
          />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.4em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 700, marginBottom: 12, animation: "fadeIn 0.5s ease" }}>
              RUN THE SCENARIO
            </div>
            <div
              style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.3em",
                color: "#ff0055",
                textShadow: "0 0 20px #ff005560",
                animation: "fadeIn 0.5s 0.2s ease both",
                textTransform: "uppercase",
              }}
            >
              BATTLE ARENA
            </div>
            <div style={{ marginTop: 8, width: 120, height: 1, background: "linear-gradient(90deg,transparent,#ff005540,transparent)", margin: "12px auto 0" }} />
          </div>
        </div>
      )}

      {/* ── PHASE: WHO WINS ──────────────────────────────────────────────────── */}
      {phase === "whowins" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 40,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "0.1em",
            animation: "fadeInScale 0.4s cubic-bezier(0.2,0,0,1) both, whoWinsPulse 1.5s 0.4s ease-in-out infinite",
            textAlign: "center",
            lineHeight: 1.1,
          }}>
            WHO<br />WINS?
          </div>
          <div style={{ marginTop: 16, fontSize: 9, letterSpacing: "0.4em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 700, animation: "fadeIn 0.5s 0.4s ease both" }}>
            And see how it plays out.
          </div>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, #ff005512 0%, transparent 70%)", pointerEvents: "none" }} />
        </div>
      )}

      {/* ── PHASE: ENTER (final CTA) ─────────────────────────────────────────── */}
      {phase === "enter" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 5, textAlign: "center", padding: "0 32px" }}>
          {/* Subtle red radial bg */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, #ff005510 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.4em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", fontWeight: 700, marginBottom: 28, animation: "fadeIn 0.5s ease" }}>
              A.V.A — Anyone vs Anyone
            </div>
            <button
              onClick={done}
              style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: "0.3em",
                color: "#fff",
                background: "linear-gradient(180deg, rgba(255,0,85,0.22) 0%, rgba(255,0,85,0.38) 100%)",
                border: "1.5px solid #ff0055",
                padding: "18px 36px",
                cursor: "pointer",
                textTransform: "uppercase",
                animation: "fadeInScale 0.5s cubic-bezier(0.2,0,0,1) both, btnPulse 1.8s 0.5s ease-in-out infinite",
                transition: "all 0.2s",
                display: "block",
                width: "100%",
                maxWidth: 280,
                margin: "0 auto",
              }}
            >
              ENTER THE ARENA
            </button>
            <div style={{ marginTop: 14, fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", lineHeight: 1.8, animation: "fadeIn 0.5s 0.3s ease both" }}>
              Choose fighters. Start battles.<br />Prove the outcome.
            </div>
          </div>
        </div>
      )}

      {/* ── PHASE: DONE ──────────────────────────────────────────────────────── */}
      {phase === "done" && (
        <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease" }}>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, letterSpacing: "0.3em", color: "#00f0ff", marginBottom: 8 }}>
            → ARENA
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em" }}>
            (In the real app, this transitions to the fight screen)
          </div>
          <button onClick={() => { setPhase("black"); setStarted(false); }} style={{
            marginTop: 24, fontSize: 9, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)",
            background: "none", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 16px", cursor: "pointer",
          }}>
            REPLAY INTRO
          </button>
        </div>
      )}
    </div>
  );
}
