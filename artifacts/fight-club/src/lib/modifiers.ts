// ─── Chaos modifier registry (frontend) ──────────────────────────────────────
// Display metadata for the pre-fight modifier picker. Mirrors the server-side
// registry in artifacts/api-server/src/lib/modifiers.ts — keep `id`s aligned.

export const MODIFIER_IDS = [
  "no_powers",
  "underdog",
  "lava_floor",
  "zero_gravity",
  "glass_cannons",
  "comedy",
  "trash_talk",
] as const;

export type ModifierId = (typeof MODIFIER_IDS)[number];

export interface ModifierMeta {
  id: ModifierId;
  label: string;
  emoji: string;
  // One-line blurb shown in the picker tooltip / lobby badge.
  blurb: string;
  // HUD accent color for the badge.
  color: string;
}

export const MODIFIERS: Record<ModifierId, ModifierMeta> = {
  no_powers: {
    id: "no_powers",
    label: "Powers Off",
    emoji: "⛓",
    blurb: "Every superpower fizzles. Fists, weapons, and grit only.",
    color: "#9aa0a6",
  },
  underdog: {
    id: "underdog",
    label: "Underdog Buff",
    emoji: "🛡",
    blurb: "The weaker team fights at 2× power. Upsets become guaranteed.",
    color: "#ffcc00",
  },
  lava_floor: {
    id: "lava_floor",
    label: "Lava Floor",
    emoji: "🌋",
    blurb: "The floor is molten lava. Touching it is fatal.",
    color: "#ff6b00",
  },
  zero_gravity: {
    id: "zero_gravity",
    label: "Zero Gravity",
    emoji: "🪐",
    blurb: "No floor. No ceiling. Momentum decides everything.",
    color: "#7c5cff",
  },
  glass_cannons: {
    id: "glass_cannons",
    label: "Glass Cannons",
    emoji: "💎",
    blurb: "Everyone hits like a god, folds like paper. One hit, one kill.",
    color: "#00f0ff",
  },
  comedy: {
    id: "comedy",
    label: "Comedy Mode",
    emoji: "🎭",
    blurb: "Real fight, real stakes — but staged like a slapstick sketch.",
    color: "#ff66cc",
  },
  trash_talk: {
    id: "trash_talk",
    label: "Trash Talk",
    emoji: "🎤",
    blurb: "Every round opens with a vicious, character-true taunt.",
    color: "#ff0055",
  },
};

export function getModifier(id: string | null | undefined): ModifierMeta | null {
  if (!id) return null;
  return (MODIFIERS as Record<string, ModifierMeta>)[id] ?? null;
}

export function rollRandomModifier(): ModifierId {
  const arr = MODIFIER_IDS;
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// localStorage key for the player's last picked modifier on the home screen.
export const LS_LAST_MODIFIER = "ava_last_modifier_v1";
