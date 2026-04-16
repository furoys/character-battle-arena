import { useState } from "react";
import { useListCharacters, useSimulateFight } from "@workspace/api-client-react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { CharacterCard } from "@/components/character-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FightResultModal } from "@/components/fight-result-modal";
import { Swords } from "lucide-react";

export function Home() {
  const { data: characters, isLoading } = useListCharacters();
  const { toast } = useToast();
  
  const [team1, setTeam1] = useState<Character[]>([]);
  const [team2, setTeam2] = useState<Character[]>([]);
  const [activeTeam, setActiveTeam] = useState<1 | 2>(1);
  const [showModal, setShowModal] = useState(false);

  const simulateFight = useSimulateFight({
    mutation: {
      onSuccess: (data) => {
        // Modal will handle displaying the result
      },
      onError: (error) => {
        toast({
          title: "Simulation Failed",
          description: error.error || "An unknown error occurred",
          variant: "destructive"
        });
        setShowModal(false);
      }
    }
  });

  const handleCharacterClick = (character: Character) => {
    // Check if character is already in either team
    const inTeam1 = team1.some(c => c.id === character.id);
    const inTeam2 = team2.some(c => c.id === character.id);

    if (inTeam1) {
      setTeam1(team1.filter(c => c.id !== character.id));
      return;
    }
    if (inTeam2) {
      setTeam2(team2.filter(c => c.id !== character.id));
      return;
    }

    // Add to active team if not full
    if (activeTeam === 1) {
      if (team1.length >= 5) {
        toast({ title: "Team Full", description: "Maximum 5 characters per team", variant: "destructive" });
        return;
      }
      setTeam1([...team1, character]);
    } else {
      if (team2.length >= 5) {
        toast({ title: "Team Full", description: "Maximum 5 characters per team", variant: "destructive" });
        return;
      }
      setTeam2([...team2, character]);
    }
  };

  const handleFight = () => {
    if (team1.length === 0 || team2.length === 0) {
      toast({ title: "Teams Required", description: "Both teams must have at least 1 character", variant: "destructive" });
      return;
    }

    setShowModal(true);
    simulateFight.mutate({
      data: {
        team1: team1.map(c => c.id),
        team2: team2.map(c => c.id)
      }
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center font-display text-2xl animate-pulse">Loading Roster...</div>;
  }

  const getCharacterTeam = (id: number) => {
    if (team1.some(c => c.id === id)) return 1;
    if (team2.some(c => c.id === id)) return 2;
    return null;
  };

  return (
    <div className="flex flex-col gap-8 pb-32">
      {/* Team Builder Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 bg-card border-2 border-border p-4 sticky top-16 z-40 shadow-xl">
        {/* Team 1 Selector */}
        <div 
          className={`p-4 border-2 transition-all cursor-pointer ${activeTeam === 1 ? 'border-team1 bg-team1/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'border-transparent hover:border-team1/50'}`}
          onClick={() => setActiveTeam(1)}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-2xl text-team1 uppercase">Team 1</h2>
            <span className="text-sm font-bold bg-team1/20 text-team1 px-2 py-1">{team1.length}/5</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {team1.map(c => (
              <div key={c.id} className="bg-team1/20 border border-team1 px-3 py-1 text-sm font-bold uppercase truncate max-w-[120px]">
                {c.name}
              </div>
            ))}
            {team1.length === 0 && <div className="text-muted-foreground text-sm uppercase">Select characters</div>}
          </div>
        </div>

        {/* Team 2 Selector */}
        <div 
          className={`p-4 border-2 transition-all cursor-pointer ${activeTeam === 2 ? 'border-team2 bg-team2/10 shadow-[0_0_15px_rgba(255,59,48,0.2)]' : 'border-transparent hover:border-team2/50'}`}
          onClick={() => setActiveTeam(2)}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-2xl text-team2 uppercase">Team 2</h2>
            <span className="text-sm font-bold bg-team2/20 text-team2 px-2 py-1">{team2.length}/5</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {team2.map(c => (
              <div key={c.id} className="bg-team2/20 border border-team2 px-3 py-1 text-sm font-bold uppercase truncate max-w-[120px]">
                {c.name}
              </div>
            ))}
            {team2.length === 0 && <div className="text-muted-foreground text-sm uppercase">Select characters</div>}
          </div>
        </div>

        {/* Fight Button Container - positioned absolutely in center on desktop */}
        <div className="md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex justify-center z-10">
          <Button 
            size="lg"
            className="font-display text-3xl uppercase tracking-widest h-auto py-4 px-12 rounded-none shadow-[4px_4px_0_0_hsl(var(--primary))] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_0_hsl(var(--primary))] transition-all disabled:opacity-50"
            disabled={team1.length === 0 || team2.length === 0 || simulateFight.isPending}
            onClick={handleFight}
          >
            <Swords className="mr-2 h-8 w-8" />
            Fight!
          </Button>
        </div>
      </div>

      {/* Roster Grid */}
      <div>
        <h3 className="font-display text-2xl mb-6 uppercase tracking-wider text-muted-foreground">Select Fighters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {characters?.map(character => (
            <CharacterCard 
              key={character.id} 
              character={character} 
              selectedTeam={getCharacterTeam(character.id)}
              onClick={() => handleCharacterClick(character)}
              disabled={(activeTeam === 1 && team1.length >= 5 && getCharacterTeam(character.id) === null) || 
                        (activeTeam === 2 && team2.length >= 5 && getCharacterTeam(character.id) === null)}
            />
          ))}
        </div>
        {characters?.length === 0 && (
          <div className="text-center p-12 bg-card border border-border">
            <p className="text-xl text-muted-foreground font-display uppercase">No fighters in roster.</p>
            <Button variant="outline" className="mt-4 rounded-none font-display uppercase text-lg" onClick={() => window.location.href = '/new-character'}>
              Add Character
            </Button>
          </div>
        )}
      </div>

      {/* Result Modal */}
      <FightResultModal 
        open={showModal} 
        onOpenChange={setShowModal}
        result={simulateFight.data || null}
        isSimulating={simulateFight.isPending}
      />
    </div>
  );
}
