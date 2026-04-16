import { useState } from "react";
import { useListCharacters, useSimulateFight } from "@workspace/api-client-react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { CharacterCard } from "@/components/character-card";
import { useToast } from "@/hooks/use-toast";
import { FightScreen } from "@/components/fight-screen";
import { AvaLogo } from "@/components/ava-logo";
import { Swords, X } from "lucide-react";

function TeamPortrait({ character, team, onRemove }: { character: Character; team: 1 | 2; onRemove: () => void }) {
  const colorClass = team === 1 ? "border-team1 bg-team1/10" : "border-team2 bg-team2/10";
  const initials = character.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={`relative w-12 h-14 border-2 ${colorClass} overflow-hidden flex-shrink-0`}>
      {character.imageUrl ? (
        <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover object-top" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-display font-bold text-sm text-primary">
          {initials}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 flex items-center justify-center hover:bg-destructive transition-colors"
      >
        <X className="w-2.5 h-2.5 text-white" />
      </button>
    </div>
  );
}

function TeamSlot({ team, members, active, onActivate, onRemove }: {
  team: 1 | 2;
  members: Character[];
  active: boolean;
  onActivate: () => void;
  onRemove: (id: number) => void;
}) {
  const teamColor = team === 1 ? "team1" : "team2";
  const glowColor = team === 1 ? "rgba(0,240,255,0.3)" : "rgba(255,59,48,0.3)";
  const borderColor = team === 1 ? "border-team1" : "border-team2";
  const textColor = team === 1 ? "text-team1" : "text-team2";
  const bgColor = team === 1 ? "bg-team1/10" : "bg-team2/10";

  return (
    <div
      className={`flex-1 flex flex-col gap-2 p-3 border-2 cursor-pointer transition-all duration-200
        ${active ? `${borderColor} ${bgColor}` : "border-border/50 hover:border-border"}
      `}
      style={active ? { boxShadow: `0 0 20px ${glowColor}` } : {}}
      onClick={onActivate}
    >
      <div className="flex items-center justify-between">
        <span className={`font-display text-lg uppercase tracking-widest ${active ? textColor : "text-muted-foreground"}`}>
          Team {team}
        </span>
        <span className={`text-xs font-bold px-1.5 py-0.5 ${active ? `bg-${teamColor}/20 ${textColor}` : "bg-border/20 text-muted-foreground"}`}>
          {members.length}/5
        </span>
      </div>
      <div className="flex gap-1.5 min-h-[56px] items-start flex-wrap">
        {members.map(c => (
          <TeamPortrait key={c.id} character={c} team={team} onRemove={() => onRemove(c.id)} />
        ))}
        {members.length === 0 && (
          <div className="w-12 h-14 border-2 border-dashed border-border/40 flex items-center justify-center">
            <span className="text-muted-foreground/30 text-xs font-display">+</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Home() {
  const { data: characters, isLoading } = useListCharacters();
  const { toast } = useToast();
  const [team1, setTeam1] = useState<Character[]>([]);
  const [team2, setTeam2] = useState<Character[]>([]);
  const [activeTeam, setActiveTeam] = useState<1 | 2>(1);
  const [showModal, setShowModal] = useState(false);

  const simulateFight = useSimulateFight({
    mutation: {
      onError: (error) => {
        toast({ title: "Simulation Failed", description: error.error || "Unknown error", variant: "destructive" });
        setShowModal(false);
      },
    },
  });

  const handleCharacterClick = (character: Character) => {
    const inTeam1 = team1.some(c => c.id === character.id);
    const inTeam2 = team2.some(c => c.id === character.id);

    if (inTeam1) { setTeam1(t => t.filter(c => c.id !== character.id)); return; }
    if (inTeam2) { setTeam2(t => t.filter(c => c.id !== character.id)); return; }

    if (activeTeam === 1) {
      if (team1.length >= 5) { toast({ title: "Team Full", description: "Max 5 per team", variant: "destructive" }); return; }
      setTeam1(t => [...t, character]);
    } else {
      if (team2.length >= 5) { toast({ title: "Team Full", description: "Max 5 per team", variant: "destructive" }); return; }
      setTeam2(t => [...t, character]);
    }
  };

  const handleFight = () => {
    if (team1.length === 0 || team2.length === 0) {
      toast({ title: "Teams Required", description: "Both teams need at least 1 fighter", variant: "destructive" });
      return;
    }
    setShowModal(true);
    simulateFight.mutate({ data: { team1: team1.map(c => c.id), team2: team2.map(c => c.id) } });
  };

  const getCharacterTeam = (id: number) => {
    if (team1.some(c => c.id === id)) return 1 as const;
    if (team2.some(c => c.id === id)) return 2 as const;
    return null;
  };

  const canFight = team1.length > 0 && team2.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Game HUD - Team selector */}
      <div className="flex-shrink-0 bg-card/95 border-b-2 border-primary/30 backdrop-blur sticky top-0 z-30">
        {/* Title bar */}
        <div className="flex items-center justify-center py-1 border-b border-border/30">
          <AvaLogo className="h-10 w-auto" />
        </div>

        {/* Teams + Fight */}
        <div className="flex items-stretch gap-0 p-2 gap-2 relative">
          <TeamSlot
            team={1}
            members={team1}
            active={activeTeam === 1}
            onActivate={() => setActiveTeam(1)}
            onRemove={(id) => setTeam1(t => t.filter(c => c.id !== id))}
          />

          {/* Center fight button */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <button
              className={`flex flex-col items-center justify-center w-16 h-full min-h-[96px] font-display text-xs uppercase tracking-widest border-2 transition-all duration-200
                ${canFight
                  ? "border-primary bg-primary/10 text-primary hover:bg-primary hover:text-background cursor-pointer shadow-[0_0_20px_rgba(255,0,85,0.4)] hover:shadow-[0_0_30px_rgba(255,0,85,0.7)]"
                  : "border-border/30 text-muted-foreground/30 cursor-not-allowed"
                }`}
              onClick={handleFight}
              disabled={!canFight || simulateFight.isPending}
            >
              <Swords className="h-6 w-6 mb-1" />
              <span className="text-[10px] leading-tight text-center">
                {simulateFight.isPending ? "..." : "FIGHT"}
              </span>
            </button>
          </div>

          <TeamSlot
            team={2}
            members={team2}
            active={activeTeam === 2}
            onActivate={() => setActiveTeam(2)}
            onRemove={(id) => setTeam2(t => t.filter(c => c.id !== id))}
          />
        </div>

        {/* Picking indicator */}
        <div className={`text-center py-1 text-[10px] font-bold uppercase tracking-widest
          ${activeTeam === 1 ? "text-team1 bg-team1/5" : "text-team2 bg-team2/5"}`}>
          Picking for Team {activeTeam} — tap a fighter below
        </div>
      </div>

      {/* Character Select Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-display text-2xl uppercase animate-pulse text-muted-foreground">Loading Roster...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {characters?.map(character => (
              <CharacterCard
                key={character.id}
                character={character}
                selectedTeam={getCharacterTeam(character.id)}
                onClick={() => handleCharacterClick(character)}
                disabled={
                  (activeTeam === 1 && team1.length >= 5 && getCharacterTeam(character.id) === null) ||
                  (activeTeam === 2 && team2.length >= 5 && getCharacterTeam(character.id) === null)
                }
              />
            ))}
          </div>
          {characters?.length === 0 && (
            <div className="text-center p-16">
              <p className="font-display text-xl text-muted-foreground uppercase">No fighters. Add some first.</p>
            </div>
          )}
        </div>
      )}

      <FightScreen
        open={showModal}
        onClose={() => setShowModal(false)}
        result={simulateFight.data || null}
        isSimulating={simulateFight.isPending}
        team1Names={team1.map(c => c.name)}
        team2Names={team2.map(c => c.name)}
      />
    </div>
  );
}
