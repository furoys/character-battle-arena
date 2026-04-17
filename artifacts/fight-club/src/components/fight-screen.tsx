import { useState, useEffect, useRef } from "react";
import { FightResult, FightRound } from "@workspace/api-client-react/src/generated/api.schemas";
import { ChevronLeft, Swords, Zap, Trophy } from "lucide-react";
import { VictoryScreen } from "@/components/victory-screen";
import { useMusic } from "@/contexts/music-context";

// ─── Cinematic loading sequence ───────────────────────────────────────────────
const FIGHT_PHASES = [
  { label: "The arena comes alive…", sub: "Calculating terrain and hazards" },
  { label: "Fighters enter the arena…", sub: "Reading power levels and abilities" },
  { label: "The air crackles with tension…", sub: "Computing synergies and rivalries" },
  { label: "First blood is drawn…", sub: "Simulating round-by-round combat" },
  { label: "The tide shifts…", sub: "Determining momentum and chaos events" },
  { label: "A winner emerges…", sub: "Writing the cinematic narrative" },
  { label: "The dust settles…", sub: "Finalising the outcome" },
];

function FightLoadingSequence({ team1Names, team2Names }: { team1Names: string[]; team2Names: string[] }) {
  const [phase, setPhase] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhase(p => (p + 1) % FIGHT_PHASES.length);
        setVisible(true);
      }, 300);
    }, 3200);
    return () => clearInterval(iv);
  }, []);

  const current = FIGHT_PHASES[phase];

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 px-6">
      {/* Clash icon */}
      <div className="relative">
        <Swords
          className="h-10 w-10"
          style={{
            color: "#ff0055",
            filter: "drop-shadow(0 0 16px rgba(255,0,85,0.7))",
            animation: "rotateSlow 4s linear infinite",
          }}
        />
        <div
          className="absolute -inset-3 rounded-full"
          style={{
            border: "1px solid rgba(255,0,85,0.2)",
            animation: "ping 1.6s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
      </div>

      {/* Fighter names */}
      <div className="flex items-center gap-3">
        <span className="font-display text-xs uppercase tracking-widest" style={{ color: "#00f0ff" }}>
          {team1Names.slice(0, 2).join(" & ")}
        </span>
        <span className="font-display text-xs" style={{ color: "rgba(255,0,85,0.6)" }}>⚔</span>
        <span className="font-display text-xs uppercase tracking-widest" style={{ color: "#ff3b30" }}>
          {team2Names.slice(0, 2).join(" & ")}
        </span>
      </div>

      {/* Phase text */}
      <div
        className="text-center transition-all duration-300"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(6px)" }}
      >
        <p className="font-display uppercase tracking-[0.2em] mb-1" style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
          {current?.label}
        </p>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>
          {current?.sub}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {FIGHT_PHASES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === phase ? 20 : 6,
              height: 6,
              background: i === phase ? "#ff0055" : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </div>

      {/* Scanline shimmer bar */}
      <div className="w-48 h-px overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full"
          style={{
            width: "40%",
            background: "linear-gradient(90deg, transparent, #ff0055, transparent)",
            animation: "shimmer 1.8s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

interface FightScreenProps {
  open: boolean;
  onClose: () => void;
  onRematch?: () => void;
  result: FightResult | null;
  isSimulating: boolean;
  team1Names: string[];
  team2Names: string[];
  team1Images?: (string | null | undefined)[];
  team2Images?: (string | null | undefined)[];
  mode?: "cinematic" | "brutal" | "realistic";
}

function HpBar({ pct, team }: { pct: number; team: 1 | 2 }) {
  return (
    <div className="h-1.5 bg-muted/30 overflow-hidden">
      <div
        className={`h-full transition-all duration-700 ${team === 1 ? "bg-team1" : "bg-team2"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PortraitStack({
  images, names, team, hitFlash, attackGlow, hpPct,
}: {
  images: (string | null | undefined)[];
  names: string[];
  team: 1 | 2;
  hitFlash: boolean;
  attackGlow: boolean;
  hpPct: number;
}) {
  const isLeft = team === 1;
  const color = team === 1 ? "#00f0ff" : "#ff3b30";
  const shown = images.slice(0, 3);

  return (
    <div
      className={`absolute top-0 bottom-0 flex items-end pb-2 ${isLeft ? "left-0 pl-2 justify-start" : "right-0 pr-2 justify-end"}`}
      style={{ width: "42%" }}
    >
      <div className={`relative flex ${isLeft ? "" : "flex-row-reverse"}`}>
        {shown.map((img, i) => {
          const offset = i * 26;
          const rotate = isLeft ? -4 + i * 2 : 4 - i * 2;
          const scale = 1 - i * 0.08;
          const z = 10 - i;
          const initials = (names[i] || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

          return (
            <div
              key={i}
              className="absolute bottom-0"
              style={{
                left: isLeft ? offset : undefined,
                right: !isLeft ? offset : undefined,
                zIndex: z,
                transform: `rotate(${rotate}deg) scale(${scale})`,
                transition: "transform 0.3s ease",
              }}
            >
              <div
                className="relative overflow-hidden border-2"
                style={{
                  width: 72 - i * 8,
                  height: 96 - i * 10,
                  borderColor: i === 0 ? color : "rgba(255,255,255,0.15)",
                  boxShadow: attackGlow && i === 0
                    ? `0 0 24px ${color}, 0 0 48px ${color}40`
                    : hitFlash && i === 0
                    ? "0 0 20px rgba(255,59,48,0.8)"
                    : `0 4px 12px rgba(0,0,0,0.6)`,
                  animation: hitFlash && i === 0 ? "hitShake 0.3s ease" : undefined,
                  transition: "box-shadow 0.3s ease",
                }}
              >
                {img ? (
                  <img
                    src={img}
                    alt={names[i] || ""}
                    className="w-full h-full object-cover object-top"
                    style={{
                      filter: hitFlash && i === 0
                        ? "brightness(1.8) saturate(0) sepia(1) hue-rotate(-20deg)"
                        : hpPct < 30
                        ? "brightness(0.7) saturate(0.6)"
                        : undefined,
                      transition: "filter 0.3s ease",
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-display font-bold text-sm"
                    style={{ background: `${color}20`, color }}
                  >
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
                {hpPct < 30 && i === 0 && (
                  <div className="absolute inset-0" style={{ background: "rgba(255,0,0,0.15)", animation: "pulse 1s infinite" }} />
                )}
              </div>
            </div>
          );
        })}
        <div style={{ width: 72 + (shown.length - 1) * 28, height: 96 }} />
      </div>
    </div>
  );
}

function ClashEffect({ active, winner }: { active: boolean; winner?: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="flex flex-col items-center gap-1">
        <div className="relative" style={{ animation: active ? "clashPulse 0.4s ease" : undefined }}>
          <Swords
            className="h-8 w-8"
            style={{
              color: winner ? (winner === 1 ? "#00f0ff" : "#ff3b30") : "#ff0055",
              filter: `drop-shadow(0 0 8px ${winner ? (winner === 1 ? "#00f0ff" : "#ff3b30") : "#ff0055"})`,
              animation: "rotateSlow 8s linear infinite",
            }}
          />
          {active && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "clashBurst 0.5s ease forwards" }}>
              <Zap className="h-10 w-10 absolute" style={{ color: "#fff", opacity: 0.9 }} />
            </div>
          )}
        </div>
        <span className="font-display text-[11px] uppercase tracking-[0.3em]" style={{ color: "#ff0055", textShadow: "0 0 12px rgba(255,0,85,0.8)" }}>
          vs
        </span>
        {active && (
          <div className="absolute inset-0 flex items-center justify-center">
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <div
                key={deg}
                className="absolute w-px bg-white"
                style={{
                  height: 20 + Math.random() * 20,
                  transform: `rotate(${deg}deg) translateY(-30px)`,
                  animation: "sparkFade 0.4s ease forwards",
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FightBanner({
  team1Images, team2Images, team1Names, team2Names,
  attackingTeam, team1HpPct, team2HpPct, isSimulating, winner,
}: {
  team1Images: (string | null | undefined)[];
  team2Images: (string | null | undefined)[];
  team1Names: string[];
  team2Names: string[];
  attackingTeam: 0 | 1 | 2;
  team1HpPct: number;
  team2HpPct: number;
  isSimulating: boolean;
  winner?: number;
}) {
  const [clashFlash, setClashFlash] = useState(false);

  useEffect(() => {
    if (attackingTeam !== 0) {
      setClashFlash(true);
      const t = setTimeout(() => setClashFlash(false), 500);
      return () => clearTimeout(t);
    }
  }, [attackingTeam]);

  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{ height: 130, background: "linear-gradient(180deg, #000 0%, #0a0a0f 60%, transparent 100%)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
          zIndex: 30,
        }}
      />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 40, background: "linear-gradient(0deg, rgba(255,0,85,0.08) 0%, transparent 100%)" }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: "radial-gradient(ellipse 30% 60% at 50% 50%, rgba(255,0,85,0.12) 0%, transparent 70%)" }} />

      <PortraitStack images={team1Images} names={team1Names} team={1} hitFlash={attackingTeam === 2 && clashFlash} attackGlow={attackingTeam === 1 && clashFlash} hpPct={team1HpPct} />
      <PortraitStack images={team2Images} names={team2Names} team={2} hitFlash={attackingTeam === 1 && clashFlash} attackGlow={attackingTeam === 2 && clashFlash} hpPct={team2HpPct} />
      <ClashEffect active={clashFlash} winner={winner} />

      {isSimulating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-40">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Labels for each round position in a 5-round fight
const ROUND_LABELS: Record<number, { label: string; accent: string }> = {
  0: { label: "Opening",       accent: "#00f0ff" },
  1: { label: "Escalation",    accent: "#ff9f0a" },
  2: { label: "⚡ Turning Point", accent: "#ff0055" },
  3: { label: "Last Stand",    accent: "#bf5af2" },
  4: { label: "Finale",        accent: "#ffd700" },
};

// RoundBlock: slides in and fades text visible shortly after mount
function RoundBlock({ round, index }: { round: FightRound; index: number }) {
  const [visible, setVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setTextVisible(true), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const isTurningPoint = index === 2;
  const meta = ROUND_LABELS[index];
  const teamColor = index % 2 === 0 ? "var(--color-team1, #00f0ff)" : "var(--color-team2, #ff3b30)";
  const accentColor = meta?.accent ?? teamColor;

  return (
    <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Turning-point divider */}
      {isTurningPoint && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #ff005560)" }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: "#ff0055" }}>
            The tide shifts
          </span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #ff005560)" }} />
        </div>
      )}
      {/* Round header */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 shrink-0"
          style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}40` }}
        >
          Round {round.round}
        </span>
        {meta && (
          <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: `${accentColor}80` }}>
            {meta.label}
          </span>
        )}
        <span className="text-[9px] text-muted-foreground/40 bg-muted/20 px-1.5 py-0.5 ml-auto">
          {round.attacker} · {round.attackType}
        </span>
      </div>
      {/* Narrative — full paragraph(s) */}
      <div
        className={`border-l-2 pl-4 transition-all duration-400 ${textVisible ? "opacity-100" : "opacity-0"}`}
        style={{ borderColor: `${accentColor}40` }}
      >
        <p className="text-sm leading-loose text-foreground/90 whitespace-pre-line">
          {round.narrative}
        </p>
      </div>
    </div>
  );
}

export function FightScreen({
  open, onClose, onRematch, result, isSimulating,
  team1Names, team2Names,
  team1Images = [], team2Images = [],
  mode = "cinematic",
}: FightScreenProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [allRoundsDone, setAllRoundsDone] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [attackingTeam, setAttackingTeam] = useState<0 | 1 | 2>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { setTrack } = useMusic();

  // Music: battle while simulating, victory on results screen, lobby when closed
  useEffect(() => {
    if (!open) {
      setTrack("lobby");
    } else if (isSimulating) {
      setTrack("battle");
    }
  }, [open, isSimulating, setTrack]);

  useEffect(() => {
    if (showVictory) setTrack("victory");
  }, [showVictory, setTrack]);

  // Clear all pending auto-reveal timers
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // Auto-reveal all rounds in sequence, then mark done
  useEffect(() => {
    clearTimers();
    if (open && result && !isSimulating) {
      setVisibleCount(0);
      setAllRoundsDone(false);
      setShowVictory(false);
      setAttackingTeam(0);

      const totalRounds = result.rounds.length;
      // Stagger: first round at 700ms, then every 2200ms — gives each round room to breathe
      // Round 3 (turning point) gets extra 600ms pause before it drops
      let elapsed = 700;
      for (let i = 0; i < totalRounds; i++) {
        const extraPause = i === 2 ? 600 : 0; // dramatic pause before the turning point
        elapsed += extraPause;
        const delay = elapsed;
        const t = setTimeout(() => {
          setVisibleCount(i + 1);
          setAttackingTeam((i % 2 === 0 ? 1 : 2) as 1 | 2);
        }, delay);
        timersRef.current.push(t);
        elapsed += 2200;
      }
      // Mark all done 1000ms after the last round appears
      const doneDelay = elapsed + 1000;
      const tDone = setTimeout(() => setAllRoundsDone(true), doneDelay);
      timersRef.current.push(tDone);
    }
    if (!open) {
      setVisibleCount(0);
      setAllRoundsDone(false);
      setShowVictory(false);
      setAttackingTeam(0);
    }
    return clearTimers;
  }, [open, result, isSimulating]);

  // Rematch: reset fight state then trigger a new fight
  const handleRematch = () => {
    setShowVictory(false);
    setAllRoundsDone(false);
    setVisibleCount(0);
    setAttackingTeam(0);
    onRematch?.();
  };

  // Skip: cancel auto-reveal and jump straight to all rounds + results button
  const handleSkip = () => {
    if (!result) return;
    clearTimers();
    setVisibleCount(result.rounds.length);
    setAllRoundsDone(true);
  };

  useEffect(() => {
    if (visibleCount > 0 || allRoundsDone) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [visibleCount, allRoundsDone]);

  let team1HpPct = 100;
  let team2HpPct = 100;
  if (result && result.rounds.length > 0) {
    const shownRounds = result.rounds.slice(0, visibleCount);
    if (shownRounds.length > 0) {
      const last = shownRounds[shownRounds.length - 1]!;
      // HP is on a 0-100 scale from the server — use it directly as a percentage
      team1HpPct = Math.max(0, Math.min(100, last.team1Hp));
      team2HpPct = Math.max(0, Math.min(100, last.team2Hp));
    }
  }

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes rotateSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes clashPulse { 0% { transform: scale(1); } 40% { transform: scale(1.6); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        @keyframes clashBurst { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes sparkFade { 0% { opacity: 1; transform: rotate(var(--r)) translateY(-20px) scaleY(1); } 100% { opacity: 0; transform: rotate(var(--r)) translateY(-50px) scaleY(0.3); } }
        @keyframes hitShake { 0% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } 100% { transform: translateX(0); } }
        @keyframes continuePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { transform: translateX(-200%); } 100% { transform: translateX(500%); } }
      `}</style>

      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300">
        {/* Fight Banner */}
        <div className="flex-shrink-0 border-b border-border/30">
          <FightBanner
            team1Images={team1Images}
            team2Images={team2Images}
            team1Names={team1Names}
            team2Names={team2Names}
            attackingTeam={attackingTeam}
            team1HpPct={team1HpPct}
            team2HpPct={team2HpPct}
            isSimulating={isSimulating}
            winner={allRoundsDone ? result?.winner : undefined}
          />

          {/* HP Bars */}
          <div className="grid grid-cols-2 bg-card/90">
            <div>
              <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
                <span className="font-display text-xs uppercase tracking-widest text-team1">Team 1</span>
                <span className="text-[9px] text-muted-foreground truncate ml-2 max-w-[100px] text-right">{team1Names.join(", ")}</span>
              </div>
              <HpBar pct={team1HpPct} team={1} />
            </div>
            <div>
              <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
                <span className="text-[9px] text-muted-foreground truncate mr-2 max-w-[100px]">{team2Names.join(", ")}</span>
                <span className="font-display text-xs uppercase tracking-widest text-team2">Team 2</span>
              </div>
              <HpBar pct={team2HpPct} team={2} />
            </div>
          </div>
        </div>

        {/* Narrative area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {result && !isSimulating ? (
              <>
                <div className="text-center py-2">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
                    {team1Names.join(" & ")} vs {team2Names.join(" & ")}
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "1px 8px",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color:
                        mode === "realistic" ? "#00e5ff" :
                        mode === "brutal"    ? "#ff7a00" :
                                               "#ff0055",
                      border: `1px solid ${
                        mode === "realistic" ? "#00e5ff40" :
                        mode === "brutal"    ? "#ff7a0040" :
                                               "#ff005540"
                      }`,
                      borderRadius: 2,
                    }}
                  >
                    {mode === "realistic" ? "⚖ Realistic" :
                     mode === "brutal"    ? "⚔ Brutal"    :
                                            "✦ Cinematic"}
                  </span>
                  <div className="mt-2 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                </div>

                {/* 1. SETTING — arena description */}
                {result.arenaIntro && (
                  <div className="mb-1 px-1 animate-in fade-in duration-700">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50 mb-2">
                      ── Setting ──
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/75 italic">
                      {result.arenaIntro}
                    </p>
                    <div className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  </div>
                )}

                {/* 2. COMBATANT ENTRANCE */}
                {result.intro && (
                  <div className="mb-1 px-1 animate-in fade-in duration-700 delay-200">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50 mb-2">
                      ── Combatants Enter ──
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                      {result.intro}
                    </p>
                    <div className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  </div>
                )}

                {/* 3–5. ROUNDS — auto-revealed in sequence */}
                {result.rounds.slice(0, visibleCount).map((round, idx) => (
                  <RoundBlock key={idx} round={round} index={idx} />
                ))}

                {/* All rounds done — prompt to see results */}
                {allRoundsDone && (
                  <button
                    onClick={() => setShowVictory(true)}
                    className="w-full pt-4 pb-6 animate-in fade-in duration-500 text-left"
                  >
                    <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    <p
                      className="text-center text-[10px] font-bold uppercase tracking-[0.4em] text-primary mt-4"
                      style={{ animation: "continuePulse 1.5s ease-in-out infinite" }}
                    >
                      ▼ The dust settles — tap to see the outcome ▼
                    </p>
                  </button>
                )}

                <div ref={bottomRef} className="h-4" />
              </>
            ) : !isSimulating ? null : (
              <FightLoadingSequence team1Names={team1Names} team2Names={team2Names} />
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex-shrink-0 border-t border-border/30 bg-card/80 p-4 flex items-center justify-between gap-3">
          {/* Back */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            Arena
          </button>

          {/* Right side — context-sensitive */}
          {result && !isSimulating && (
            <div className="flex items-center gap-3">
              {/* Skip — jumps ahead while auto-reveal is in progress */}
              {!allRoundsDone && (
                <button
                  onClick={handleSkip}
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  Skip
                </button>
              )}

              {/* See Results — appears automatically once all rounds are shown */}
              {allRoundsDone && (
                <button
                  onClick={() => setShowVictory(true)}
                  className="flex items-center gap-2 font-display text-base uppercase tracking-widest text-primary border-2 border-primary px-5 py-2.5 hover:bg-primary/10 transition-all active:scale-95"
                  style={{
                    boxShadow: "0 0 20px rgba(255,0,85,0.3)",
                    animation: "continuePulse 1.5s ease-in-out infinite",
                  }}
                >
                  <Trophy className="h-4 w-4" />
                  See Results
                </button>
              )}
            </div>
          )}
        </div>

        {/* Victory overlay */}
        {showVictory && result && (
          <VictoryScreen
            result={result}
            mode={mode}
            onClose={onClose}
            onRematch={onRematch ? handleRematch : undefined}
          />
        )}
      </div>
    </>
  );
}
