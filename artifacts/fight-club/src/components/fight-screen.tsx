import { useState, useEffect, useRef } from "react";
import { FightResult, FightRound } from "@workspace/api-client-react/src/generated/api.schemas";
import { ChevronLeft, Swords } from "lucide-react";
import { VictoryScreen } from "@/components/victory-screen";

interface FightScreenProps {
  open: boolean;
  onClose: () => void;
  result: FightResult | null;
  isSimulating: boolean;
  team1Names: string[];
  team2Names: string[];
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

function RoundBlock({ round, index, onDone }: { round: FightRound; index: number; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => { setTextVisible(true); onDone(); }, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const isTeam1 = index % 2 === 0;

  return (
    <div
      className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className={`flex items-start gap-3 ${isTeam1 ? "" : "flex-row-reverse"}`}>
        {/* Round label */}
        <div className="flex-shrink-0 mt-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 block text-center
            ${isTeam1 ? "bg-team1/20 text-team1" : "bg-team2/20 text-team2"}`}>
            R{round.round}
          </span>
        </div>

        {/* Narrative block */}
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

export function FightScreen({ open, onClose, result, isSimulating, team1Names, team2Names }: FightScreenProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && result && !isSimulating) {
      setVisibleCount(0);
      setIsFinished(false);
      setShowVictory(false);
      setTimeout(() => setVisibleCount(1), 400);
    }
    if (!open) {
      setVisibleCount(0);
      setIsFinished(false);
      setShowVictory(false);
    }
  }, [open, result, isSimulating]);

  const handleRoundDone = (idx: number) => {
    if (!result) return;
    if (idx + 1 < result.rounds.length) {
      setTimeout(() => setVisibleCount(idx + 2), 1200);
    } else {
      setTimeout(() => setIsFinished(true), 900);
      setTimeout(() => setShowVictory(true), 2200);
    }
  };

  useEffect(() => {
    if (visibleCount > 0 || isFinished) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [visibleCount, isFinished]);

  let team1HpPct = 100;
  let team2HpPct = 100;
  if (result && result.rounds.length > 0) {
    const maxHp1 = result.rounds[0].team1Hp;
    const maxHp2 = result.rounds[0].team2Hp;
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-border/30 bg-card/80 backdrop-blur">
        {/* HP Bars */}
        <div className="grid grid-cols-2">
          <div>
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <span className="font-display text-xs uppercase tracking-widest text-team1">Team 1</span>
              <span className="text-[10px] text-muted-foreground truncate ml-2 max-w-[120px] text-right">
                {team1Names.join(", ")}
              </span>
            </div>
            <HpBar pct={team1HpPct} team={1} />
          </div>
          <div>
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <span className="text-[10px] text-muted-foreground truncate mr-2 max-w-[120px]">
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
          {isSimulating ? (
            <div className="flex flex-col items-center justify-center h-64 gap-6">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="font-display text-sm uppercase tracking-widest text-muted-foreground animate-pulse">
                Calculating outcomes...
              </p>
            </div>
          ) : result ? (
            <>
              {/* Opening line */}
              <div className="text-center py-4">
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
          ) : null}
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
  );
}
