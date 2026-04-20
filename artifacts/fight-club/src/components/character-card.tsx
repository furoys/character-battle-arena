import { useState, useEffect, memo } from "react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { PowerAura } from "./power-aura";
import { Zap, Shield, Brain, Swords } from "lucide-react";

interface CharacterCardProps {
  character: Character;
  selectedTeam?: 1 | 2 | null;
  onClick?: () => void;
  disabled?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

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

const TEAM_COLORS = {
  1: { border: "#00f0ff", bg: "rgba(0,240,255,0.07)", glow: "0 0 18px rgba(0,240,255,0.45), inset 0 0 12px rgba(0,240,255,0.07)", label: "#00f0ff" },
  2: { border: "#ff3b30", bg: "rgba(255,59,48,0.07)", glow: "0 0 18px rgba(255,59,48,0.45), inset 0 0 12px rgba(255,59,48,0.07)", label: "#ff3b30" },
};

const formatStat = (v: number): string => {
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000)    return `${Math.round(v / 1_000)}K`;
  if (v >= 1_000)     return `${+(v / 1_000).toFixed(1)}K`;
  return String(v);
};

function statBarPct(v: number): number {
  if (v <= 0) return 0;
  const MIN_LOG = 2, MAX_LOG = 7;
  return Math.min(100, Math.max(0, ((Math.log10(Math.max(1, v)) - MIN_LOG) / (MAX_LOG - MIN_LOG)) * 100));
}

function StatCol({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = statBarPct(value);
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
      <span className="font-display text-sm font-bold leading-none" style={{ color, textShadow: `0 0 8px ${color}60` }}>
        {formatStat(value)}
      </span>
      <div className="w-full h-1 bg-white/10 overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: color, opacity: 0.8 }} />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </span>
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const pct = statBarPct(value);
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-2.5 w-2.5 flex-shrink-0" style={{ color }} />
      <span className="text-[9px] font-bold w-5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <div className="flex-1 h-1 bg-white/10 overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
      </div>
      <span className="text-[9px] font-bold tabular-nums w-8 text-right" style={{ color }}>{formatStat(value)}</span>
    </div>
  );
}

function CharacterCardInner({ character, selectedTeam, onClick, disabled, isFavorite, onToggleFavorite }: CharacterCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const isSelected = selectedTeam != null;
  const tc = selectedTeam ? TEAM_COLORS[selectedTeam] : null;

  const initials = character.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isClickable = !(disabled && !isSelected);

  // Auto-flip to back when added to a team, flip back to front when removed
  useEffect(() => {
    if (isSelected) {
      setFlipped(true);
    } else {
      setFlipped(false);
    }
  }, [isSelected]);

  const handleClick = () => {
    if (!isClickable) return;
    if (isSelected) {
      if (flipped) {
        setFlipped(false);
        return;
      }
      onClick?.();
    } else {
      onClick?.();
    }
  };

  return (
    <div
        className="ava-card-scene relative select-none"
        style={{ height: 300 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
      >
        <div className={`ava-card-inner ${flipped ? "is-flipped" : ""}`}>

          {/* ── FRONT ── */}
          <div
            className="ava-card-face"
            style={{
              border: `2px solid ${tc ? tc.border : "rgba(255,255,255,0.12)"}`,
              background: tc ? tc.bg : "hsl(var(--card))",
              boxShadow: isSelected && tc ? tc.glow : hovered ? "0 4px 20px rgba(0,0,0,0.5)" : "none",
              cursor: isClickable ? "pointer" : "not-allowed",
              opacity: disabled && !isSelected ? 0.45 : 1,
              filter: disabled && !isSelected ? "grayscale(0.6)" : "none",
            }}
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
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    style={{
                      transform: hovered && isClickable && !flipped ? "scale(1.06)" : "scale(1)",
                      transition: "transform 0.4s ease",
                    }}
                    onError={() => setImgError(true)}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, hsl(var(--card)) 0%, hsl(var(--card)/0.55) 28%, transparent 58%)",
                    }}
                  />
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
              <PowerAura character={character} hovered={hovered && isClickable} />
            </div>

            {/* Info panel */}
            <div className="relative px-2.5 pt-1.5 pb-2.5 space-y-1.5">
              <div
                className="text-[10px] font-bold uppercase tracking-widest truncate pr-5"
                style={{ color: tc ? tc.border : "hsl(var(--primary))" }}
              >
                {character.universe}
              </div>
              <h3 className="font-display text-base leading-none uppercase truncate text-foreground pr-5">
                {character.name}
              </h3>
              <div className="flex gap-1.5 pt-0.5">
                <StatCol label="STR" value={character.strength}    color={tc ? tc.border : "#ff3b30"} />
                <StatCol label="SPD" value={character.speed}       color={tc ? tc.border : "#00f0ff"} />
                <StatCol label="INT" value={character.intelligence} color={tc ? tc.border : "#c084fc"} />
                <StatCol label="DUR" value={character.durability}  color={tc ? tc.border : "#eab308"} />
              </div>
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
              {onToggleFavorite && (
                <button
                  onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
                  className="absolute top-1.5 right-1.5 transition-all duration-150"
                  style={{
                    fontSize: isFavorite ? 16 : 14,
                    lineHeight: 1,
                    color: isFavorite ? "#fbbf24" : hovered ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)",
                    transform: isFavorite ? "scale(1.15)" : hovered ? "scale(1.05)" : "scale(1)",
                    filter: isFavorite ? "drop-shadow(0 0 5px #fbbf2480)" : "none",
                    background: isFavorite ? "rgba(251,191,36,0.12)" : hovered ? "rgba(255,255,255,0.08)" : "none",
                    border: isFavorite ? "1px solid rgba(251,191,36,0.3)" : "1px solid transparent",
                    borderRadius: 4,
                    padding: "2px 3px",
                    cursor: "pointer",
                  }}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  ★
                </button>
              )}

              {/* Hint when selected + front showing */}
              {isSelected && (
                <p
                  className="text-center text-[8px] uppercase tracking-widest"
                  style={{ color: tc ? `${tc.border}50` : "rgba(255,255,255,0.2)" }}
                >
                  tap to flip · tap again to remove
                </p>
              )}
            </div>
          </div>

          {/* ── BACK ── */}
          <div
            className="ava-card-face ava-card-back flex flex-col"
            style={{
              border: `2px solid ${tc ? tc.border : "rgba(255,255,255,0.12)"}`,
              background: "hsl(var(--card))",
              boxShadow: tc ? tc.glow : "none",
              cursor: "pointer",
            }}
          >
            {/* Header strip */}
            <div
              className="flex-shrink-0 flex items-center justify-between px-2.5 py-1.5"
              style={{
                borderBottom: `1px solid ${tc ? tc.border + "30" : "rgba(255,255,255,0.08)"}`,
                background: tc ? `${tc.border}08` : "rgba(255,255,255,0.02)",
              }}
            >
              <div className="min-w-0 flex-1">
                <div
                  className="text-[9px] font-bold uppercase tracking-widest truncate"
                  style={{ color: tc ? tc.border : "hsl(var(--primary))" }}
                >
                  {character.universe}
                </div>
                <h3
                  className="font-display text-sm leading-none uppercase truncate"
                  style={{ color: tc ? tc.border : "rgba(255,255,255,0.9)" }}
                >
                  {character.name}
                </h3>
              </div>
              {tc && (
                <div
                  className="flex-shrink-0 font-display text-[10px] font-bold px-1.5 py-0.5 leading-none ml-2"
                  style={{ background: tc.border, color: "#000" }}
                >
                  T{selectedTeam}
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2" style={{ scrollbarWidth: "none" }}>
              {/* Bio */}
              {character.description && (
                <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {character.description}
                </p>
              )}

              {/* Special ability */}
              {character.specialAbility && (
                <div>
                  <p
                    className="text-[8px] font-bold uppercase tracking-widest mb-0.5"
                    style={{ color: tc ? tc.border : "hsl(var(--primary))" }}
                  >
                    Ability
                  </p>
                  <p className="text-[10px] leading-relaxed" style={{ color: tc ? tc.border + "cc" : "hsl(var(--primary)/0.8)" }}>
                    {character.specialAbility}
                  </p>
                </div>
              )}

              {/* Weaknesses */}
              {character.weaknesses && (
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,80,80,0.7)" }}>
                    Weakness
                  </p>
                  <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,120,120,0.75)" }}>
                    {character.weaknesses}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="space-y-1 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <StatRow icon={Swords} label="STR" value={character.strength}    color="#ff3b30" />
                <StatRow icon={Zap}    label="SPD" value={character.speed}       color="#00f0ff" />
                <StatRow icon={Brain}  label="INT" value={character.intelligence} color="#c084fc" />
                <StatRow icon={Shield} label="DUR" value={character.durability}  color="#eab308" />
              </div>
            </div>

            {/* Tap hint */}
            <p
              className="flex-shrink-0 text-center text-[8px] uppercase tracking-widest py-1"
              style={{
                color: "rgba(255,255,255,0.15)",
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              tap to flip · tap again to remove
            </p>
          </div>

        </div>
      </div>
  );
}

export const CharacterCard = memo(CharacterCardInner);
