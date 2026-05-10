import { useEffect, useState, useMemo } from "react";
import { Character, FightResult, FightRound } from "@workspace/api-client-react";
import { Swords, RotateCcw, Copy, Check, Share2 } from "lucide-react";
import { AvaLogo } from "@/components/ava-logo";
import { computeSynergy } from "@/lib/synergies";

interface VictoryScreenProps {
  result: FightResult;
  onClose: () => void;
  onRematch?: () => void;
}

interface Particle {
  id: number;
  left: string;
  bottom: string;
  size: number;
  color: string;
  duration: number;
  delay: number;
  drift: string;
}

function useParticles(count: number, teamColor: string): Particle[] {
  return useMemo(() => {
    const colors =
      teamColor === "team1"
        ? ["#00f0ff", "#00b8cc", "#ffffff", "#80f8ff", "#00d4e8"]
        : ["#ff3b30", "#ff6b5b", "#ffffff", "#ffaa99", "#ff5545"];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      bottom: `${Math.random() * 20}%`,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      duration: Math.random() * 3 + 2.5,
      delay: Math.random() * 2,
      drift: `${(Math.random() - 0.5) * 120}px`,
    }));
  }, [count, teamColor]);
}

function PortraitPillar({
  character,
  delay,
  teamColor,
}: {
  character: Character;
  delay: number;
  teamColor: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = character.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const borderColor  = teamColor === "team1" ? "border-[#00f0ff]" : "border-[#ff3b30]";
  const shadowColor  = teamColor === "team1" ? "shadow-[0_0_30px_rgba(0,240,255,0.6)]" : "shadow-[0_0_30px_rgba(255,59,48,0.6)]";
  const glowColor    = teamColor === "team1" ? "#00f0ff" : "#ff3b30";

  return (
    <div
      className="victory-portrait-rise flex flex-col items-center gap-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="victory-crown text-2xl"
        style={{ animationDelay: `${delay + 400}ms`, color: "#ffd700" }}
      >
        👑
      </div>
      <div
        className={`relative overflow-hidden border-2 ${borderColor} ${shadowColor}`}
        style={{ width: "clamp(70px, 15vw, 120px)", height: "clamp(95px, 20vw, 165px)" }}
      >
        {character.imageUrl && !imgError ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full h-full object-cover object-top"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-display text-3xl font-bold"
            style={{ background: `${glowColor}20`, color: glowColor }}
          >
            {initials}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div
          className="absolute bottom-0 left-0 right-0 py-1 px-1 text-center"
          style={{ background: `linear-gradient(to top, ${glowColor}40, transparent)` }}
        >
          <p className="font-display text-[10px] uppercase tracking-wider text-white leading-tight truncate">
            {character.name.split(" ")[0]}
          </p>
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${glowColor}10 0%, transparent 60%)` }}
        />
      </div>
    </div>
  );
}

// Labels that may prefix a whyWon item — rendered as styled badges
const REASON_LABELS = ["LOSER SHOWCASE", "TURNING POINT", "WINNER PROOF", "KEY FACTOR"] as const;

function parseReasonLabel(text: string): { label: string | null; body: string } {
  for (const lbl of REASON_LABELS) {
    const prefix = `${lbl}:`;
    if (text.toUpperCase().startsWith(prefix)) {
      return { label: lbl, body: text.slice(prefix.length).trim() };
    }
  }
  return { label: null, body: text };
}

function attackBadge(type: string | undefined): { label: string; color: string } | null {
  if (!type) return null;
  if (type.startsWith("chaos"))  return { label: "CHAOS",    color: "#ff8c00" };
  if (type === "betrayal")       return { label: "BETRAYAL", color: "#9b59b6" };
  if (type === "gang-up")        return { label: "GANG UP",  color: "#f1c40f" };
  return null;
}

function SynergyBadges({ result }: { result: FightResult }) {
  const t1 = Array.isArray(result.team1) ? result.team1 : [];
  const t2 = Array.isArray(result.team2) ? result.team2 : [];
  const syn1 = computeSynergy(t1);
  const syn2 = computeSynergy(t2);
  const all1 = syn1.active;
  const all2 = syn2.active;
  if (all1.length === 0 && all2.length === 0) return null;

  const renderBadge = (s: { label: string; bonus: number; positive: boolean }, teamColor: string, key: string) => {
    const pct = Math.round(Math.abs(s.bonus) * 100);
    const color = s.positive ? "#00e87a" : "#ff3b30";
    return (
      <span
        key={key}
        title={s.positive ? `+${pct}% synergy bonus` : `-${pct}% penalty`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 8,
          fontFamily: "var(--font-display, monospace)",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color,
          background: `${color}10`,
          border: `1px solid ${color}30`,
          borderRadius: 2,
          padding: "2px 6px",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: teamColor, opacity: 0.6, fontSize: 7 }}>◆</span>
        {s.label}
        <span style={{ opacity: 0.7 }}>{s.positive ? `+${pct}%` : `-${pct}%`}</span>
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      {all1.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span style={{ fontSize: 8, fontFamily: "var(--font-display, monospace)", letterSpacing: "0.18em", color: "rgba(0,240,255,0.4)", fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>T1</span>
          {all1.map((s, i) => renderBadge(s, "#00f0ff", `t1-${i}`))}
        </div>
      )}
      {all2.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span style={{ fontSize: 8, fontFamily: "var(--font-display, monospace)", letterSpacing: "0.18em", color: "rgba(255,59,48,0.4)", fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>T2</span>
          {all2.map((s, i) => renderBadge(s, "#ff3b30", `t2-${i}`))}
        </div>
      )}
    </div>
  );
}

function RoundBreakdown({ result }: { result: FightResult }) {
  const rounds      = Array.isArray(result.rounds) ? result.rounds : [];
  const team1Names  = new Set((Array.isArray(result.team1) ? result.team1 : []).map(c => c.name));
  const winnerIsT1  = result.winner === 1;
  const t1Col = "#00f0ff";
  const t2Col = "#ff3b30";

  return (
    <div
      className="w-full rounded overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.25)",
        }}
      >
        <span style={{ width: 20, textAlign: "right" }}>#</span>
        <span style={{ width: 62, flexShrink: 0 }}>TYPE</span>
        <span className="flex-1">ATTACKER → DEFENDER</span>
        <span style={{ color: t1Col }}>T1</span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
        <span style={{ color: t2Col }}>T2</span>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
        {rounds.map((r, idx) => {
          const badge       = attackBadge(r.attackType);
          const attackerIsT1 = team1Names.has(r.attacker);

          return (
            <div
              key={idx}
              className="flex items-center gap-2 px-3"
              style={{
                padding: "6px 12px",
                borderBottom: idx < rounds.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                fontSize: 11,
              }}
            >
              <span
                className="font-display flex-shrink-0"
                style={{ color: "rgba(255,255,255,0.22)", width: 20, textAlign: "right" }}
              >
                {r.round}
              </span>

              <span style={{ width: 62, flexShrink: 0 }}>
                {badge ? (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: badge.color,
                      border: `1px solid ${badge.color}55`,
                      padding: "1px 5px",
                      borderRadius: 2,
                    }}
                  >
                    {badge.label}
                  </span>
                ) : null}
              </span>

              <span className="flex-1 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span style={{ color: attackerIsT1 ? t1Col : t2Col, fontWeight: 600 }}>{r.attacker}</span>
                <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 5px" }}>→</span>
                <span style={{ color: !attackerIsT1 ? t1Col : t2Col, opacity: 0.8 }}>{r.defender}</span>
              </span>

              <span
                style={{
                  color: winnerIsT1 ? t1Col : "rgba(255,255,255,0.3)",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 10,
                  width: 26,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {r.team1Hp}
              </span>
              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>|</span>
              <span
                style={{
                  color: !winnerIsT1 ? t2Col : "rgba(255,255,255,0.3)",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 10,
                  width: 26,
                  flexShrink: 0,
                }}
              >
                {r.team2Hp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VictoryScreen({ result, onClose, onRematch }: VictoryScreenProps) {
  const [phase, setPhase]     = useState(0);
  const [copied, setCopied]   = useState(false);
  const [shared, setShared]   = useState(false);

  const reasons = Array.isArray(result.whyWon) ? result.whyWon : [];

  const winnerTeam: Character[] = result.winner === 1
    ? (Array.isArray(result.team1) ? result.team1 : [])
    : (Array.isArray(result.team2) ? result.team2 : []);
  const teamColor    = result.winner === 1 ? "team1" : "team2";
  const teamColorHex = result.winner === 1 ? "#00f0ff" : "#ff3b30";
  const particles    = useParticles(32, teamColor);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 1300),
      setTimeout(() => setPhase(4), 1900),
      setTimeout(() => setPhase(5), 2500),
      setTimeout(() => setPhase(6), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const buildShareText = (includeHashtags = false) => {
    const t1Names   = (Array.isArray(result.team1) ? result.team1 : []).map(c => c.name).join(" & ");
    const t2Names   = (Array.isArray(result.team2) ? result.team2 : []).map(c => c.name).join(" & ");
    const wNames    = winnerTeam.map(c => c.name).join(" & ");
    const rounds    = (Array.isArray(result.rounds) ? result.rounds : []).length;
    const tags      = includeHashtags ? "\n\n#AvA #AnyoneVsAnyone" : "";
    return [
      `⚔️ A.v.A — Anyone vs Anyone`,
      ``,
      `${t1Names} vs ${t2Names}`,
      ``,
      `🏆 Winner: ${wNames}`,
      ``,
      reasons[0] ? `"${reasons[0]}"` : "",
      ``,
      `${rounds} rounds fought.${tags}`,
    ].filter(l => l !== undefined).join("\n");
  };

  const handleShare = async () => {
    const text = buildShareText(false);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "A.v.A — Anyone vs Anyone", text });
        setShared(true);
        setTimeout(() => setShared(false), 2200);
        return;
      } catch {
        // fall through to clipboard
      }
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  };

  const handleTweet = () => {
    const text = buildShareText(true);
    const url  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      style={{ background: "radial-gradient(ellipse at center, #0a0a0f 0%, #000000 100%)" }}
    >
      {/* Ambient particles + light rays */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="victory-particle"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              ["--drift" as string]: p.drift,
              boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
            }}
          />
        ))}
        {phase >= 2 &&
          [...Array(8)].map((_, i) => (
            <div
              key={i}
              className="victory-light-ray absolute top-0 bottom-0 origin-bottom"
              style={{
                left: `${10 + i * 11}%`,
                width: "6%",
                background: `linear-gradient(to top, ${teamColorHex}00, ${teamColorHex}14, ${teamColorHex}00)`,
                transform: `rotate(${(i - 3.5) * 3}deg)`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
      </div>

      {/* Screen flash */}
      {phase === 1 && (
        <div
          className="victory-flash fixed inset-0 pointer-events-none"
          style={{ background: teamColorHex, zIndex: 70 }}
        />
      )}

      {/* Scrollable content column */}
      <div className="relative z-10 min-h-full flex flex-col items-center px-4 py-10 gap-8 max-w-2xl mx-auto">

        {/* Portraits */}
        {phase >= 2 && (
          <div className="flex items-end justify-center gap-3 sm:gap-5 flex-wrap">
            {winnerTeam.map((c, i) => (
              <PortraitPillar key={c.id} character={c} delay={i * 160} teamColor={teamColor} />
            ))}
          </div>
        )}

        {/* Title + summary */}
        {phase >= 3 && (
          <div className="text-center">
            <p
              className="victory-slam font-display text-[10px] sm:text-xs uppercase tracking-[0.5em] mb-1"
              style={{ color: teamColorHex }}
            >
              Team {result.winner} — {winnerTeam.map(c => c.name.split(" ")[0]).join(" & ")}
            </p>
            <h1
              className="victory-slam victory-glow-pulse font-display uppercase leading-none"
              style={{ fontSize: "clamp(2.8rem, 11vw, 6rem)", color: teamColorHex, animationDelay: "60ms" }}
            >
              Wins
            </h1>
            <div
              className="mx-auto mt-3 h-px"
              style={{
                width: "clamp(100px, 35vw, 260px)",
                background: `linear-gradient(to right, transparent, ${teamColorHex}, transparent)`,
              }}
            />

            {/* Cache status badge + win rate */}
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              {result.settled ? (
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-display, monospace)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#00e87a",
                    background: "rgba(0,232,122,0.08)",
                    border: "1px solid rgba(0,232,122,0.3)",
                    borderRadius: 2,
                    padding: "2px 7px",
                  }}
                  title="This verdict is cached — rematches will always produce the same winner."
                >
                  ✓ VERDICT LOCKED
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-display, monospace)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(255,160,0,0.8)",
                    background: "rgba(255,160,0,0.06)",
                    border: "1px solid rgba(255,160,0,0.2)",
                    borderRadius: 2,
                    padding: "2px 7px",
                  }}
                  title="Live simulation — result not yet cached or Upset Mode was active."
                >
                  ⚡ LIVE SIM
                </span>
              )}
              {result.winRate !== undefined && (
                <span
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-display, monospace)",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.4)",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 2,
                    padding: "2px 7px",
                  }}
                  title="Winner's estimated win rate for this matchup — shown only for close fights."
                >
                  WIN RATE: {result.winRate}%
                </span>
              )}
            </div>

            <p className="mt-4 text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed italic mx-auto">
              {result.summary}
            </p>
          </div>
        )}

        {/* 3 Reasons */}
        {phase >= 4 && (
          <div className="victory-fade-up w-full" style={{ animationDelay: "0ms" }}>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.3em] mb-3 text-center"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              Why they won
            </p>
            <div className="flex flex-col gap-2">
              {reasons.map((reason, i) => {
                const { label, body } = parseReasonLabel(reason);
                return (
                  <div
                    key={i}
                    className="flex gap-3 items-start px-4 py-3 rounded"
                    style={{
                      background: `${teamColorHex}08`,
                      border: `1px solid ${teamColorHex}1e`,
                    }}
                  >
                    <span
                      className="font-display text-sm font-bold flex-shrink-0 mt-px"
                      style={{ color: teamColorHex, opacity: 0.65 }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm leading-snug" style={{ color: "rgba(255,255,255,0.75)" }}>
                      {label && (
                        <span
                          className="inline-block text-[9px] font-bold tracking-widest uppercase rounded px-1.5 py-0.5 mr-2 align-middle"
                          style={{
                            background: `${teamColorHex}22`,
                            color: teamColorHex,
                            letterSpacing: "0.12em",
                          }}
                        >
                          {label}
                        </span>
                      )}
                      {body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Synergy / weakness badges */}
        {phase >= 5 && (
          <div className="victory-fade-up w-full" style={{ animationDelay: "0ms" }}>
            <SynergyBadges result={result} />
          </div>
        )}

        {/* Round breakdown */}
        {phase >= 5 && (
          <div className="victory-fade-up w-full" style={{ animationDelay: "0ms" }}>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.3em] mb-2 text-center"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              {(Array.isArray(result.rounds) ? result.rounds : []).length} rounds — breakdown
            </p>
            <RoundBreakdown result={result} />
          </div>
        )}

        {/* Buttons */}
        {phase >= 6 && (
          <div
            className="victory-fade-up flex flex-col items-center gap-3 pb-6 w-full"
            style={{ animationDelay: "0ms" }}
          >
            <div className="flex flex-wrap justify-center gap-3">
              {onRematch && (
                <button
                  onClick={onRematch}
                  className="flex items-center gap-2 font-display text-sm uppercase tracking-widest px-6 py-3 border-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    borderColor: teamColorHex,
                    color: teamColorHex,
                    background: `${teamColorHex}12`,
                    boxShadow: `0 0 20px ${teamColorHex}30`,
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Rematch
                </button>
              )}

              <button
                onClick={onClose}
                className="flex items-center gap-2 font-display text-sm uppercase tracking-widest px-6 py-3 border transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <Swords className="h-4 w-4" />
                New Fight
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 font-display text-sm uppercase tracking-widest px-5 py-3 border transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  borderColor: (copied || shared) ? "#22c55e60" : "rgba(255,255,255,0.12)",
                  color: (copied || shared) ? "#22c55e" : "rgba(255,255,255,0.35)",
                  background: (copied || shared) ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
                }}
              >
                {(copied || shared) ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {shared ? "Shared!" : copied ? "Copied!" : "Share"}
              </button>

              <button
                onClick={handleTweet}
                className="flex items-center gap-2 font-display text-sm uppercase tracking-widest px-5 py-3 border transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  borderColor: "rgba(29,161,242,0.4)",
                  color: "rgba(29,161,242,0.8)",
                  background: "rgba(29,161,242,0.05)",
                }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.835L1.254 2.25H8.08l4.254 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Post
              </button>
            </div>

            <AvaLogo className="h-7 w-auto opacity-25 mt-3" />
          </div>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 h-20 pointer-events-none"
        style={{ background: "linear-gradient(to top, #000, transparent)", zIndex: 5 }}
      />
    </div>
  );
}
