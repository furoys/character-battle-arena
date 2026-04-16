import { useState } from "react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { Badge } from "@/components/ui/badge";
import { X, Zap, Shield, Brain, Heart, Swords } from "lucide-react";
import { AvaLogo } from "@/components/ava-logo";

interface RosterFlipCardProps {
  character: Character;
  onDelete?: () => void;
}

function StatBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const getBarColor = (v: number) => {
    if (v >= 90) return "bg-primary";
    if (v >= 70) return "bg-secondary";
    if (v >= 50) return "bg-yellow-500";
    return "bg-muted-foreground";
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />
      <span className="text-[10px] font-bold text-muted-foreground w-6">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-none overflow-hidden">
        <div className={`h-full ${getBarColor(value)}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-bold w-5 text-right">{value}</span>
    </div>
  );
}

export function RosterFlipCard({ character, onDelete }: RosterFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const initials = character.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="roster-flip-wrapper"
      onClick={() => setFlipped(f => !f)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`roster-flip-inner ${flipped ? "is-flipped" : ""}`}>

        {/* ── FRONT ── */}
        <div className="roster-flip-face roster-flip-front border-2 border-border bg-card overflow-hidden">
          {/* Delete button */}
          {onDelete && (
            <button
              className="absolute top-2 left-2 w-7 h-7 bg-black/60 border border-destructive/40 transition-opacity flex items-center justify-center hover:bg-destructive z-20"
              style={{ opacity: hovered && !flipped ? 1 : 0, pointerEvents: hovered && !flipped ? "auto" : "none" }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <X className="h-3.5 w-3.5 text-destructive-foreground" />
            </button>
          )}

          {/* Portrait */}
          <div className="relative h-48 w-full overflow-hidden flex-shrink-0">
            {character.imageUrl && !imgError ? (
              <>
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  onError={() => setImgError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-primary/20 to-primary/5">
                <span className="font-display text-7xl font-bold opacity-40 select-none">{initials}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="px-3 pt-2 pb-3 flex flex-col gap-2">
            <Badge variant="outline" className="rounded-none border-primary text-primary font-bold uppercase tracking-wider text-[9px] w-fit">
              {character.universe}
            </Badge>
            <h3 className="font-display text-xl leading-none uppercase truncate">{character.name}</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
              <StatBar label="STR" value={character.strength} icon={Swords} color="text-team2" />
              <StatBar label="SPD" value={character.speed} icon={Zap} color="text-team1" />
              <StatBar label="INT" value={character.intelligence} icon={Brain} color="text-secondary" />
              <StatBar label="DUR" value={character.durability} icon={Shield} color="text-yellow-500" />
            </div>
            <p className="text-[10px] text-primary font-medium line-clamp-1 pt-0.5">{character.specialAbility}</p>
            <p className="text-[9px] text-muted-foreground text-center mt-1 uppercase tracking-widest">Tap to flip</p>
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="roster-flip-face roster-flip-back border-2 border-primary/40 bg-card overflow-hidden flex flex-col">
          {/* A.v.A Logo Header */}
          <div className="flex items-center justify-center py-2 border-b border-primary/20 bg-primary/5 flex-shrink-0">
            <AvaLogo className="h-9 w-auto" />
          </div>

          {/* Small portrait + name */}
          <div className="flex items-center gap-2.5 px-3 py-2 border-b border-border/30 flex-shrink-0">
            <div className="w-10 h-10 flex-shrink-0 overflow-hidden border border-primary/30">
              {character.imageUrl && !imgError ? (
                <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover object-top" onError={() => setImgError(true)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="font-display text-sm text-primary">{initials}</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg leading-none uppercase truncate">{character.name}</h3>
              <Badge variant="outline" className="rounded-none border-primary/60 text-primary font-bold uppercase tracking-wider text-[8px] mt-0.5">
                {character.universe}
              </Badge>
            </div>
          </div>

          {/* Scrollable bio */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 text-xs">
            {/* Description */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Bio</p>
              <p className="text-foreground/80 leading-relaxed text-[11px]">{character.description}</p>
            </div>

            {/* Special */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Signature Ability</p>
              <p className="text-primary text-[11px] leading-relaxed">{character.specialAbility}</p>
            </div>

            {/* Weaknesses */}
            {character.weaknesses && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Weaknesses</p>
                <p className="text-destructive/80 text-[11px] leading-relaxed">{character.weaknesses}</p>
              </div>
            )}

            {/* Stats row */}
            <div className="pt-1 border-t border-border/30">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <StatBar label="STR" value={character.strength} icon={Swords} color="text-team2" />
                <StatBar label="SPD" value={character.speed} icon={Zap} color="text-team1" />
                <StatBar label="INT" value={character.intelligence} icon={Brain} color="text-secondary" />
                <StatBar label="DUR" value={character.durability} icon={Shield} color="text-yellow-500" />
              </div>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground text-center py-1.5 flex-shrink-0 border-t border-border/20 uppercase tracking-widest">Tap to flip back</p>
        </div>
      </div>
    </div>
  );
}
