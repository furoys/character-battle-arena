import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FightResult, FightRound, Character } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy } from "lucide-react";

interface FightResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: FightResult | null;
  isSimulating: boolean;
}

function TeamPortraitStrip({ characters, team }: { characters: Character[]; team: 1 | 2 }) {
  return (
    <div className={`flex gap-1 ${team === 2 ? "flex-row-reverse" : ""}`}>
      {characters.map((c) => (
        <div key={c.id} className="relative w-10 h-10 overflow-hidden border border-border flex-shrink-0">
          {c.imageUrl ? (
            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center font-display font-bold text-xs
              ${team === 1 ? "bg-team1/20 text-team1" : "bg-team2/20 text-team2"}`}
            >
              {c.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-0 left-0 right-0 text-[7px] font-bold text-white text-center leading-tight px-0.5 truncate">
            {c.name.split(" ")[0]}
          </p>
        </div>
      ))}
    </div>
  );
}

export function FightResultModal({ open, onOpenChange, result, isSimulating }: FightResultModalProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(-1);
  const [displayedRounds, setDisplayedRounds] = useState<FightRound[]>([]);

  useEffect(() => {
    if (open && result && !isSimulating) {
      setCurrentRoundIndex(0);
      setDisplayedRounds([]);
    } else if (!open) {
      setCurrentRoundIndex(-1);
      setDisplayedRounds([]);
    }
  }, [open, result, isSimulating]);

  useEffect(() => {
    if (result && currentRoundIndex >= 0 && currentRoundIndex < result.rounds.length) {
      const timer = setTimeout(() => {
        setDisplayedRounds((prev) => [...prev, result.rounds[currentRoundIndex]]);
        setCurrentRoundIndex((prev) => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentRoundIndex, result]);

  const isFinished = result && currentRoundIndex === result.rounds.length;

  let team1HpPct = 100;
  let team2HpPct = 100;

  if (result) {
    if (displayedRounds.length > 0) {
      const lastRound = displayedRounds[displayedRounds.length - 1];
      const maxHp1 = result.rounds[0]?.team1Hp || 100;
      const maxHp2 = result.rounds[0]?.team2Hp || 100;
      team1HpPct = Math.max(0, Math.min(100, (lastRound.team1Hp / maxHp1) * 100));
      team2HpPct = Math.max(0, Math.min(100, (lastRound.team2Hp / maxHp2) * 100));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 flex flex-col bg-background border-primary gap-0">
        <DialogHeader className="p-4 border-b border-border bg-card/50 flex-shrink-0">
          <DialogTitle className="font-display text-2xl uppercase tracking-widest text-center text-primary glitch-text">
            {isSimulating ? "Simulating Fight..." : "Fight Result"}
          </DialogTitle>
        </DialogHeader>

        {isSimulating ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-32 h-32 border-4 border-primary rounded-full border-t-transparent animate-spin mb-8" />
            <h2 className="font-display text-4xl uppercase animate-pulse">Calculating Outcomes...</h2>
          </div>
        ) : result ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Health Bars + Portraits */}
            <div className="p-4 bg-card/80 border-b border-border flex-shrink-0">
              <div className="grid grid-cols-2 gap-4">
                {/* Team 1 */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TeamPortraitStrip characters={result.team1} team={1} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between font-display text-sm mb-1 uppercase">
                        <span className="text-team1">Team 1</span>
                        <span>{Math.round(team1HpPct)}%</span>
                      </div>
                      <div className="health-bar-container">
                        <div className="health-bar-fill team1-fill" style={{ width: `${team1HpPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Team 2 */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between font-display text-sm mb-1 uppercase">
                        <span>{Math.round(team2HpPct)}%</span>
                        <span className="text-team2">Team 2</span>
                      </div>
                      <div className="health-bar-container">
                        <div className="health-bar-fill team2-fill" style={{ width: `${team2HpPct}%` }} />
                      </div>
                    </div>
                    <TeamPortraitStrip characters={result.team2} team={2} />
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative Scroll */}
            <ScrollArea className="flex-1 p-4 md:p-8">
              <div className="space-y-6 max-w-3xl mx-auto">
                {displayedRounds.map((round, idx) => {
                  const attackerChar =
                    [...result.team1, ...result.team2].find((c) => c.name === round.attacker) ?? null;
                  return (
                    <div
                      key={idx}
                      className={`p-4 border-l-4 bg-card/30 animate-in fade-in slide-in-from-bottom-4 duration-500
                        ${idx % 2 === 0 ? "border-team1 ml-0 mr-12" : "border-team2 ml-12 mr-0"}
                      `}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {attackerChar?.imageUrl && (
                          <div className="w-8 h-8 overflow-hidden border border-border flex-shrink-0">
                            <img
                              src={attackerChar.imageUrl}
                              alt={attackerChar.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span className="bg-primary/20 text-primary px-2 py-0.5">Round {round.round}</span>
                          <span>{round.attackType} Attack</span>
                        </div>
                      </div>
                      <p className="text-lg md:text-xl font-medium leading-relaxed">
                        <span className="font-bold text-primary">{round.attacker}</span>
                        {" strikes "}
                        <span className="font-bold text-secondary">{round.defender}</span>
                      </p>
                      <p className="mt-2 text-muted-foreground">{round.narrative}</p>
                    </div>
                  );
                })}

                {isFinished && (
                  <div className="mt-12 p-8 text-center animate-in zoom-in duration-1000 border-4 border-primary bg-primary/10 shadow-[0_0_30px_rgba(255,0,85,0.2)]">
                    {/* Winner portraits */}
                    <div className="flex justify-center gap-2 mb-6">
                      {(result.winner === 1 ? result.team1 : result.team2).map((c) =>
                        c.imageUrl ? (
                          <div key={c.id} className="relative w-16 h-20 overflow-hidden border-2 border-primary">
                            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <p className="absolute bottom-0 left-0 right-0 text-[8px] font-bold text-white text-center truncate px-0.5">
                              {c.name}
                            </p>
                          </div>
                        ) : null,
                      )}
                    </div>
                    <Trophy className="w-16 h-16 mx-auto text-primary mb-4 animate-bounce" />
                    <h2 className="font-display text-5xl md:text-7xl uppercase mb-4 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                      Team {result.winner} Wins!
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{result.summary}</p>
                  </div>
                )}

                <div className="h-8" />
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 bg-card/80 border-t border-border flex justify-center flex-shrink-0">
              <Button
                size="lg"
                variant={isFinished ? "default" : "outline"}
                className="font-display text-xl px-12 py-6 rounded-none uppercase"
                onClick={() => (isFinished ? onOpenChange(false) : setCurrentRoundIndex(result.rounds.length))}
              >
                {isFinished ? "Close" : "Skip Animation"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
