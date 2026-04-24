import { useState, useEffect } from "react";

const CHARS = [
  { id: 1,  name: "2B",          tier: "ELITE",    ovr: 73, hue: "#a855f7" },
  { id: 2,  name: "9S",          tier: "ELITE",    ovr: 75, hue: "#a855f7" },
  { id: 3,  name: "Aang",        tier: "STANDARD", ovr: 54, hue: "#3b82f6" },
  { id: 4,  name: "Achilles",    tier: "ELITE",    ovr: 71, hue: "#a855f7" },
  { id: 5,  name: "All Might",   tier: "COSMIC",   ovr: 88, hue: "#00f0ff" },
  { id: 6,  name: "Batman",      tier: "ELITE",    ovr: 79, hue: "#a855f7" },
  { id: 7,  name: "Black Widow", tier: "STREET",   ovr: 62, hue: "#6b7280" },
  { id: 8,  name: "Deku",        tier: "ELITE",    ovr: 76, hue: "#a855f7" },
  { id: 9,  name: "Goku",        tier: "COSMIC",   ovr: 99, hue: "#00f0ff" },
  { id: 10, name: "Hulk",        tier: "COSMIC",   ovr: 91, hue: "#00f0ff" },
];

const TIER_COLOR: Record<string, string> = {
  COSMIC:   "#00f0ff",
  ELITE:    "#a855f7",
  STANDARD: "#3b82f6",
  STREET:   "#6b7280",
};

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#ff0055", "#00f0ff", "#a855f7", "#f59e0b", "#10b981"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at 35% 35%, ${color}aa, ${color}33)`,
      border: `1.5px solid ${color}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 800, color: "#fff",
      fontFamily: "monospace", flexShrink: 0,
      boxShadow: `0 0 10px ${color}44`,
    }}>
      {initials}
    </div>
  );
}

function ScanLine() {
  const [pos, setPos] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPos(p => (p + 1.2) % 100), 25);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, top: `${pos}%`,
      height: 1,
      background: "linear-gradient(to right, transparent, rgba(0,240,255,0.12), transparent)",
      pointerEvents: "none", zIndex: 0,
    }} />
  );
}

function TeamSlot({ char, onRemove }: { char: typeof CHARS[0] | null; onRemove?: () => void }) {
  if (!char) {
    return (
      <div style={{
        width: 46, height: 46, border: "1px dashed rgba(255,255,255,0.1)",
        borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.15)", fontSize: 18, cursor: "pointer",
        background: "rgba(255,255,255,0.02)",
      }}>+</div>
    );
  }
  return (
    <div onClick={onRemove} title={`Remove ${char.name}`} style={{
      width: 46, height: 46, borderRadius: 6, position: "relative", cursor: "pointer",
      background: `radial-gradient(circle at 35% 35%, ${char.hue}33, #030308)`,
      border: `1.5px solid ${char.hue}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 0 10px ${char.hue}33`,
    }}>
      <Avatar name={char.name} size={34} />
    </div>
  );
}

export function HomeRedesign() {
  const [team1, setTeam1] = useState([CHARS[4], CHARS[5]]);
  const [team2, setTeam2] = useState([CHARS[8]]);
  const [search, setSearch] = useState("");

  const filtered = CHARS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToTeam = (c: typeof CHARS[0]) => {
    if (team1.some(x => x.id === c.id) || team2.some(x => x.id === c.id)) return;
    if (team1.length <= team2.length && team1.length < 5) setTeam1(t => [...t, c]);
    else if (team2.length < 5) setTeam2(t => [...t, c]);
  };

  const makeSlots = (team: typeof CHARS, setTeam: typeof setTeam1) =>
    Array.from({ length: 5 }).map((_, i) => (
      <TeamSlot
        key={i}
        char={team[i] ?? null}
        onRemove={() => setTeam(t => t.filter((_, j) => j !== i))}
      />
    ));

  return (
    <div style={{
      width: 390, minHeight: 844,
      background: "#030308",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── Ambient glow orbs ──────────────────────────── */}
      <div style={{
        position: "absolute", left: -100, top: -100,
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,0,85,0.12) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "absolute", right: -60, top: 60,
        width: 240, height: 240, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,240,255,0.1) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "absolute", left: -40, top: 380,
        width: 280, height: 280, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168,85,247,0.09) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <ScanLine />

      {/* ══════════════════════════════════════════════════
          TOP BAR — single unified bar: logo + profile
      ══════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px 8px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
        position: "relative", zIndex: 10, flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            fontFamily: "monospace", fontSize: 22, fontWeight: 900,
            letterSpacing: "0.12em", lineHeight: 1,
            background: "linear-gradient(135deg, #00f0ff 0%, #ff0055 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>A·v·A</span>
          <span style={{
            fontSize: 7, color: "rgba(255,255,255,0.2)",
            fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase",
            paddingTop: 3, lineHeight: 1,
          }}>ANYONE VS ANYONE</span>
        </div>

        {/* Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            fontSize: 9, color: "rgba(255,255,255,0.3)",
            fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
          }}>FUROYS</span>
          <Avatar name="Furoys" size={30} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ARENA PANEL — compact team builder
      ══════════════════════════════════════════════════ */}
      <div style={{
        position: "relative", zIndex: 5, flexShrink: 0,
        padding: "10px 12px 0",
        background: "linear-gradient(180deg, rgba(0,240,255,0.03) 0%, transparent 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {/* Teams row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 10 }}>

          {/* Team 1 */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 7.5, fontWeight: 800, letterSpacing: "0.28em",
              color: "#00f0ff", textTransform: "uppercase", marginBottom: 5,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>Team 1</span>
              <span style={{ color: "rgba(0,240,255,0.45)", fontWeight: 700 }}>{team1.length}/5</span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {makeSlots(team1, setTeam1)}
            </div>
          </div>

          {/* VS divider */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, marginTop: 18, flexShrink: 0,
          }}>
            <div style={{ width: 1, height: 14, background: "linear-gradient(to bottom, transparent, rgba(255,0,85,0.4))" }} />
            <span style={{
              fontSize: 12, fontWeight: 900, color: "#ff0055",
              textShadow: "0 0 14px #ff005599", letterSpacing: "0.05em",
            }}>VS</span>
            <div style={{ width: 1, height: 14, background: "linear-gradient(to top, transparent, rgba(255,0,85,0.4))" }} />
          </div>

          {/* Team 2 */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 7.5, fontWeight: 800, letterSpacing: "0.28em",
              color: "#ff3b30", textTransform: "uppercase", marginBottom: 5,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>Team 2</span>
              <span style={{ color: "rgba(255,59,48,0.45)", fontWeight: 700 }}>{team2.length}/5</span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {makeSlots(team2, setTeam2)}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button style={{
            flex: 1, height: 34,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.35)",
            borderRadius: 6, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.18em",
            textTransform: "uppercase", cursor: "pointer",
          }}>⚔ FIGHT</button>
          <button style={{
            flex: 1.1, height: 34,
            background: "linear-gradient(135deg, rgba(200,150,0,0.15), rgba(200,150,0,0.35))",
            border: "1px solid rgba(200,150,0,0.5)",
            color: "#f0c040", borderRadius: 6, fontSize: 9.5, fontWeight: 800,
            letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer",
            boxShadow: "0 0 14px rgba(200,150,0,0.25)",
          }}>⚡ RANDOM</button>
          <button style={{
            flex: 1.1, height: 34,
            background: "rgba(0,240,255,0.04)",
            border: "1px solid rgba(0,240,255,0.22)",
            color: "#00f0ff", borderRadius: 6, fontSize: 9.5, fontWeight: 800,
            letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
          }}>🔗 CHALLENGE</button>
        </div>

        {/* Upset mode toggle */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7, paddingBottom: 10,
        }}>
          <div style={{
            width: 30, height: 16, borderRadius: 8,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            position: "relative", cursor: "pointer",
          }}>
            <div style={{
              position: "absolute", left: 2.5, top: 2.5,
              width: 10, height: 10, borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
            }} />
          </div>
          <span style={{
            fontSize: 8.5, color: "rgba(255,255,255,0.25)",
            fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
          }}>Upset Mode</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ROSTER
      ══════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 5 }}>

        {/* Search + Faves */}
        <div style={{ display: "flex", gap: 6, padding: "8px 12px 5px", flexShrink: 0 }}>
          <div style={{
            flex: 1, height: 32,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 6, display: "flex", alignItems: "center", gap: 7, padding: "0 10px",
          }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search fighters..."
              style={{
                background: "none", border: "none", outline: "none",
                fontSize: 11, color: "rgba(255,255,255,0.55)", flex: 1,
              }}
            />
          </div>
          <button style={{
            height: 32, padding: "0 10px",
            background: "rgba(255,200,0,0.07)",
            border: "1px solid rgba(255,200,0,0.18)",
            borderRadius: 6, fontSize: 9.5, fontWeight: 800,
            color: "rgba(255,200,0,0.65)", letterSpacing: "0.12em",
            cursor: "pointer", whiteSpace: "nowrap",
          }}>★ FAVES</button>
        </div>

        {/* Universe pills */}
        <div style={{
          display: "flex", gap: 5, padding: "2px 12px 5px",
          overflowX: "auto", flexShrink: 0,
        }}>
          {[
            { label: "ALL", active: true },
            { label: "MARVEL 144", active: false },
            { label: "DC 140", active: false },
            { label: "DISNEY 103", active: false },
            { label: "ANIME 144", active: false },
          ].map(({ label, active }) => (
            <div key={label} style={{
              padding: "3px 9px", borderRadius: 4, flexShrink: 0, cursor: "pointer",
              fontSize: 8.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
              background: active ? "rgba(255,0,85,0.14)" : "transparent",
              border: `1px solid ${active ? "rgba(255,0,85,0.45)" : "rgba(255,255,255,0.09)"}`,
              color: active ? "#ff0055" : "rgba(255,255,255,0.35)",
            }}>{label}</div>
          ))}
        </div>

        {/* Tier pills */}
        <div style={{
          display: "flex", gap: 5, padding: "0 12px 8px", flexShrink: 0,
        }}>
          {[
            { label: "All", active: true, color: "" },
            { label: "★ Cosmic", active: false, color: "#00f0ff" },
            { label: "◆ Elite", active: false, color: "#a855f7" },
            { label: "● Standard", active: false, color: "#3b82f6" },
            { label: "○ Street", active: false, color: "#6b7280" },
          ].map(({ label, active, color }) => (
            <div key={label} style={{
              padding: "3px 8px", borderRadius: 4, cursor: "pointer",
              fontSize: 8.5, fontWeight: 700, flexShrink: 0,
              background: active ? "rgba(255,255,255,0.09)" : "transparent",
              border: `1px solid ${active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.07)"}`,
              color: active ? "#fff" : color || "rgba(255,255,255,0.3)",
            }}>{label}</div>
          ))}
        </div>

        {/* Character grid */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "0 10px 80px",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        }}>
          {filtered.map(c => {
            const inTeam = team1.some(x => x.id === c.id) || team2.some(x => x.id === c.id);
            const color = TIER_COLOR[c.tier];
            return (
              <div
                key={c.id}
                onClick={() => addToTeam(c)}
                style={{
                  borderRadius: 10, overflow: "hidden", cursor: "pointer",
                  background: `linear-gradient(145deg, ${color}15 0%, #030308 65%)`,
                  border: `1.5px solid ${inTeam ? color + "88" : color + "2a"}`,
                  position: "relative",
                  boxShadow: inTeam ? `0 0 18px ${color}33, inset 0 0 20px ${color}08` : "none",
                  transition: "all 0.18s",
                  minHeight: 115,
                }}
              >
                {/* Sheen line at top */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 1,
                  background: `linear-gradient(to right, transparent, ${color}44, transparent)`,
                }} />

                {/* Avatar area */}
                <div style={{
                  height: 76, display: "flex", alignItems: "center", justifyContent: "center",
                  background: `radial-gradient(ellipse at 50% 10%, ${color}18 0%, transparent 65%)`,
                }}>
                  <Avatar name={c.name} size={50} />
                </div>

                {/* Info */}
                <div style={{ padding: "5px 8px 8px" }}>
                  <div style={{
                    fontSize: 11.5, fontWeight: 800, color: "#fff", marginBottom: 5,
                    letterSpacing: "0.01em",
                  }}>{c.name}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{
                      fontSize: 7.5, fontWeight: 700, padding: "1.5px 5px", borderRadius: 3,
                      background: color + "1a", color, border: `1px solid ${color}33`,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                    }}>◆ {c.tier}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
                      <span style={{
                        fontSize: 20, fontWeight: 900, lineHeight: 1,
                        color: inTeam ? color : "#fff",
                        textShadow: inTeam ? `0 0 10px ${color}66` : "none",
                        transition: "all 0.2s",
                      }}>{c.ovr}</span>
                      <span style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>OVR</span>
                    </div>
                  </div>
                </div>

                {/* Heart icon */}
                <div style={{
                  position: "absolute", top: 6, right: 6,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "rgba(255,255,255,0.35)", cursor: "pointer",
                }}>♡</div>

                {/* Picked badge */}
                {inTeam && (
                  <div style={{
                    position: "absolute", top: 6, left: 6,
                    background: color, borderRadius: 3, padding: "1.5px 5px",
                    fontSize: 7, fontWeight: 900, color: "#000",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    boxShadow: `0 0 8px ${color}88`,
                  }}>✓ PICKED</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          BOTTOM NAV
      ══════════════════════════════════════════════════ */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, width: 390,
        height: 66, display: "grid", gridTemplateColumns: "1fr 1fr",
        borderTop: "1.5px solid rgba(255,0,85,0.2)",
        background: "rgba(3,3,8,0.97)",
        backdropFilter: "blur(16px)",
        zIndex: 50,
      }}>
        {[
          { label: "Arena", icon: "⚔", active: true },
          { label: "Debate Room", icon: "💡", active: false },
        ].map(item => (
          <div key={item.label} style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 3, position: "relative", cursor: "pointer",
            color: item.active ? "#ff0055" : "rgba(255,255,255,0.28)",
          }}>
            {item.active && (
              <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: 44, height: 2,
                background: "linear-gradient(to right, transparent, #ff0055, transparent)",
                boxShadow: "0 0 10px #ff005599, 0 0 3px #ff005566",
              }} />
            )}
            <span style={{ fontSize: 17, lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: 8.5, fontWeight: 800, letterSpacing: "0.22em",
              textTransform: "uppercase", lineHeight: 1,
            }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
