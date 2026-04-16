import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FightResult, FightRound } from "@workspace/api-client-react/src/generated/api.schemas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy } from "lucide-react";

interface FightResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: FightResult | null;
  isSimulating: boolean;
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
        setDisplayedRounds(prev => [...prev, result.rounds[currentRoundIndex]]);
        setCurrentRoundIndex(prev => prev + 1);
      }, 1500); // 1.5s per round for dramatic effect
      return () => clearTimeout(timer);
    }
  }, [currentRoundIndex, result]);

  const isFinished = result && currentRoundIndex === result.rounds.length;
  
  // Calculate current HP percentages for the bars
  let team1HpPct = 100;
  let team2HpPct = 100;
  
  if (result) {
    if (displayedRounds.length > 0) {
      const lastRound = displayedRounds[displayedRounds.length - 1];
      // Assuming max HP is 100 per team, but API might use different scale. Let's just use the raw value if it's 0-100 or calculate relative to initial.
      // The API doesn't provide max HP in the result schema, assuming 100 per character? 
      // If team has 5 characters, max could be 500. Let's find max HP from round 1 (or we can just use the provided team1Hp / max of first round).
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
            {/* Health Bars */}
            <div className="p-4 bg-card/80 border-b border-border grid grid-cols-2 gap-4 flex-shrink-0">
              <div>
                <div className="flex justify-between font-display text-lg mb-1 uppercase">
                  <span className="text-team1">Team 1</span>
                  <span>{Math.round(team1HpPct)}%</span>
                </div>
                <div className="health-bar-container">
                  <div className="health-bar-fill team1-fill" style={{ width: `${team1HpPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-display text-lg mb-1 uppercase">
                  <span>{Math.round(team2HpPct)}%</span>
                  <span className="text-team2">Team 2</span>
                </div>
                <div className="health-bar-container flex justify-end">
                  <div className="health-bar-fill team2-fill" style={{ width: `${team2HpPct}%` }} />
                </div>
              </div>
            </div>

            {/* Narrative Scroll */}
            <ScrollArea className="flex-1 p-4 md:p-8">
              <div className="space-y-6 max-w-3xl mx-auto">
                {displayedRounds.map((round, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 border-l-4 bg-card/30 animate-in fade-in slide-in-from-bottom-4 duration-500
                      ${idx % 2 === 0 ? 'border-team1 ml-0 mr-12' : 'border-team2 ml-12 mr-0'}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <span className="bg-primary/20 text-primary px-2 py-0.5">Round {round.round}</span>
                      <span>{round.attackType} Attack</span>
                    </div>
                    <p className="text-lg md:text-xl font-medium leading-relaxed">
                      <span className="font-bold text-primary">{round.attacker}</span>
                      {" strikes "}
                      <span className="font-bold text-secondary">{round.defender}</span>
                    </p>
                    <p className="mt-2 text-muted-foreground">{round.narrative}</p>
                  </div>
                ))}

                {isFinished && (
                  <div className="mt-12 p-8 text-center animate-in zoom-in duration-1000 border-4 border-primary bg-primary/10 shadow-[0_0_30px_rgba(255,0,85,0.2)]">
                    <Trophy className="w-20 h-20 mx-auto text-primary mb-4 animate-bounce" />
                    <h2 className="font-display text-5xl md:text-7xl uppercase mb-4 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                      Team {result.winner} Wins!
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                      {result.summary}
                    </p>
                  </div>
                )}
                
                {/* Dummy div to scroll to bottom */}
                <div className="h-8" />
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 bg-card/80 border-t border-border flex justify-center flex-shrink-0">
              <Button 
                size="lg" 
                variant={isFinished ? "default" : "outline"}
                className="font-display text-xl px-12 py-6 rounded-none uppercase"
                onClick={() => isFinished ? onOpenChange(false) : setCurrentRoundIndex(result.rounds.length)}
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
