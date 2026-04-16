import { useState, useEffect, useRef } from "react";
import { FightResult, FightRound } from "@workspace/api-client-react/src/generated/api.schemas";
import { ChevronLeft, Swords, Zap } from "lucide-react";
import { VictoryScreen } from "@/components/victory-screen";

interface FightScreenProps {
  open: boolean;
  onClose: () => void;
  result: FightResult | null;
  isSimulating: boolean;
  team1Names: string[];
  team2Names: string[];
  team1Images?: (string | null | undefined)[];
  team2Images?: (string | null | undefined)[];
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
  images,
  names,
  team,
  hitFlash,
  attackGlow,
  hpPct,
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
          const initials = (names[i] || "?")
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

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
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)`,
                  }}
                />
                {hpPct < 30 && i === 0 && (
                  <div
                    className="absolute inset-0"
                    style={{ background: "rgba(255,0,0,0.15)", animation: "pulse 1s infinite" }}
                  />
                )}
              </div>
            </div>
          );
        })}
        {/* Invisible spacer to keep the stack width */}
        <div style={{ width: 72 + (shown.length - 1) * 28, height: 96 }} />
      </div>
    </div>
  );
}

function ClashEffect({ active, winner }: { active: boolean; winner?: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="flex flex-col items-center gap-1">
        {/* Main clash icon */}
        <div
          className="relative"
          style={{
            animation: active ? "clashPulse 0.4s ease" : undefined,
          }}
        >
          <Swords
            className="h-8 w-8"
            style={{
              color: winner ? (winner === 1 ? "#00f0ff" : "#ff3b30") : "#ff0055",
              filter: `drop-shadow(0 0 8px ${winner ? (winner === 1 ? "#00f0ff" : "#ff3b30") : "#ff0055"})`,
              animation: "rotateSlow 8s linear infinite",
            }}
          />
          {active && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ animation: "clashBurst 0.5s ease forwards" }}
            >
              <Zap
                className="h-10 w-10 absolute"
                style={{ color: "#fff", opacity: 0.9 }}
              />
            </div>
          )}
        </div>
        {/* VS label */}
        <span
          className="font-display text-[11px] uppercase tracking-[0.3em]"
          style={{
            color: "#ff0055",
            textShadow: "0 0 12px rgba(255,0,85,0.8)",
          }}
        >
          vs
        </span>
        {/* Lightning sparks */}
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
  team1Images,
  team2Images,
  team1Names,
  team2Names,
  attackingTeam,
  team1HpPct,
  team2HpPct,
  isSimulating,
  winner,
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
      style={{
        height: 130,
        background: "linear-gradient(180deg, #000 0%, #0a0a0f 60%, transparent 100%)",
      }}
    >
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
          zIndex: 30,
        }}
      />

      {/* Arena floor gradient */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 40,
          background: "linear-gradient(0deg, rgba(255,0,85,0.08) 0%, transparent 100%)",
        }}
      />

      {/* Center glow */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 30% 60% at 50% 50%, rgba(255,0,85,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Team 1 portraits */}
      <PortraitStack
        images={team1Images}
        names={team1Names}
        team={1}
        hitFlash={attackingTeam === 2 && clashFlash}
        attackGlow={attackingTeam === 1 && clashFlash}
        hpPct={team1HpPct}
      />

      {/* Team 2 portraits */}
      <PortraitStack
        images={team2Images}
        names={team2Names}
        team={2}
        hitFlash={attackingTeam === 1 && clashFlash}
        attackGlow={attackingTeam === 2 && clashFlash}
        hpPct={team2HpPct}
      />

      {/* Clash center */}
      <ClashEffect active={clashFlash} winner={winner} />

      {/* Simulating overlay */}
      {isSimulating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-40">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoundBlock({ round, index, onDone }: { round: FightRound; index: number; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setTextVisible(true), 350);
    const t3 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const isTeam1 = index % 2 === 0;

  return (
    <div
      className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className={`flex items-start gap-3 ${isTeam1 ? "" : "flex-row-reverse"}`}>
        <div className="flex-shrink-0 mt-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 block text-center
            ${isTeam1 ? "bg-team1/20 text-team1" : "bg-team2/20 text-team2"}`}>
            R{round.round}
          </span>
        </div>
        <div className={`flex-1 border-l-2 pl-4 ${isTeam1 ? "border-team1/40" : "border-team2/40 border-r-2 border-l-0 pr-4 pl-0 text-right"}`}>
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className={`font-display text-base uppercase tracking-wide font-bold
              ${isTeam1 ? "text-team1" : "text-team2"}`}>
              {round.attacker}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-muted/20 px-1.5">
              {round.attackType}
            </span>
          </div>
          <p className={`text-sm leading-relaxed text-foreground/90 transition-all duration-300 ${textVisible ? "opacity-100" : "opacity-0"}`}>
            {round.narrative}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FightScreen({
  open, onClose, result, isSimulating,
  team1Names, team2Names,
  team1Images = [], team2Images = [],
}: FightScreenProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [attackingTeam, setAttackingTeam] = useState<0 | 1 | 2>(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && result && !isSimulating) {
      setVisibleCount(0);
      setIsFinished(false);
      setShowVictory(false);
      setAttackingTeam(0);
      setTimeout(() => setVisibleCount(1), 400);
    }
    if (!open) {
      setVisibleCount(0);
      setIsFinished(false);
      setShowVictory(false);
      setAttackingTeam(0);
    }
  }, [open, result, isSimulating]);

  const handleRoundDone = (idx: number) => {
    if (!result) return;
    // Trigger clash animation for next round
    const nextIdx = idx + 1;
    if (nextIdx < result.rounds.length) {
      const nextTeam = nextIdx % 2 === 0 ? 1 : 2;
      setAttackingTeam(nextTeam as 1 | 2);
      setTimeout(() => setVisibleCount(nextIdx + 1), 500);
    } else {
      setTimeout(() => setIsFinished(true), 800);
      setTimeout(() => setShowVictory(true), 2400);
    }
  };

  // Fire initial clash when first round appears
  useEffect(() => {
    if (visibleCount === 1 && result) {
      setAttackingTeam(1);
    }
  }, [visibleCount]);

  useEffect(() => {
    if (visibleCount > 0 || isFinished) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [visibleCount, isFinished]);

  let team1HpPct = 100;
  let team2HpPct = 100;
  if (result && result.rounds.length > 0) {
    const shownRounds = result.rounds.slice(0, visibleCount);
    if (shownRounds.length > 0) {
      const last = shownRounds[shownRounds.length - 1];
      const initMax1 = result.rounds.reduce((m, r) => Math.max(m, r.team1Hp), 0);
      const initMax2 = result.rounds.reduce((m, r) => Math.max(m, r.team2Hp), 0);
      team1HpPct = Math.max(0, (last.team1Hp / initMax1) * 100);
      team2HpPct = Math.max(0, (last.team2Hp / initMax2) * 100);
    }
  }

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes clashPulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.6); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes clashBurst {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes sparkFade {
          0% { opacity: 1; transform: rotate(var(--r)) translateY(-20px) scaleY(1); }
          100% { opacity: 0; transform: rotate(var(--r)) translateY(-50px) scaleY(0.3); }
        }
        @keyframes hitShake {
          0% { transform: rotate(var(--rot,0deg)) translateX(0); }
          20% { transform: rotate(var(--rot,0deg)) translateX(-6px); }
          40% { transform: rotate(var(--rot,0deg)) translateX(6px); }
          60% { transform: rotate(var(--rot,0deg)) translateX(-4px); }
          80% { transform: rotate(var(--rot,0deg)) translateX(4px); }
          100% { transform: rotate(var(--rot,0deg)) translateX(0); }
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300">
        {/* Fight Banner with portraits */}
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
            winner={isFinished ? result?.winner : undefined}
          />

          {/* HP Bars */}
          <div className="grid grid-cols-2 bg-card/90">
            <div>
              <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
                <span className="font-display text-xs uppercase tracking-widest text-team1">Team 1</span>
                <span className="text-[9px] text-muted-foreground truncate ml-2 max-w-[100px] text-right">
                  {team1Names.join(", ")}
                </span>
              </div>
              <HpBar pct={team1HpPct} team={1} />
            </div>
            <div>
              <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
                <span className="text-[9px] text-muted-foreground truncate mr-2 max-w-[100px]">
                  {team2Names.join(", ")}
                </span>
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
                  <div className="mt-2 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                </div>

                {result.rounds.slice(0, visibleCount).map((round, idx) => (
                  <RoundBlock
                    key={idx}
                    round={round}
                    index={idx}
                    onDone={() => handleRoundDone(idx)}
                  />
                ))}

                {isFinished && (
                  <div className="pt-6 pb-4 animate-in fade-in duration-700">
                    <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-8" />
                    <div className="text-center space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
                        After {result.rounds.length} rounds
                      </p>
                      <h2 className={`font-display text-5xl uppercase tracking-widest
                        ${result.winner === 1 ? "text-team1" : "text-team2"}`}>
                        Team {result.winner}
                      </h2>
                      <p className="font-display text-2xl uppercase tracking-wider text-foreground">
                        Victorious
                      </p>
                      <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent my-4" />
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto italic">
                        {result.summary}
                      </p>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} className="h-4" />
              </>
            ) : !isSimulating ? null : (
              <div className="flex flex-col items-center justify-center h-48 gap-4">
                <p className="font-display text-sm uppercase tracking-widest text-muted-foreground animate-pulse">
                  Calculating outcomes...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex-shrink-0 border-t border-border/30 bg-card/80 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Arena
          </button>

          {result && !isFinished && !isSimulating && (
            <button
              onClick={() => {
                setVisibleCount(result.rounds.length);
                setTimeout(() => setIsFinished(true), 300);
                setTimeout(() => setShowVictory(true), 1000);
              }}
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Skip
            </button>
          )}

          {isFinished && !showVictory && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 font-display text-base uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
            >
              <Swords className="h-4 w-4" />
              Fight Again
            </button>
          )}
        </div>

        {/* Victory overlay */}
        {showVictory && result && (
          <VictoryScreen result={result} onClose={onClose} />
        )}
      </div>
    </>
  );
}
