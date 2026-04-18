import { memo } from "react";
import { Character } from "@workspace/api-client-react/src/generated/api.schemas";

export type PowerType = "FIRE" | "LIGHTNING" | "PSYCHIC" | "IRON" | "COSMIC";

interface PowerDef {
  primary: string;
  secondary: string;
  glow: string;
  auraGradient: string;
  textColor: string;
  label: string;
}

export const POWER_DEFS: Record<PowerType, PowerDef> = {
  FIRE: {
    primary:      "rgba(255, 85, 0, 0.9)",
    secondary:    "rgba(255, 175, 40, 0.95)",
    glow:         "0 0 7px rgba(255,90,0,0.85), 0 0 14px rgba(255,60,0,0.45)",
    auraGradient: "radial-gradient(ellipse at 50% 110%, rgba(255,85,0,0.55) 0%, rgba(255,40,0,0.15) 50%, transparent 70%)",
    textColor:    "#ff6500",
    label:        "FIRE",
  },
  LIGHTNING: {
    primary:      "rgba(255, 235, 0, 0.95)",
    secondary:    "rgba(180, 230, 255, 0.95)",
    glow:         "0 0 7px rgba(255,235,0,0.9), 0 0 14px rgba(200,235,255,0.55)",
    auraGradient: "radial-gradient(ellipse at 50% 110%, rgba(255,235,0,0.5) 0%, rgba(200,240,255,0.15) 50%, transparent 70%)",
    textColor:    "#ffe500",
    label:        "LIGHTNING",
  },
  PSYCHIC: {
    primary:      "rgba(175, 40, 255, 0.9)",
    secondary:    "rgba(220, 110, 255, 0.95)",
    glow:         "0 0 7px rgba(190,60,255,0.85), 0 0 14px rgba(140,0,255,0.5)",
    auraGradient: "radial-gradient(ellipse at 50% 110%, rgba(175,40,255,0.55) 0%, rgba(220,80,255,0.15) 50%, transparent 70%)",
    textColor:    "#c040ff",
    label:        "PSYCHIC",
  },
  IRON: {
    primary:      "rgba(0, 225, 185, 0.9)",
    secondary:    "rgba(90, 255, 205, 0.95)",
    glow:         "0 0 7px rgba(0,225,185,0.85), 0 0 14px rgba(0,185,145,0.5)",
    auraGradient: "radial-gradient(ellipse at 50% 110%, rgba(0,225,185,0.55) 0%, rgba(0,200,160,0.15) 50%, transparent 70%)",
    textColor:    "#00e1b9",
    label:        "IRON",
  },
  COSMIC: {
    primary:      "rgba(255, 215, 0, 0.95)",
    secondary:    "rgba(255, 255, 210, 0.95)",
    glow:         "0 0 7px rgba(255,215,0,0.9), 0 0 14px rgba(255,200,80,0.55)",
    auraGradient: "radial-gradient(ellipse at 50% 110%, rgba(255,215,0,0.55) 0%, rgba(255,200,100,0.15) 50%, transparent 70%)",
    textColor:    "#ffd700",
    label:        "COSMIC",
  },
};

export function getPowerType(c: Character): PowerType {
  const { strength, speed, intelligence, durability } = c;
  const vals = [strength, speed, intelligence, durability];
  const max = Math.max(...vals);
  const total = vals.reduce((a, b) => a + b, 0);
  const avg = total / 4;
  const allClose = vals.every(v => Math.abs(v - avg) < avg * 0.18);
  if (allClose) return "COSMIC";
  if (max === strength) return "FIRE";
  if (max === speed) return "LIGHTNING";
  if (max === intelligence) return "PSYCHIC";
  return "IRON";
}

const PARTICLES: Array<{ left: number; size: number; delay: number; dur: number; useSecondary: boolean }> = [
  { left: 10, size: 5, delay: 0.0,  dur: 2.2, useSecondary: false },
  { left: 25, size: 4, delay: 0.55, dur: 1.85, useSecondary: true  },
  { left: 42, size: 6, delay: 1.1,  dur: 2.5, useSecondary: false },
  { left: 58, size: 4, delay: 0.3,  dur: 2.05, useSecondary: true  },
  { left: 72, size: 5, delay: 0.85, dur: 1.95, useSecondary: false },
  { left: 88, size: 3, delay: 1.5,  dur: 2.15, useSecondary: true  },
  { left: 34, size: 4, delay: 1.25, dur: 2.35, useSecondary: false },
  { left: 65, size: 5, delay: 0.6,  dur: 1.75, useSecondary: true  },
];

interface PowerAuraProps {
  character: Character;
  hovered: boolean;
}

export const PowerAura = memo(function PowerAura({ character, hovered }: PowerAuraProps) {
  const type = getPowerType(character);
  const def = POWER_DEFS[type];

  return (
    <>
      {/* Ambient aura — always present, cheap single div */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: def.auraGradient,
          animation: "ava-aura-pulse 3s ease-in-out infinite",
          opacity: hovered ? 0.9 : 0.3,
          transition: "opacity 0.5s ease",
        }}
      />

      {/* Heavy particles + effects — only mounted when hovered to avoid 640 animating divs */}
      {hovered && (
        <>
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: `${p.left}%`,
                bottom: `${4 + (i % 4) * 5}px`,
                width: p.size,
                height: p.size,
                background: p.useSecondary ? def.secondary : def.primary,
                boxShadow: def.glow,
                animation: `ava-particle-rise ${p.dur}s ease-out ${p.delay}s infinite`,
                willChange: "transform, opacity",
              }}
            />
          ))}

          {/* Expanding ring */}
          <div
            className="absolute pointer-events-none"
            style={{ bottom: 0, left: "50%", transform: "translateX(-50%)" }}
          >
            <div
              style={{
                width: 72,
                height: 20,
                borderRadius: "50%",
                border: `1.5px solid ${def.primary}`,
                boxShadow: `0 0 10px ${def.primary}, 0 0 20px ${def.primary.replace("0.9)", "0.3)")}`,
                animation: "ava-ring-expand 1.6s ease-out infinite",
                willChange: "transform, opacity",
              }}
            />
          </div>

          {/* Shimmer sweep */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0, bottom: 0, left: 0, width: "28%",
              background: `linear-gradient(90deg, transparent 0%, ${def.secondary.replace(/[\d.]+\)$/, "0.18)")} 50%, transparent 100%)`,
              animation: "ava-shimmer-sweep 1.6s ease-in-out 0.15s infinite",
              willChange: "transform",
            }}
          />

          {/* Power type label */}
          <div className="absolute bottom-1.5 left-1.5 pointer-events-none">
            <span
              className="font-display text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 leading-none"
              style={{
                color: def.textColor,
                background: def.primary.replace(/[\d.]+\)$/, "0.12)"),
                border: `1px solid ${def.primary.replace(/[\d.]+\)$/, "0.4)")}`,
                textShadow: `0 0 10px ${def.textColor}`,
                display: "block",
              }}
            >
              {def.label}
            </span>
          </div>
        </>
      )}
    </>
  );
});
