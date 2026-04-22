import { useState } from "react";

const DOMAIN = "61f6577e-435f-41c3-ad88-0dc3fabfda02-00-2n1giip3w5ut6.kirk.replit.dev";
const img = (file: string) => `https://${DOMAIN}/characters/${file}`;

const PRESET_FIGHTERS = [
  { name: "Superman", universe: "DC Comics", file: "superman.jpg", team: 1 },
  { name: "Goku",     universe: "Dragon Ball", file: "goku.jpg",     team: 2 },
];

const GRID_CHARS = [
  { name: "Batman",    file: "batman.jpg",     tier: "ELITE" },
  { name: "Spider-Man",file: "spider-man.jpg", tier: "ELITE" },
  { name: "Ghost Spider",file:"ghost-spider.jpg",tier:"STANDARD"},
  { name: "Superman",  file: "superman.jpg",   tier: "COSMIC" },
  { name: "Goku",      file: "goku.jpg",       tier: "COSMIC" },
  { name: "Spider-Ham",file: "spider-ham.jpg", tier: "STREET" },
];

const TIER_COLOR: Record<string, string> = {
  COSMIC: "#ff0055", ELITE: "#c084fc", STANDARD: "#00f0ff", STREET: "#94a3b8",
};

export function HomeRedesign() {
  const [f1] = useState(PRESET_FIGHTERS[0]);
  const [f2] = useState(PRESET_FIGHTERS[1]);

  return (
    <div
      style={{
        width: 390, minHeight: 844,
        background: "#030308",
        fontFamily: "'Bebas Neue', 'Impact', sans-serif",
        color: "#fff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── HERO BANNER ─────────────────────────────────────────────── */}
      <div style={{ position: "relative", height: 340, overflow: "hidden" }}>

        {/* Background arena glow */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 60% at 50% 110%, rgba(80,0,180,0.18) 0%, transparent 70%)",
        }} />

        {/* Left fighter — Superman */}
        <div style={{
          position: "absolute",
          left: -10, bottom: 0,
          width: 210, height: 310,
          transform: "perspective(600px) rotateY(6deg)",
          transformOrigin: "bottom left",
          filter: "drop-shadow(0 0 40px rgba(0,240,255,0.35))",
          zIndex: 2,
        }}>
          <img
            src={img("superman.jpg")}
            alt="Superman"
            style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "top",
              maskImage: "linear-gradient(to right, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
            }}
          />
          {/* Cyan team tint */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, rgba(0,240,255,0.12) 0%, transparent 60%)",
            mixBlendMode: "screen",
          }} />
        </div>

        {/* Right fighter — Goku */}
        <div style={{
          position: "absolute",
          right: -10, bottom: 0,
          width: 210, height: 310,
          transform: "perspective(600px) rotateY(-6deg)",
          transformOrigin: "bottom right",
          filter: "drop-shadow(0 0 40px rgba(255,59,48,0.35))",
          zIndex: 2,
        }}>
          <img
            src={img("goku.jpg")}
            alt="Goku"
            style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "top",
              transform: "scaleX(-1)",
              maskImage: "linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
            }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, rgba(255,59,48,0.12) 0%, transparent 60%)",
            mixBlendMode: "screen",
          }} />
        </div>

        {/* Center gradient blend */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3,
          background: "linear-gradient(to right, transparent 20%, rgba(3,3,8,0.55) 50%, transparent 80%)",
        }} />

        {/* Bottom fade */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 140, zIndex: 4,
          background: "linear-gradient(to top, #030308 0%, transparent 100%)",
        }} />

        {/* Logo */}
        <div style={{
          position: "absolute", top: 14, left: 0, right: 0, zIndex: 10,
          textAlign: "center",
          fontSize: 13, letterSpacing: "0.35em",
          color: "rgba(255,255,255,0.55)",
        }}>
          <span style={{ color: "#00f0ff", textShadow: "0 0 20px #00f0ff" }}>A</span>
          <span style={{ color: "rgba(255,0,85,0.7)", margin: "0 4px", fontSize: 10 }}>✦</span>
          <span style={{ color: "#ff3b30", textShadow: "0 0 20px #ff3b30" }}>A</span>
          <div style={{ fontSize: 8, letterSpacing: "0.5em", marginTop: 2, color: "rgba(255,255,255,0.3)" }}>
            ANYONE VS ANYONE
          </div>
        </div>

        {/* WHO WOULD WIN headline */}
        <div style={{
          position: "absolute", zIndex: 10,
          left: 0, right: 0, bottom: 70,
          textAlign: "center",
          lineHeight: 1,
        }}>
          <div style={{
            fontSize: 15, letterSpacing: "0.22em",
            color: "rgba(255,255,255,0.55)",
            marginBottom: 4,
          }}>
            WHO WOULD
          </div>
          <div style={{
            fontSize: 64, letterSpacing: "0.04em",
            background: "linear-gradient(135deg, #fff 30%, rgba(255,0,85,0.7) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            filter: "drop-shadow(0 4px 24px rgba(255,0,85,0.5))",
            fontStyle: "italic",
          }}>
            WIN?
          </div>
        </div>

        {/* Center VS badge */}
        <div style={{
          position: "absolute", zIndex: 10,
          left: "50%", bottom: 115,
          transform: "translateX(-50%)",
          width: 44, height: 44,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1a0010 0%, #0a0015 100%)",
          border: "2px solid rgba(255,0,85,0.6)",
          boxShadow: "0 0 0 4px rgba(255,0,85,0.12), 0 0 30px rgba(255,0,85,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, letterSpacing: "0.05em",
          color: "#ff0055",
        }}>
          VS
        </div>
      </div>

      {/* ── FIGHTER SELECTION ROW ───────────────────────────────────── */}
      <div style={{ padding: "0 12px 10px", marginTop: -4 }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 4,
          padding: "8px 10px",
        }}>
          {/* Fighter 1 */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 52, height: 66, flexShrink: 0,
              border: "2px solid #00f0ff",
              boxShadow: "0 0 16px rgba(0,240,255,0.4), inset 0 0 8px rgba(0,240,255,0.08)",
              overflow: "hidden",
              borderRadius: 2,
              position: "relative",
              transform: "perspective(300px) rotateY(4deg)",
            }}>
              <img src={img(f1.file)} alt={f1.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
              }} />
            </div>
            <div>
              <div style={{ fontSize: 7.5, letterSpacing: "0.25em", color: "rgba(0,240,255,0.6)", marginBottom: 2 }}>
                FIGHTER 1
              </div>
              <div style={{ fontSize: 18, letterSpacing: "0.05em", color: "#fff", lineHeight: 1 }}>
                {f1.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 8, letterSpacing: "0.15em", color: "rgba(0,240,255,0.5)", marginTop: 3 }}>
                {f1.universe.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Center VS */}
          <div style={{
            flexShrink: 0, fontSize: 20, letterSpacing: "0.1em",
            color: "#ff0055",
            textShadow: "0 0 20px rgba(255,0,85,0.7)",
            padding: "0 2px",
          }}>VS</div>

          {/* Fighter 2 */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexDirection: "row-reverse" }}>
            <div style={{
              width: 52, height: 66, flexShrink: 0,
              border: "2px solid #ff3b30",
              boxShadow: "0 0 16px rgba(255,59,48,0.4), inset 0 0 8px rgba(255,59,48,0.08)",
              overflow: "hidden",
              borderRadius: 2,
              position: "relative",
              transform: "perspective(300px) rotateY(-4deg)",
            }}>
              <img src={img(f2.file)} alt={f2.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
              }} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 7.5, letterSpacing: "0.25em", color: "rgba(255,59,48,0.6)", marginBottom: 2 }}>
                FIGHTER 2
              </div>
              <div style={{ fontSize: 18, letterSpacing: "0.05em", color: "#fff", lineHeight: 1 }}>
                {f2.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 8, letterSpacing: "0.15em", color: "rgba(255,59,48,0.5)", marginTop: 3 }}>
                {f2.universe.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FIGHT BUTTON ─────────────────────────────────────────────── */}
      <div style={{ padding: "0 12px 10px" }}>
        <button style={{
          width: "100%", height: 56,
          background: "linear-gradient(135deg, #cc0033 0%, #ff0055 50%, #cc0033 100%)",
          border: "none",
          borderRadius: 4,
          boxShadow: "0 0 0 1px rgba(255,0,85,0.5), 0 4px 32px rgba(255,0,85,0.5), 0 2px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Shine sweep */}
          <div style={{
            position: "absolute", top: 0, left: "-100%", width: "60%", height: "100%",
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
            transform: "skewX(-20deg)",
          }} />
          <span style={{
            fontSize: 28, letterSpacing: "0.25em", color: "#fff",
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            fontStyle: "italic",
          }}>
            ⚔ FIGHT!
          </span>
        </button>
      </div>

      {/* ── MODE ROW ─────────────────────────────────────────────────── */}
      <div style={{ padding: "0 12px 12px", display: "flex", gap: 6 }}>
        {[
          { icon: "⚖", label: "STANDARD", sub: "Balanced" },
          { icon: "💀", label: "BLOODLUSTED", sub: "No Limits" },
          { icon: "🎭", label: "IN CHARACTER", sub: "Personality" },
        ].map((m, i) => (
          <div key={i} style={{
            flex: 1, padding: "7px 6px",
            background: i === 0 ? "rgba(255,0,85,0.12)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${i === 0 ? "rgba(255,0,85,0.45)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 3, cursor: "pointer",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 13, marginBottom: 2 }}>{m.icon}</div>
            <div style={{ fontSize: 7.5, letterSpacing: "0.12em", color: i === 0 ? "#ff0055" : "rgba(255,255,255,0.4)" }}>
              {m.label}
            </div>
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── CHOOSE YOUR FIGHTERS ─────────────────────────────────────── */}
      <div style={{ padding: "0 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.25em", color: "rgba(255,255,255,0.5)" }}>
          ── CHOOSE YOUR FIGHTERS
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,0,85,0.6)", letterSpacing: "0.1em" }}>956 FIGHTERS</div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "0 12px 10px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 3, padding: "8px 12px",
        }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>⌕</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
            Search fighters...
          </span>
        </div>
      </div>

      {/* Character grid */}
      <div style={{ padding: "0 12px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {GRID_CHARS.map((c) => (
          <div key={c.name} style={{
            height: 130, position: "relative", overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            transform: "perspective(500px) rotateX(2deg)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            cursor: "pointer",
          }}>
            <img src={img(c.file)} alt={c.name} style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "top",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
            }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 7px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.04em", lineHeight: 1, color: "#fff" }}>
                {c.name.toUpperCase()}
              </div>
              <div style={{
                fontSize: 7.5, letterSpacing: "0.15em", marginTop: 2,
                color: TIER_COLOR[c.tier] ?? "#fff",
              }}>
                {c.tier === "COSMIC" ? "★" : c.tier === "ELITE" ? "◆" : c.tier === "STANDARD" ? "●" : "○"} {c.tier}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div style={{
        marginTop: 16,
        borderTop: "1px solid rgba(255,0,85,0.2)",
        display: "flex",
        background: "rgba(0,0,0,0.95)",
        padding: "10px 0 4px",
      }}>
        {[
          { icon: "⚔", label: "ARENA", active: true },
          { icon: "📜", label: "HISTORY", active: false },
          { icon: "🎲", label: "RANDOM", active: false },
        ].map((t) => (
          <div key={t.label} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            cursor: "pointer",
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{
              fontSize: 8, letterSpacing: "0.2em",
              color: t.active ? "#ff0055" : "rgba(255,255,255,0.3)",
            }}>
              {t.label}
            </span>
            {t.active && (
              <div style={{ width: 20, height: 2, background: "#ff0055", borderRadius: 1 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
