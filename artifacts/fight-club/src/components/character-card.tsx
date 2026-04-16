import { useState } from "react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";

interface CharacterCardProps {
  character: Character;
  selectedTeam?: 1 | 2 | null;
  onClick?: () => void;
  disabled?: boolean;
}

const TEAM_COLORS = {
  1: { border: "#00f0ff", bg: "rgba(0,240,255,0.07)", glow: "0 0 18px rgba(0,240,255,0.45), inset 0 0 12px rgba(0,240,255,0.07)", label: "#00f0ff" },
  2: { border: "#ff3b30", bg: "rgba(255,59,48,0.07)", glow: "0 0 18px rgba(255,59,48,0.45), inset 0 0 12px rgba(255,59,48,0.07)", label: "#ff3b30" },
};

function StatCol({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = value;
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
      <span className="font-display text-sm font-bold leading-none" style={{ color }}>{value}</span>
      <div className="w-full h-0.5 bg-white/10 overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
      </div>
      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</span>
    </div>
  );
}

export function CharacterCard({ character, selectedTeam, onClick, disabled }: CharacterCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isSelected = selectedTeam != null;
  const tc = selectedTeam ? TEAM_COLORS[selectedTeam] : null;

  const initials = character.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isClickable = !(disabled && !isSelected);

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        border: `2px solid ${tc ? tc.border : "rgba(255,255,255,0.12)"}`,
        background: tc ? tc.bg : "hsl(var(--card))",
        boxShadow: isSelected && tc ? tc.glow : hovered ? "0 4px 20px rgba(0,0,0,0.5)" : "none",
        cursor: isClickable ? "pointer" : "not-allowed",
        opacity: disabled && !isSelected ? 0.45 : 1,
        filter: disabled && !isSelected ? "grayscale(0.6)" : "none",
        transform: hovered && isClickable ? "translateY(-2px) scale(1.01)" : "none",
        transition: "transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease",
      }}
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Team corner badge */}
      {isSelected && tc && (
        <div
          className="absolute top-0 right-0 z-20 font-display text-[10px] font-bold px-1.5 py-0.5 leading-none"
          style={{ background: tc.border, color: "#000" }}
        >
          T{selectedTeam}
        </div>
      )}

      {/* Portrait */}
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        {character.imageUrl && !imgError ? (
          <>
            <img
              src={character.imageUrl}
              alt={character.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
              style={{
                transform: hovered && isClickable ? "scale(1.06)" : "scale(1)",
                transition: "transform 0.4s ease",
              }}
              onError={() => setImgError(true)}
            />
            {/* Gradient overlay - stronger at bottom */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, hsl(var(--card)) 0%, hsl(var(--card)/0.5) 30%, transparent 60%)",
              }}
            />
            {/* Selection color tint */}
            {isSelected && tc && (
              <div
                className="absolute inset-0"
                style={{ background: `${tc.border}10`, mixBlendMode: "screen" }}
              />
            )}
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: tc ? `${tc.border}15` : "rgba(255,0,85,0.08)" }}
          >
            <span
              className="font-display text-6xl font-bold opacity-30 select-none"
              style={{ color: tc ? tc.border : "#ff0055" }}
            >
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className="px-2.5 pt-1.5 pb-2.5 space-y-1.5">
        {/* Universe */}
        <div
          className="text-[9px] font-bold uppercase tracking-widest truncate"
          style={{ color: tc ? tc.border : "hsl(var(--primary))" }}
        >
          {character.universe}
        </div>

        {/* Name */}
        <h3 className="font-display text-lg leading-none uppercase truncate text-foreground">
          {character.name}
        </h3>

        {/* Stats row */}
        <div className="flex gap-1.5 pt-0.5">
          <StatCol label="STR" value={character.strength}    color={tc ? tc.border : "#ff3b30"} />
          <StatCol label="SPD" value={character.speed}       color={tc ? tc.border : "#00f0ff"} />
          <StatCol label="INT" value={character.intelligence} color={tc ? tc.border : "#c084fc"} />
          <StatCol label="DUR" value={character.durability}  color={tc ? tc.border : "#eab308"} />
        </div>
      </div>
    </div>
  );
}
