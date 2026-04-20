import { useEffect, useState, useMemo } from "react";
import { Character, FightResult, FightRound } from "@workspace/api-client-react/src/generated/api.schemas";
import { Swords, RotateCcw, Copy, Check, Share2 } from "lucide-react";
import { AvaLogo } from "@/components/ava-logo";

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

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n));
}

function computeReasons(result: FightResult): string[] {
  const winner     = result.winner;
  const winnerTeam: Character[] = winner === 1 ? (result.team1 ?? []) : (result.team2 ?? []);
  const loserTeam: Character[]  = winner === 1 ? (result.team2 ?? []) : (result.team1 ?? []);
  const rounds: FightRound[]    = result.rounds ?? [];

  const candidates: Array<{ weight: number; text: string }> = [];

  const winPow = winnerTeam.reduce((s, c) => s + c.strength + c.speed + c.intelligence + c.durability, 0);
  const losPow = loserTeam.reduce( (s, c) => s + c.strength + c.speed + c.intelligence + c.durability, 0);
  const powDiff = Math.max(winPow, losPow) > 0 ? (winPow - losPow) / Math.max(winPow, losPow) : 0;
  if (powDiff > 0.15) {
    candidates.push({ weight: 4, text: `Dominant power advantage — combined rating ${fmtK(winPow)} vs ${fmtK(losPow)}. On paper, this was never close.` });
  } else if (powDiff > 0.06) {
    candidates.push({ weight: 2, text: `Modest but consistent power edge — ${fmtK(winPow)} vs ${fmtK(losPow)} total rating across all stats.` });
  } else if (Math.abs(powDiff) <= 0.03 && winnerTeam.length > 0) {
    candidates.push({ weight: 1, text: `Nearly identical total power ratings (${fmtK(winPow)} vs ${fmtK(losPow)}). This was decided by execution, not numbers.` });
  }

  const winSpd = winnerTeam.length ? winnerTeam.reduce((s, c) => s + c.speed, 0) / winnerTeam.length : 0;
  const losSpd = loserTeam.length  ? loserTeam.reduce( (s, c) => s + c.speed, 0) / loserTeam.length  : 0;
  const spdDiff = Math.max(winSpd, losSpd) > 0 ? (winSpd - losSpd) / Math.max(winSpd, losSpd) : 0;
  if (spdDiff > 0.15) {
    candidates.push({ weight: 3, text: `Speed was the deciding factor — avg ${fmtK(winSpd)} vs ${fmtK(losSpd)}. Faster team controls who hits first, every time.` });
  } else if (spdDiff > 0.08) {
    candidates.push({ weight: 2, text: `Speed advantage gave them initiative — avg ${fmtK(winSpd)} vs ${fmtK(losSpd)}.` });
  }

  const winnerNames = new Set(winnerTeam.map(c => c.name));
  const normalRounds = rounds.filter(r => !r.attackType?.startsWith("chaos") && r.attackType !== "betrayal");
  const winAttacks = normalRounds.filter(r => winnerNames.has(r.attacker)).length;
  const initPct = normalRounds.length > 0 ? Math.round((winAttacks / normalRounds.length) * 100) : 50;
  if (initPct >= 62) {
    candidates.push({ weight: 2, text: `Controlled the pace — initiated ${winAttacks} of ${normalRounds.length} exchanges (${initPct}%). The other side was always reacting.` });
  } else if (initPct <= 40 && normalRounds.length > 0) {
    candidates.push({ weight: 2, text: `Won despite fighting reactively — attacking only ${winAttacks} of ${normalRounds.length} rounds. Counterattacking was their weapon.` });
  }

  const winHpKey = winner === 1 ? "team1Hp" : "team2Hp";
  const losHpKey = winner === 1 ? "team2Hp" : "team1Hp";
  const minWinHp = rounds.length > 0 ? Math.min(...rounds.map(r => (r as Record<string, number>)[winHpKey] ?? 100)) : 100;
  if (minWinHp <= 12) {
    candidates.push({ weight: 4, text: `Survived near-death at ${minWinHp}% HP and refused to go down. The comeback was the fight.` });
  } else if (minWinHp <= 28) {
    candidates.push({ weight: 2, text: `Took serious damage — reached ${minWinHp}% HP at their worst — but had more left in the tank.` });
  } else if (minWinHp >= 50) {
    candidates.push({ weight: 2, text: `Never truly threatened — lowest HP was ${minWinHp}%. Controlled from start to finish.` });
  }

  let wasLosing = false;
  for (const r of rounds) {
    const wHp = (r as Record<string, number>)[winHpKey] ?? 100;
    const lHp = (r as Record<string, number>)[losHpKey] ?? 100;
    if (lHp > wHp + 22) { wasLosing = true; break; }
  }
  if (wasLosing) {
    candidates.push({ weight: 4, text: `They were losing — significantly — and won anyway. That's the kind of result people argue about.` });
  }

  const chaosRounds = rounds.filter(r => r.attackType?.startsWith("chaos"));
  if (chaosRounds.length >= 2) {
    const loserNamesSet = new Set(loserTeam.map(c => c.name));
    const chaosHitLoser  = chaosRounds.filter(r => loserNamesSet.has(r.defender)).length;
    const chaosHitWinner = chaosRounds.length - chaosHitLoser;
    if (chaosHitLoser >= 2 && chaosHitLoser > chaosHitWinner) {
      candidates.push({ weight: 1, text: `Chaos events were disproportionately unkind to the other side — ${chaosHitLoser} vs ${chaosHitWinner}. Luck played a role.` });
    }
  }

  const winStr = winnerTeam.length ? winnerTeam.reduce((s, c) => s + c.strength, 0) / winnerTeam.length : 0;
  const losStr = loserTeam.length  ? loserTeam.reduce( (s, c) => s + c.strength, 0) / loserTeam.length  : 0;
  if (Math.max(winStr, losStr) > 0 && (winStr - losStr) / Math.max(winStr, losStr) > 0.2 && powDiff < 0.1) {
    candidates.push({ weight: 2, text: `Strength was the differentiator — avg ${fmtK(winStr)} vs ${fmtK(losStr)}. Every hit landed with more force.` });
  }

  const winDur = winnerTeam.length ? winnerTeam.reduce((s, c) => s + c.durability, 0) / winnerTeam.length : 0;
  const losDur = loserTeam.length  ? loserTeam.reduce( (s, c) => s + c.durability, 0) / loserTeam.length  : 0;
  if (Math.max(winDur, losDur) > 0 && (winDur - losDur) / Math.max(winDur, losDur) > 0.18) {
    candidates.push({ weight: 2, text: `Durability advantage was the anchor — avg ${fmtK(winDur)} vs ${fmtK(losDur)}. They absorbed punishment the other side couldn't.` });
  }

  const winInt = winnerTeam.length ? winnerTeam.reduce((s, c) => s + c.intelligence, 0) / winnerTeam.length : 0;
  const losInt = loserTeam.length  ? loserTeam.reduce( (s, c) => s + c.intelligence, 0) / loserTeam.length  : 0;
  if (Math.max(winInt, losInt) > 0 && (winInt - losInt) / Math.max(winInt, losInt) > 0.2 && powDiff < 0.08) {
    candidates.push({ weight: 2, text: `Intelligence advantage mattered here — avg ${fmtK(winInt)} vs ${fmtK(losInt)}. In a close fight, smarter fighters adapt.` });
  }

  candidates.sort((a, b) => b.weight - a.weight);

  const losFirstNames = loserTeam.map(c => c.name.split(" ")[0]).join(" and ");
  const fallbacks = [
    `${losFirstNames} had the tools. They just didn't have the answer.`,
    `In ${rounds.length} rounds, the margins add up. Every small edge compounded into this result.`,
    `Sometimes the stats don't predict the outcome. This was one of those fights.`,
  ];

  const top = candidates.slice(0, 3).map(r => r.text);
  while (top.length < 3) {
    top.push(fallbacks[top.length] ?? fallbacks[0]!);
  }
  return top;
}

function attackBadge(type: string | undefined): { label: string; color: string } | null {
  if (!type) return null;
  if (type.startsWith("chaos"))  return { label: "CHAOS",    color: "#ff8c00" };
  if (type === "betrayal")       return { label: "BETRAYAL", color: "#9b59b6" };
  if (type === "gang-up")        return { label: "GANG UP",  color: "#f1c40f" };
  return null;
}

function RoundBreakdown({ result }: { result: FightResult }) {
  const rounds      = result.rounds ?? [];
  const team1Names  = new Set((result.team1 ?? []).map(c => c.name));
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

  // Prefer AI-generated whyWon sentences; fall back to stat-computed reasons
  const reasons               = useMemo(
    () => (result.whyWon && result.whyWon.length > 0 ? result.whyWon : computeReasons(result)),
    [result],
  );

  const winnerTeam: Character[] = result.winner === 1 ? (result.team1 ?? []) : (result.team2 ?? []);
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
    const t1Names   = (result.team1 ?? []).map(c => c.name).join(" & ");
    const t2Names   = (result.team2 ?? []).map(c => c.name).join(" & ");
    const wNames    = winnerTeam.map(c => c.name).join(" & ");
    const rounds    = (result.rounds ?? []).length;
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
              {reasons.map((reason, i) => (
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
                    {reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Round breakdown */}
        {phase >= 5 && (
          <div className="victory-fade-up w-full" style={{ animationDelay: "0ms" }}>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.3em] mb-2 text-center"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              {(result.rounds ?? []).length} rounds — breakdown
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
