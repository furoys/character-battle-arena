import { useParams } from "wouter";

/**
 * Play Store marketing tiles, 1080×1920 each. Public route (no auth) so the
 * screenshot tool can capture them. Visit /marketing/1 through /marketing/6.
 *
 * Each tile is laid out in a fixed 1080×1920 viewport-style container so
 * screenshots taken at that viewport size are pixel-perfect for Play Console
 * upload (Play Store phone screenshot specs: 1080×1920, 9:16, PNG/JPG).
 */
export function Marketing() {
  const params = useParams<{ n: string }>();
  const n = Math.max(1, Math.min(6, parseInt(params.n ?? "1", 10) || 1));

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
        background: "#030308",
        fontFamily: "'Bebas Neue', 'Rajdhani', system-ui, sans-serif",
        color: "#fff",
      }}
    >
      {n === 1 && <Tile1 />}
      {n === 2 && <Tile2 />}
      {n === 3 && <Tile3 />}
      {n === 4 && <Tile4 />}
      {n === 5 && <Tile5 />}
      {n === 6 && <Tile6 />}
    </div>
  );
}

const ACCENT = "#ff0055";
const GOLD = "#ffc800";
const CYAN = "#00f0ff";

function Bg() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 20% 10%, rgba(255,0,85,0.35) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(0,240,255,0.22) 0%, transparent 55%), #030308",
        }}
      />
      {/* Subtle scanline grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 6px)",
          mixBlendMode: "screen",
        }}
      />
    </>
  );
}

function Headline({
  eyebrow,
  title,
  sub,
  color = ACCENT,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{ position: "relative", textAlign: "center", padding: "0 64px" }}>
      {eyebrow && (
        <div
          style={{
            fontSize: 38,
            letterSpacing: "0.45em",
            color,
            fontWeight: 700,
            marginBottom: 28,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
      )}
      <div
        style={{
          fontSize: 160,
          lineHeight: 0.92,
          fontWeight: 800,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: "#fff",
          textShadow: `0 4px 24px ${color}88, 0 0 60px ${color}55`,
        }}
      >
        {title}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 36,
            letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.78)",
            fontWeight: 400,
            marginTop: 36,
            textTransform: "uppercase",
            lineHeight: 1.3,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function FooterBrand() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 64,
        left: 0,
        right: 0,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 56,
          letterSpacing: "0.4em",
          color: "#fff",
          fontWeight: 800,
        }}
      >
        A.v.A
      </div>
      <div
        style={{
          fontSize: 22,
          letterSpacing: "0.5em",
          color: "rgba(255,255,255,0.45)",
          marginTop: 6,
          textTransform: "uppercase",
        }}
      >
        Anyone vs Anyone
      </div>
    </div>
  );
}

// ---- Tile 1 — Hero ----
function Tile1() {
  return (
    <>
      <Bg />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 60,
            letterSpacing: "0.45em",
            color: ACCENT,
            fontWeight: 700,
            marginBottom: 60,
            textTransform: "uppercase",
          }}
        >
          The AI Fight Simulator
        </div>
        <div
          style={{
            fontSize: 380,
            lineHeight: 0.85,
            fontWeight: 800,
            letterSpacing: "0.06em",
            color: "#fff",
            textShadow: `0 6px 30px ${ACCENT}, 0 0 100px ${ACCENT}88`,
          }}
        >
          A.v.A
        </div>
        <div
          style={{
            fontSize: 50,
            letterSpacing: "0.32em",
            color: "rgba(255,255,255,0.85)",
            fontWeight: 600,
            marginTop: 30,
            textTransform: "uppercase",
          }}
        >
          Anyone vs Anyone
        </div>
        <div
          style={{
            marginTop: 80,
            display: "flex",
            gap: 40,
            alignItems: "center",
          }}
        >
          <Stat label="Fighters" value="956+" color={ACCENT} />
          <Stat label="Universes" value="104+" color={CYAN} />
          <Stat label="Matchups Daily" value="20" color={GOLD} />
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: "28px 40px",
        border: `2px solid ${color}66`,
        background: `${color}11`,
        textAlign: "center",
        minWidth: 260,
      }}
    >
      <div style={{ fontSize: 92, lineHeight: 1, fontWeight: 800, color }}>{value}</div>
      <div
        style={{
          fontSize: 22,
          letterSpacing: "0.32em",
          color: "rgba(255,255,255,0.7)",
          marginTop: 10,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ---- Tile 2 — Pick anyone ----
function Tile2() {
  const names = [
    "Goku", "Batman", "Thanos",
    "Sub-Zero", "John Wick", "Sauron",
    "Vader", "Joker", "Spider-Man",
  ];
  return (
    <>
      <Bg />
      <div style={{ paddingTop: 140 }}>
        <Headline
          eyebrow="Step 1"
          title={"Pick Anyone\nFrom Any Universe"}
          color={CYAN}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 720,
          left: 60,
          right: 60,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridAutoRows: "320px",
          gap: 20,
        }}
      >
        {names.map((name, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${i % 4 === 0 ? ACCENT : "rgba(255,255,255,0.18)"}`,
              background: i % 4 === 0
                ? `linear-gradient(180deg, ${ACCENT}22 0%, ${ACCENT}05 100%)`
                : "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: 16,
              boxShadow: i % 4 === 0 ? `0 0 30px ${ACCENT}44` : "none",
            }}
          >
            <div
              style={{
                fontSize: 32,
                letterSpacing: "0.06em",
                color: "#fff",
                fontWeight: 700,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              {name}
            </div>
          </div>
        ))}
      </div>
      <FooterBrand />
    </>
  );
}

// ---- Tile 3 — AI Narration ----
function Tile3() {
  return (
    <>
      <Bg />
      <div style={{ paddingTop: 140 }}>
        <Headline
          eyebrow="Step 2"
          title={"AI Writes\nThe Fight"}
          sub="Cinematic round-by-round narration · powered by GPT"
          color={ACCENT}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1000,
          left: 80,
          right: 80,
          padding: 48,
          border: `2px solid ${ACCENT}66`,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: "0.4em",
            color: ACCENT,
            marginBottom: 24,
            fontWeight: 700,
          }}
        >
          === ROUND 3 ===
        </div>
        <div
          style={{
            fontSize: 36,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.92)",
            fontFamily: "'Rajdhani', system-ui, sans-serif",
            fontWeight: 400,
          }}
        >
          Goku ignites the Spirit Bomb above the burning skyline.
          Vader raises both arms, his black cloak whipping in the
          shockwave. The Force coils. The ki erupts.
          <br />
          <br />
          <span style={{ color: GOLD, fontWeight: 700, letterSpacing: "0.1em" }}>
            ⚡ TURNING POINT.
          </span>
        </div>
      </div>
      <FooterBrand />
    </>
  );
}

// ---- Tile 4 — Daily Matchups ----
function Tile4() {
  const matchups = [
    ["Batman", "Iron Man", "MARVEL vs DC"],
    ["Sub-Zero", "Scorpion", "RIVALS"],
    ["John Wick", "The Bride", "STREET"],
    ["Avengers", "Justice League", "TEAM-UP"],
    ["Joker", "Pennywise", "VILLAINS"],
  ];
  return (
    <>
      <Bg />
      <div style={{ paddingTop: 120 }}>
        <Headline
          eyebrow="Daily Drop"
          title={"20 Fights.\nEvery Day."}
          sub="New matchups at midnight ET · climb the leaderboard"
          color={GOLD}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1000,
          left: 80,
          right: 80,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {matchups.map(([a, b, theme], i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "24px 32px",
              border: `1px solid ${i === 0 ? GOLD : "rgba(255,255,255,0.18)"}`,
              background: i === 0
                ? `linear-gradient(90deg, ${GOLD}22 0%, transparent 100%)`
                : "rgba(255,255,255,0.03)",
              gap: 24,
            }}
          >
            <div style={{ flex: 1, fontSize: 38, fontWeight: 700, color: "#fff" }}>
              {a}
            </div>
            <div style={{ fontSize: 28, color: ACCENT, fontWeight: 700, letterSpacing: "0.2em" }}>
              VS
            </div>
            <div style={{ flex: 1, textAlign: "right", fontSize: 38, fontWeight: 700, color: "#fff" }}>
              {b}
            </div>
            <div
              style={{
                fontSize: 16,
                letterSpacing: "0.2em",
                color: i === 0 ? GOLD : "rgba(255,255,255,0.5)",
                width: 180,
                textAlign: "right",
                fontWeight: 700,
              }}
            >
              {theme}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Tile 5 — Challenge friends / Blind pick ----
function Tile5() {
  return (
    <>
      <Bg />
      <div style={{ paddingTop: 140 }}>
        <Headline
          eyebrow="PvP"
          title={"Challenge\nFriends"}
          sub="Blind pick · share a link · reveal in real time"
          color={CYAN}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 880,
          left: 80,
          right: 80,
          height: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
        }}
      >
        <Silhouette label="YOUR TEAM" color={ACCENT} reveal />
        <div
          style={{
            fontSize: 80,
            color: GOLD,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textShadow: `0 0 30px ${GOLD}`,
          }}
        >
          VS
        </div>
        <Silhouette label="???" color={CYAN} />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 240,
          left: 80,
          right: 80,
          textAlign: "center",
          padding: "24px 0",
          border: `2px solid ${GOLD}55`,
          background: `${GOLD}11`,
          fontSize: 36,
          letterSpacing: "0.3em",
          color: GOLD,
          fontWeight: 700,
        }}
      >
        ava.app/c/XYZ42
      </div>
      <FooterBrand />
    </>
  );
}

function Silhouette({ label, color, reveal }: { label: string; color: string; reveal?: boolean }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div
        style={{
          height: 500,
          border: `2px solid ${color}66`,
          background: reveal
            ? `linear-gradient(180deg, ${color}22 0%, ${color}05 100%)`
            : "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 40px ${color}55`,
        }}
      >
        <div
          style={{
            fontSize: reveal ? 60 : 200,
            color: reveal ? "#fff" : `${color}88`,
            fontWeight: 800,
            letterSpacing: "0.05em",
            textAlign: "center",
            padding: 20,
            lineHeight: 1,
          }}
        >
          {reveal ? "GOKU\nNARUTO\nLUFFY" : "???"}
        </div>
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 28,
          letterSpacing: "0.3em",
          color,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ---- Tile 6 — Chaos modifiers ----
function Tile6() {
  const mods = [
    { name: "Upset Mode", desc: "Underdog wins · stats inverted", color: ACCENT },
    { name: "Sudden Death", desc: "One round · no second chances", color: GOLD },
    { name: "Last Stand", desc: "Loser fights at 1 HP", color: CYAN },
    { name: "Mirror Match", desc: "Stats are swapped", color: "#a855f7" },
  ];
  return (
    <>
      <Bg />
      <div style={{ paddingTop: 140 }}>
        <Headline
          eyebrow="Twist Fate"
          title="Chaos Modifiers"
          sub="Change the rules · break the meta"
          color={ACCENT}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 980,
          left: 80,
          right: 80,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
        }}
      >
        {mods.map((m, i) => (
          <div
            key={i}
            style={{
              padding: 40,
              border: `2px solid ${m.color}66`,
              background: `linear-gradient(180deg, ${m.color}1a 0%, ${m.color}05 100%)`,
              boxShadow: `0 0 30px ${m.color}33`,
            }}
          >
            <div
              style={{
                fontSize: 44,
                color: m.color,
                fontWeight: 800,
                letterSpacing: "0.04em",
                marginBottom: 14,
                textTransform: "uppercase",
              }}
            >
              {m.name}
            </div>
            <div
              style={{
                fontSize: 24,
                color: "rgba(255,255,255,0.75)",
                fontFamily: "'Rajdhani', system-ui, sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              {m.desc}
            </div>
          </div>
        ))}
      </div>
      <FooterBrand />
    </>
  );
}
