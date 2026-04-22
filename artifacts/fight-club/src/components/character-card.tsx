import { useState, useEffect, memo } from "react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";
import { PowerAura } from "./power-aura";
import { Zap, Shield, Brain, Swords } from "lucide-react";
import { powerAvg, powerTier } from "./roster-flip-card";

interface CharacterCardProps {
  character: Character;
  selectedTeam?: 1 | 2 | null;
  onClick?: () => void;
  disabled?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const TEAM_COLORS = {
  1: { border: "#00f0ff", bg: "rgba(0,240,255,0.07)", glow: "0 0 18px rgba(0,240,255,0.45), inset 0 0 12px rgba(0,240,255,0.07)", label: "#00f0ff" },
  2: { border: "#ff3b30", bg: "rgba(255,59,48,0.07)", glow: "0 0 18px rgba(255,59,48,0.45), inset 0 0 12px rgba(255,59,48,0.07)", label: "#ff3b30" },
};

function computeOvr(c: Character): number {
  const avg = powerAvg(c);
  if (avg <= 0) return 1;
  const pct = (Math.log10(Math.max(100, avg)) - 2) / 5;
  return Math.max(1, Math.min(99, Math.round(pct * 98 + 1)));
}

const TIER_ICONS: Record<string, string> = {
  COSMIC: "★",
  ELITE: "◆",
  STANDARD: "●",
  STREET: "○",
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
  const isClickable = !(disabled && !isSelected);

  const ovr = computeOvr(character);
  const avg = powerAvg(character);
  const tier = powerTier(avg);

  const initials = character.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (isSelected) setFlipped(true);
    else setFlipped(false);
  }, [isSelected]);

  const handleClick = () => {
    if (!isClickable) return;
    if (isSelected && flipped) { setFlipped(false); return; }
    onClick?.();
  };

  return (
    <div
      className="ava-card-scene relative select-none"
      style={{ height: 200 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      <div className={`ava-card-inner ${flipped ? "is-flipped" : ""}`}>

        {/* ── FRONT: image-background card with OVR ── */}
        <div
          className="ava-card-face overflow-hidden"
          style={{
            background: "#0a0a0f",
            border: tc
              ? `2px solid ${tc.border}`
              : isSelected
              ? "2px solid rgba(255,255,255,0.3)"
              : "1px solid rgba(255,255,255,0.1)",
            boxShadow: isSelected && tc ? tc.glow : hovered ? "0 4px 20px rgba(0,0,0,0.5)" : "none",
            cursor: isClickable ? "pointer" : "not-allowed",
            opacity: disabled && !isSelected ? 0.45 : 1,
            filter: disabled && !isSelected ? "grayscale(0.6)" : "none",
          }}
        >
          {/* Background portrait */}
          {character.imageUrl && !imgError ? (
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
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: tc ? `${tc.border}15` : "rgba(255,0,85,0.08)" }}
            >
              <span className="font-display text-5xl font-bold opacity-25 select-none" style={{ color: tc ? tc.border : "#ff0055" }}>
                {initials}
              </span>
            </div>
          )}

          {/* Bottom gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.25) 60%, transparent 100%)",
            }}
          />

          {/* Team color tint overlay when selected */}
          {isSelected && tc && (
            <div className="absolute inset-0" style={{ background: `${tc.border}12`, mixBlendMode: "screen" }} />
          )}

          {/* Power aura */}
          <PowerAura character={character} hovered={hovered && isClickable} />

          {/* Team badge — top-left */}
          {isSelected && tc && (
            <div
              className="absolute top-0 left-0 z-20 font-display text-[10px] font-bold px-1.5 py-0.5 leading-none"
              style={{ background: tc.border, color: "#000" }}
            >
              T{selectedTeam}
            </div>
          )}

          {/* Heart favorite — top-right */}
          {onToggleFavorite && (
            <button
              onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
              className="absolute top-1.5 right-1.5 z-20 flex items-center justify-center transition-all duration-150"
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: isFavorite ? "rgba(239,68,68,0.25)" : "rgba(0,0,0,0.5)",
                border: `1px solid ${isFavorite ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.18)"}`,
                color: isFavorite ? "#ef4444" : "rgba(255,255,255,0.5)",
                fontSize: 12,
                lineHeight: 1,
                cursor: "pointer",
                transform: isFavorite ? "scale(1.1)" : "scale(1)",
                filter: isFavorite ? "drop-shadow(0 0 4px rgba(239,68,68,0.6))" : "none",
              }}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              ♥
            </button>
          )}

          {/* Bottom info overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-2 pt-6 pb-2">
            <div className="flex items-end justify-between gap-1">
              {/* Left: name + tier */}
              <div className="flex-1 min-w-0">
                <h3
                  className="font-display text-sm font-bold leading-tight uppercase truncate"
                  style={{ color: tc ? tc.border : "#ffffff", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
                >
                  {character.name}
                </h3>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <span
                    className="text-[9px] font-bold tracking-wider uppercase"
                    style={{ color: tier.color, textShadow: `0 0 8px ${tier.color}60` }}
                  >
                    {TIER_ICONS[tier.label]} {tier.label}
                  </span>
                </div>
              </div>

              {/* Right: OVR number */}
              <div className="flex-shrink-0 flex items-end gap-0.5 pb-0.5">
                <span
                  className="font-display font-bold leading-none"
                  style={{
                    fontSize: 26,
                    color: tc ? tc.border : "#ffffff",
                    textShadow: tc ? `0 0 12px ${tc.border}80` : "0 1px 4px rgba(0,0,0,0.9)",
                    lineHeight: 1,
                  }}
                >
                  {ovr}
                </span>
                <span
                  className="font-bold mb-0.5"
                  style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}
                >
                  OVR
                </span>
              </div>
            </div>
          </div>

          {/* Hint when selected + front showing */}
          {isSelected && !flipped && (
            <div
              className="absolute inset-x-0 top-0 text-center text-[7px] uppercase tracking-widest py-0.5 z-20"
              style={{
                color: tc ? `${tc.border}80` : "rgba(255,255,255,0.25)",
                background: "rgba(0,0,0,0.5)",
              }}
            >
              tap to see stats
            </div>
          )}
        </div>

        {/* ── BACK: stat detail view ── */}
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
            <div className="flex-shrink-0 flex flex-col items-end ml-2 gap-0.5">
              {tc && (
                <div
                  className="font-display text-[10px] font-bold px-1.5 py-0.5 leading-none"
                  style={{ background: tc.border, color: "#000" }}
                >
                  T{selectedTeam}
                </div>
              )}
              <div className="flex items-center gap-0.5">
                <span className="font-display font-bold leading-none" style={{ fontSize: 20, color: tc ? tc.border : tier.color }}>
                  {ovr}
                </span>
                <span className="font-bold" style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>OVR</span>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2" style={{ scrollbarWidth: "none" }}>
            {character.description && (
              <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                {character.description}
              </p>
            )}

            {character.specialAbility && (
              <div>
                <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: tc ? tc.border : "hsl(var(--primary))" }}>
                  Ability
                </p>
                <p className="text-[10px] leading-relaxed" style={{ color: tc ? tc.border + "cc" : "hsl(var(--primary)/0.8)" }}>
                  {character.specialAbility}
                </p>
              </div>
            )}

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

            <div className="space-y-1 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <StatRow icon={Swords} label="STR" value={character.strength}     color="#ff3b30" />
              <StatRow icon={Zap}    label="SPD" value={character.speed}        color="#00f0ff" />
              <StatRow icon={Brain}  label="INT" value={character.intelligence} color="#c084fc" />
              <StatRow icon={Shield} label="DUR" value={character.durability}   color="#eab308" />
            </div>
          </div>

          <p
            className="flex-shrink-0 text-center text-[8px] uppercase tracking-widest py-1"
            style={{ color: "rgba(255,255,255,0.15)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            tap to flip · tap again to remove
          </p>
        </div>

      </div>
    </div>
  );
}

export const CharacterCard = memo(CharacterCardInner);
