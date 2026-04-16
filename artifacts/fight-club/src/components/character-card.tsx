import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CharacterCardProps {
  character: Character;
  selectedTeam?: 1 | 2 | null;
  onClick?: () => void;
  disabled?: boolean;
}

export function CharacterCard({ character, selectedTeam, onClick, disabled }: CharacterCardProps) {
  const isSelected = selectedTeam !== null && selectedTeam !== undefined;
  
  return (
    <Card 
      className={`
        relative overflow-hidden cursor-pointer transition-all duration-200 rounded-none border-2
        hover:-translate-y-1 hover:shadow-md
        ${disabled && !isSelected ? 'opacity-50 grayscale cursor-not-allowed' : ''}
        ${selectedTeam === 1 ? 'border-team1 shadow-[0_0_15px_rgba(0,240,255,0.3)] bg-team1/5' : ''}
        ${selectedTeam === 2 ? 'border-team2 shadow-[0_0_15px_rgba(255,59,48,0.3)] bg-team2/5' : ''}
        ${!isSelected ? 'border-border bg-card' : ''}
      `}
      onClick={disabled && !isSelected ? undefined : onClick}
    >
      {isSelected && (
        <div className={`absolute top-0 right-0 px-3 py-1 font-display text-xl font-bold text-white
          ${selectedTeam === 1 ? 'bg-team1' : 'bg-team2'}
        `}>
          TEAM {selectedTeam}
        </div>
      )}

      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex justify-between items-start mb-1">
          <Badge variant="outline" className="rounded-none border-primary text-primary font-bold uppercase tracking-wider text-xs">
            {character.universe}
          </Badge>
        </div>
        <h3 className="font-display text-3xl leading-none uppercase truncate">{character.name}</h3>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <StatBar label="STR" value={character.strength} />
          <StatBar label="SPD" value={character.speed} />
          <StatBar label="INT" value={character.intelligence} />
          <StatBar label="DUR" value={character.durability} />
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase">Special</p>
          <p className="text-sm font-medium text-primary line-clamp-1">{character.specialAbility}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  // Color based on value
  const getColor = (v: number) => {
    if (v >= 90) return 'bg-primary';
    if (v >= 70) return 'bg-secondary';
    if (v >= 50) return 'bg-yellow-500';
    return 'bg-muted-foreground';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
        <span className="text-[10px] font-bold text-foreground">{value}</span>
      </div>
      <div className="stat-bar-container">
        <div 
          className={`stat-bar-fill ${getColor(value)}`} 
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  );
}
