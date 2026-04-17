import { useState } from "react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { Badge } from "@/components/ui/badge";
import { X, Zap, Shield, Brain, Swords } from "lucide-react";
import { AvaLogo } from "@/components/ava-logo";

interface RosterFlipCardProps {
  character: Character;
  onDelete?: () => void;
}

const formatStatNum = (v: number) => v >= 1000 ? `${Math.round(v / 100) / 10}K` : String(v);

const TAG_COLORS: Record<string, string> = {
  "aggressive":      "#ff3b30",
  "arrogant":        "#ff9f0a",
  "tactical":        "#00f0ff",
  "sadistic":        "#ff0055",
  "defensive":       "#30d158",
  "long-range":      "#64d2ff",
  "close-quarters":  "#ff6b30",
  "reality-warper":  "#bf5af2",
  "regen":           "#30d158",
  "speedster":       "#ffe234",
  "stealth":         "#8e8e93",
};

export function powerAvg(c: Character) {
  return Math.round((c.strength + c.speed + c.intelligence + c.durability) / 4);
}

export function powerTier(avg: number): { label: string; color: string; bg: string } {
  if (avg >= 8000) return { label: "COSMIC", color: "#ff0055", bg: "rgba(255,0,85,0.15)" };
  if (avg >= 6000) return { label: "ELITE",  color: "#c084fc", bg: "rgba(192,132,252,0.15)" };
  if (avg >= 4000) return { label: "STANDARD", color: "#00f0ff", bg: "rgba(0,240,255,0.10)" };
  return               { label: "STREET",  color: "#94a3b8", bg: "rgba(148,163,184,0.10)" };
}

function StatBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const pct = value / 100;
  const barColor = value >= 9000 ? "#ff0055" : value >= 6000 ? "#c084fc" : value >= 4000 ? "#00f0ff" : "#94a3b8";

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />
      <span className="text-[10px] font-bold text-muted-foreground w-6">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-none overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <span className="text-[10px] font-bold w-10 text-right tabular-nums">{formatStatNum(value)}</span>
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

  const avg = powerAvg(character);
  const tier = powerTier(avg);

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
            {/* Power tier pill — sits over image bottom-right */}
            <div
              className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest border"
              style={{ color: tier.color, background: tier.bg, borderColor: `${tier.color}40` }}
            >
              {tier.label}
            </div>
          </div>

          {/* Info */}
          <div className="px-3 pt-2 pb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-1">
              <Badge variant="outline" className="rounded-none border-primary text-primary font-bold uppercase tracking-wider text-[9px] truncate max-w-[120px]">
                {character.universe}
              </Badge>
              <span className="text-[10px] font-black tabular-nums" style={{ color: tier.color }}>
                {formatStatNum(avg)} PWR
              </span>
            </div>
            <h3 className="font-display text-xl leading-none uppercase truncate">{character.name}</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
              <StatBar label="STR" value={character.strength}     icon={Swords} color="text-team2" />
              <StatBar label="SPD" value={character.speed}        icon={Zap}    color="text-team1" />
              <StatBar label="INT" value={character.intelligence} icon={Brain}  color="text-secondary" />
              <StatBar label="DUR" value={character.durability}   icon={Shield} color="text-yellow-500" />
            </div>
            <p className="text-[10px] text-primary font-medium line-clamp-2 pt-0.5 leading-relaxed">{character.specialAbility}</p>
            {character.behaviorTags && character.behaviorTags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {character.behaviorTags.slice(0, 4).map(tag => (
                  <span
                    key={tag}
                    className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 leading-none"
                    style={{
                      color: TAG_COLORS[tag] ?? "rgba(255,255,255,0.4)",
                      background: `${TAG_COLORS[tag] ?? "rgba(255,255,255,0.2)"}18`,
                      border: `1px solid ${TAG_COLORS[tag] ?? "rgba(255,255,255,0.2)"}40`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[9px] text-muted-foreground/50 text-center mt-0.5 uppercase tracking-widest">Tap to flip</p>
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="roster-flip-face roster-flip-back border-2 border-primary/40 bg-card overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-center py-2 border-b border-primary/20 bg-primary/5 flex-shrink-0">
            <AvaLogo className="h-9 w-auto" />
          </div>

          {/* Small portrait + name + tier */}
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
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg leading-none uppercase truncate">{character.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="rounded-none border-primary/60 text-primary font-bold uppercase tracking-wider text-[8px]">
                  {character.universe}
                </Badge>
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: tier.color }}
                >
                  {tier.label}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable bio */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Bio</p>
              <p className="text-foreground/80 leading-relaxed text-[11px]">{character.description}</p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Signature Ability</p>
              <p className="text-primary text-[11px] leading-relaxed">{character.specialAbility}</p>
            </div>

            {character.weaknesses && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Weaknesses</p>
                <p className="text-destructive/80 text-[11px] leading-relaxed">{character.weaknesses}</p>
              </div>
            )}

            <div className="pt-1 border-t border-border/30">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <StatBar label="STR" value={character.strength}     icon={Swords} color="text-team2" />
                <StatBar label="SPD" value={character.speed}        icon={Zap}    color="text-team1" />
                <StatBar label="INT" value={character.intelligence} icon={Brain}  color="text-secondary" />
                <StatBar label="DUR" value={character.durability}   icon={Shield} color="text-yellow-500" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Avg Power</span>
                <span className="text-sm font-black tabular-nums" style={{ color: tier.color }}>{formatStatNum(avg)}</span>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground/50 text-center py-1.5 flex-shrink-0 border-t border-border/20 uppercase tracking-widest">Tap to flip back</p>
        </div>
      </div>
    </div>
  );
}
