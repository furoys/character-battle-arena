import type { Character } from "@workspace/db";

export interface ModifierNote {
  character: string;
  type: "synergy" | "weakness";
  label: string;
  delta: Partial<Record<"strength" | "speed" | "intelligence" | "durability", number>>;
}

export interface FightModifierResult {
  modTeam1: Character[];
  modTeam2: Character[];
  notes: ModifierNote[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

interface V3 {
  archetypes?: string | string[];
  combatStyle?: string | string[];
  temperament?: string;
  preferredRange?: string;
  battleIQ?: number;
  counters?: string | string[];
  weaknesses?: string | string[];
  abilities?: string | string[];
  specialRules?: string | string[];
}

function v3(c: Character): V3 {
  return ((c.v3Profile ?? {}) as V3);
}

function archetypes(c: Character): string[] {
  return toArray(v3(c).archetypes).map(s => s.toLowerCase());
}

function combatStyle(c: Character): string[] {
  return toArray(v3(c).combatStyle).map(s => s.toLowerCase());
}

function counters(c: Character): string {
  return toArray(v3(c).counters).join(" ").toLowerCase();
}

function weaknessText(c: Character): string {
  const v = v3(c);
  return [
    ...toArray(v.weaknesses),
    c.weaknesses ?? "",
  ].join(" ").toLowerCase();
}

function abilitiesText(c: Character): string {
  const v = v3(c);
  return [
    ...toArray(v.abilities),
    ...toArray(v.specialRules),
    c.specialAbility ?? "",
  ].join(" ").toLowerCase();
}

function allText(c: Character): string {
  return [archetypes(c).join(" "), combatStyle(c).join(" "), abilitiesText(c)].join(" ");
}

function hasArchetype(c: Character, ...keywords: string[]): boolean {
  const arcs = archetypes(c);
  const styles = combatStyle(c);
  const combined = [...arcs, ...styles].join(" ");
  return keywords.some(k => combined.includes(k));
}

function battleIQ(c: Character): number {
  return v3(c).battleIQ ?? 50;
}

function preferredRange(c: Character): string {
  return (v3(c).preferredRange ?? "").toLowerCase();
}

/** Apply a percentage modifier to a stat, clamped between 1 and original × 1.15 */
function modStat(
  original: number,
  pct: number,
): number {
  const modified = Math.round(original * (1 + pct));
  return Math.max(1, Math.min(modified, Math.round(original * 1.15)));
}

/** Clone a character with adjusted stats */
function applyDeltas(
  c: Character,
  deltas: Partial<Record<"strength" | "speed" | "intelligence" | "durability", number>>,
): Character {
  return {
    ...c,
    strength:     deltas.strength     !== undefined ? modStat(c.strength,     deltas.strength)     : c.strength,
    speed:        deltas.speed        !== undefined ? modStat(c.speed,        deltas.speed)        : c.speed,
    intelligence: deltas.intelligence !== undefined ? modStat(c.intelligence, deltas.intelligence) : c.intelligence,
    durability:   deltas.durability   !== undefined ? modStat(c.durability,   deltas.durability)   : c.durability,
  };
}

// ── Shared delta type ─────────────────────────────────────────────────────────

type StatDeltas = Partial<Record<"strength" | "speed" | "intelligence" | "durability", number>>;

// ── Synergy detection (within-team) ──────────────────────────────────────────

interface SynergyRule {
  label: string;
  /** Returns per-character deltas keyed by character index */
  apply: (team: Character[]) => Map<number, StatDeltas>;
}

const SYNERGY_RULES: SynergyRule[] = [
  // Tactician + Bruiser: the bruiser executes the plan more efficiently
  {
    label: "Tactician/Bruiser Pairing",
    apply(team) {
      const out = new Map<number, StatDeltas>();
      const tacticianIdx = team.findIndex(c => hasArchetype(c, "tactical", "strategist", "support"));
      const bruiserIdx   = team.findIndex((c, i) =>
        i !== tacticianIdx && hasArchetype(c, "bruiser", "brawler", "berserker", "aggressive", "powerhouse")
      );
      if (tacticianIdx !== -1 && bruiserIdx !== -1) {
        out.set(tacticianIdx, { intelligence: 0.05 });
        out.set(bruiserIdx,   { strength: 0.06 });
      }
      return out;
    },
  },

  // Ranged blaster + frontline: spacing control makes both more effective
  {
    label: "Ranged/Frontline Spacing",
    apply(team) {
      const out = new Map<number, StatDeltas>();
      const rangedIdx = team.findIndex(c =>
        preferredRange(c) === "long" || hasArchetype(c, "ranged", "blaster", "sniper", "artillery", "marksman")
      );
      const frontlineIdx = team.findIndex((c, i) =>
        i !== rangedIdx && (
          preferredRange(c) === "close" || hasArchetype(c, "bruiser", "frontline", "tank", "brawler", "berserker")
        )
      );
      if (rangedIdx !== -1 && frontlineIdx !== -1) {
        out.set(rangedIdx,    { speed: 0.04, intelligence: 0.04 });
        out.set(frontlineIdx, { durability: 0.05 });
      }
      return out;
    },
  },

  // Multiple martial-experts: sparring raises each other's precision
  {
    label: "Martial Expert Coordination",
    apply(team) {
      const out = new Map<number, StatDeltas>();
      const experts = team
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => hasArchetype(c, "martial-expert", "martial expert", "fighter", "swordsman", "assassin", "ninja", "monk"));
      if (experts.length >= 2) {
        for (const { i } of experts) {
          out.set(i, { speed: 0.04, strength: 0.03 });
        }
      }
      return out;
    },
  },

  // Multiple hunters: coordinated tracking
  {
    label: "Hunter Pack Coordination",
    apply(team) {
      const out = new Map<number, StatDeltas>();
      const hunters = team
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => hasArchetype(c, "hunter", "predator", "tracker", "bounty-hunter"));
      if (hunters.length >= 2) {
        for (const { i } of hunters) {
          out.set(i, { speed: 0.05, intelligence: 0.03 });
        }
      }
      return out;
    },
  },

  // High-IQ commander lifts team intelligence
  {
    label: "High-IQ Commander Presence",
    apply(team) {
      const out = new Map<number, StatDeltas>();
      if (team.length < 2) return out;
      const commanderIdx = team.findIndex(c => battleIQ(c) >= 85);
      if (commanderIdx === -1) return out;
      team.forEach((_, i) => {
        if (i !== commanderIdx) out.set(i, { intelligence: 0.03 });
      });
      return out;
    },
  },

  // Healer/regeneration ally improves team attrition
  {
    label: "Regeneration/Healer Attrition Bonus",
    apply(team) {
      const out = new Map<number, StatDeltas>();
      if (team.length < 2) return out;
      const healerIdx = team.findIndex(c =>
        hasArchetype(c, "healer", "support", "regenerat") ||
        abilitiesText(c).includes("regenerat") ||
        abilitiesText(c).includes("heal")
      );
      if (healerIdx === -1) return out;
      team.forEach((_, i) => {
        if (i !== healerIdx) out.set(i, { durability: 0.04 });
      });
      return out;
    },
  },

  // Leader archetype: small boost to all allies
  {
    label: "Leadership Presence",
    apply(team) {
      const out = new Map<number, StatDeltas>();
      if (team.length < 2) return out;
      const leaderIdx = team.findIndex(c => hasArchetype(c, "leader", "commander", "captain"));
      if (leaderIdx === -1) return out;
      team.forEach((_, i) => {
        if (i !== leaderIdx) out.set(i, { strength: 0.02, durability: 0.02 });
      });
      return out;
    },
  },

  // Same preferred range (all-close or all-long): coordination bonus
  {
    label: "Unified Combat Range",
    apply(team) {
      const out = new Map<number, StatDeltas>();
      if (team.length < 2) return out;
      const ranges = team.map(preferredRange).filter(r => r === "close" || r === "long");
      if (ranges.length !== team.length) return out;
      const allSame = ranges.every(r => r === ranges[0]);
      if (!allSame) return out;
      const delta = ranges[0] === "close" ? { strength: 0.03 } : { speed: 0.03, intelligence: 0.02 };
      team.forEach((_, i) => out.set(i, delta));
      return out;
    },
  },
];

// ── Weakness detection (cross-team matchup) ───────────────────────────────────

interface WeaknessCategory {
  label: string;
  /** Returns a penalty % for the defender character given the opponent team */
  check: (defender: Character, opponents: Character[]) => Partial<Record<"strength" | "speed" | "intelligence" | "durability", number>> | null;
}

const WEAKNESS_CATEGORIES: WeaknessCategory[] = [
  // Telepathy / mental attacks
  {
    label: "Mental Vulnerability",
    check(def, opp) {
      const defWeak = weaknessText(def);
      if (!/telepathy|psychic|mental|mind\b|illusion/.test(defWeak)) return null;
      const oppHasPsychic = opp.some(c =>
        /telepathy|psychic|telepath|mind control|illusion/.test(allText(c))
      );
      if (!oppHasPsychic) return null;
      return { intelligence: -0.06, durability: -0.04 };
    },
  },

  // Fire / heat vulnerabilities
  {
    label: "Fire/Heat Weakness",
    check(def, opp) {
      const defWeak = weaknessText(def);
      if (!/fire|heat|flame|burn/.test(defWeak)) return null;
      const oppHasFire = opp.some(c =>
        /fire|flame|heat|burn|pyroki|pyro|inferno/.test(allText(c))
      );
      if (!oppHasFire) return null;
      return { durability: -0.06, strength: -0.03 };
    },
  },

  // Sonic / sound vulnerabilities
  {
    label: "Sonic Vulnerability",
    check(def, opp) {
      const defWeak = weaknessText(def);
      if (!/sonic|sound|vibration|frequency/.test(defWeak)) return null;
      const oppHasSonic = opp.some(c =>
        /sonic|sound|vibration|frequency|scream|shout/.test(allText(c))
      );
      if (!oppHasSonic) return null;
      return { durability: -0.07, speed: -0.04 };
    },
  },

  // Technology dependency vs EMP / tech-counter opponents
  {
    label: "Technology Dependency",
    check(def, opp) {
      const defWeak = weaknessText(def);
      if (!/technolog|reliance on tech|tech-dependent|EMP|emp/.test(defWeak)) return null;
      const oppHasTech = opp.some(c =>
        /emp|technology|hacking|tech|disable|shut down|electromagnetic/.test(allText(c))
      );
      if (!oppHasTech) return null;
      return { strength: -0.06, intelligence: -0.05 };
    },
  },

  // Fragile human vs cosmic-level overwhelm
  {
    label: "Cosmic Overwhelm",
    check(def, opp) {
      const cosmicOpp = opp.some(c =>
        hasArchetype(c, "cosmic", "reality-warper", "reality warper", "omnipotent", "divine") ||
        /cosmic|reality.warp|omnipotent/.test(abilitiesText(c))
      );
      if (!cosmicOpp) return null;
      const defIsFragile =
        def.durability < 100 ||
        hasArchetype(def, "human", "street-level", "street level") ||
        weaknessText(def).includes("human") ||
        weaknessText(def).includes("fragile");
      if (!defIsFragile) return null;
      return { durability: -0.08, strength: -0.05 };
    },
  },

  // Setup-based (long-range + tactical) vs rushdown (close + aggressive)
  {
    label: "Setup Disrupted by Rushdown",
    check(def, opp) {
      const defIsSetup =
        (preferredRange(def) === "long" || preferredRange(def) === "mid") &&
        hasArchetype(def, "tactical", "strategist", "setup", "trap", "support");
      if (!defIsSetup) return null;
      const oppIsRushdown = opp.some(c =>
        (preferredRange(c) === "close" || hasArchetype(c, "berserker", "rushdown", "aggressive", "brawler")) &&
        (c.speed > def.speed * 1.1)
      );
      if (!oppIsRushdown) return null;
      return { strength: -0.05, intelligence: -0.03 };
    },
  },

  // Counter keyword matching: character's listed counters matched by opponent
  {
    label: "Hard Counter Match",
    check(def, opp) {
      const defCounters = counters(def);
      if (!defCounters) return null;
      const COUNTER_PATTERNS: [RegExp, Partial<Record<"strength" | "speed" | "intelligence" | "durability", number>>][] = [
        [/magic|mystical|sorcery|spell/,          { intelligence: -0.05, durability: -0.04 }],
        [/energy.?absorb|kinetic.?absorb/,         { strength: -0.06 }],
        [/reality|reality.?warp/,                  { durability: -0.08, strength: -0.06 }],
        [/speed|faster|quick/,                     { speed: -0.05 }],
        [/telepath|mind|mental/,                   { intelligence: -0.06 }],
        [/cosmic|god-level|omnipotent/,            { durability: -0.07, strength: -0.05 }],
        [/physical|close.?range|close combat/,     { strength: -0.04 }],
        [/long.?range|ranged|distance/,            { speed: -0.04, intelligence: -0.03 }],
        [/power.?damp|nullif|suppress/,            { strength: -0.08, durability: -0.06 }],
      ];

      let totalDelta: Partial<Record<"strength" | "speed" | "intelligence" | "durability", number>> = {};
      let matched = false;

      for (const [pattern, delta] of COUNTER_PATTERNS) {
        if (!pattern.test(defCounters)) continue;
        const oppMatchesCounter = opp.some(c => pattern.test(allText(c)));
        if (!oppMatchesCounter) continue;
        matched = true;
        for (const [stat, val] of Object.entries(delta) as [keyof typeof delta, number][]) {
          totalDelta[stat] = (totalDelta[stat] ?? 0) + val;
        }
      }

      if (!matched) return null;
      for (const stat of Object.keys(totalDelta) as (keyof typeof totalDelta)[]) {
        totalDelta[stat] = Math.max(totalDelta[stat]!, -0.10);
      }
      return totalDelta;
    },
  },
];

// ── Merge deltas ──────────────────────────────────────────────────────────────

function mergeDeltas(a: StatDeltas, b: StatDeltas): StatDeltas {
  const out: StatDeltas = { ...a };
  for (const [k, v] of Object.entries(b) as [keyof StatDeltas, number][]) {
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function applyFightModifiers(
  team1: Character[],
  team2: Character[],
): FightModifierResult {
  const notes: ModifierNote[] = [];

  const deltas1: StatDeltas[] = team1.map(() => ({}));
  const deltas2: StatDeltas[] = team2.map(() => ({}));

  // ── Synergy (within-team) ─────────────────────────────────────────────────
  for (const rule of SYNERGY_RULES) {
    const map1 = rule.apply(team1);
    for (const [idx, delta] of map1.entries()) {
      deltas1[idx] = mergeDeltas(deltas1[idx]!, delta);
      notes.push({
        character: team1[idx]!.name,
        type: "synergy",
        label: rule.label,
        delta,
      });
    }

    const map2 = rule.apply(team2);
    for (const [idx, delta] of map2.entries()) {
      deltas2[idx] = mergeDeltas(deltas2[idx]!, delta);
      notes.push({
        character: team2[idx]!.name,
        type: "synergy",
        label: rule.label,
        delta,
      });
    }
  }

  // ── Weaknesses (cross-team) ───────────────────────────────────────────────
  team1.forEach((c, i) => {
    for (const cat of WEAKNESS_CATEGORIES) {
      const delta = cat.check(c, team2);
      if (!delta) continue;
      deltas1[i] = mergeDeltas(deltas1[i]!, delta);
      notes.push({ character: c.name, type: "weakness", label: cat.label, delta });
    }
  });

  team2.forEach((c, i) => {
    for (const cat of WEAKNESS_CATEGORIES) {
      const delta = cat.check(c, team1);
      if (!delta) continue;
      deltas2[i] = mergeDeltas(deltas2[i]!, delta);
      notes.push({ character: c.name, type: "weakness", label: cat.label, delta });
    }
  });

  // ── Apply and return ──────────────────────────────────────────────────────
  const modTeam1 = team1.map((c, i) => applyDeltas(c, deltas1[i]!));
  const modTeam2 = team2.map((c, i) => applyDeltas(c, deltas2[i]!));

  return { modTeam1, modTeam2, notes };
}
