// ─── Chaos modifiers (a.k.a. "mutators") ─────────────────────────────────────
// Pre-fight rule modifiers that change the flavor — and sometimes the outcome —
// of a single match. Picked (or rolled) on the home / challenge create screen,
// stored on the fight + challenge rows, and spliced into the AI prompt below.
//
// The frontend has its own registry in artifacts/fight-club/src/lib/modifiers.ts
// for display data (emoji / blurb). The two stay in sync via shared `id`s — keep
// them aligned when adding or removing entries.

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

interface ModifierDef {
  id: ModifierId;
  label: string;
  // Block spliced into the cinematic narrative prompt under a "CHAOS MODIFIER"
  // header. Authoritative — the AI must obey it for every round.
  promptBlock: string;
  // When true, after the Stage-1 verdict is locked in we swap the winner so
  // the underdog walks away victorious. Narrative is then written assuming
  // the swapped winner.
  flipUnderdog?: boolean;
}

export const MODIFIERS: Record<ModifierId, ModifierDef> = {
  no_powers: {
    id: "no_powers",
    label: "Powers Off",
    promptBlock:
      "POWERS OFF. Every superpower, energy projection, magic spell, technopathy, cosmic ability, mutation, and divine intervention is suppressed for the duration of this fight. Fighters keep their physical conditioning, training, intelligence, and any mundane gear (firearms, blades, melee weapons), but every attempt to call on a power must visibly fail — sparks fizzle, the air refuses to ignite, the strength they expected isn't there. Show fighters reaching for what they know and finding nothing, then improvising with grit and skill. Whoever has the better fundamentals and weapons should look like the favorite.",
  },
  underdog: {
    id: "underdog",
    label: "Underdog Buff",
    promptBlock:
      "UNDERDOG BUFF. Reality has bent in favor of the weaker side. The team the math says should lose is fighting at roughly twice their normal power, and they win this match. Show this — the underdog moves faster than they should, hits harder than they have any right to, recovers from things that should have ended them. The bigger / stronger side starts confident and slowly realizes the rules of physics are not on their side today. Honor the locked verdict (which has been re-pointed at the underdog) — the favorite still has to lose.",
    flipUnderdog: true,
  },
  lava_floor: {
    id: "lava_floor",
    label: "Lava Floor",
    promptBlock:
      "LAVA FLOOR. The arena floor has been replaced with a churning sheet of molten lava — bright orange, hissing, ankle-deep heat haze. Combatants must stay airborne, on debris islands, on each other, or on whatever they can improvise. Touching the lava cooks armor in a heartbeat and turns flesh to vapor. Knockdowns are catastrophic. Every round must reference the heat, the smell, the crumbling islands, or a near-miss with the lava. The decisive blow should ideally involve someone going INTO the lava.",
  },
  zero_gravity: {
    id: "zero_gravity",
    label: "Zero Gravity",
    promptBlock:
      "ZERO GRAVITY. Gravity is off. There is no floor, no ceiling, no sense of up. Everyone drifts. Every action sends the actor in the opposite direction (Newton's third law is amplified — a thrown punch sends the puncher tumbling backward). Fighters with flight, telekinesis, or jet propulsion have a huge edge. Brawlers must improvise — kick off chunks of rubble, grab onto the enemy and use them as a pivot. Describe the disorientation, the floating debris, the way blood beads in the air. Momentum is everything.",
  },
  glass_cannons: {
    id: "glass_cannons",
    label: "Glass Cannons",
    promptBlock:
      "GLASS CANNONS. Every fighter on both teams hits like a god and folds like wet paper. Defenses are gone — armor cracks, durability is meaningless, healing factors are off. The first solid, clean strike on any combatant takes them out for good. Rounds are short, brutal, and decided by who lands first. No long exchanges, no wearing each other down. One hit, one kill. The fight resolves in two or three rounds at most.",
  },
  comedy: {
    id: "comedy",
    label: "Comedy Mode",
    promptBlock:
      "COMEDY MODE. The fight is real and the stakes are real, but every beat is staged like physical comedy. Pratfalls, double-takes, banana-peel pivots, overconfidence punished, plans that backfire spectacularly. Fighters slip on their own debris, headbutt walls, get hit by their own ricocheting attacks. Dialogue is dry, deadpan, sarcastic — characters comment on the absurdity even as they're getting their teeth kicked in. Keep the loser losing and the winner winning, but make the audience laugh out loud at least once per round.",
  },
  trash_talk: {
    id: "trash_talk",
    label: "Trash Talk",
    promptBlock:
      "TRASH TALK MODE. Every single round MUST open with the attacker delivering a vicious, character-true taunt to their opponent before they connect. The taunt should feel like THAT specific character — Deadpool referencing the fourth wall, Wolverine growling something with 'bub' in it, Tony Stark mocking their suit, Vegeta bringing up power levels. The taunt must be at least one full sentence and must land BEFORE the attack lands. The opponent may snap a one-line comeback after taking the hit. Make the dialogue as memorable as the violence.",
  },
};

export function getModifier(id: string | null | undefined): ModifierDef | null {
  if (!id) return null;
  return (MODIFIERS as Record<string, ModifierDef>)[id] ?? null;
}

// Validates an incoming modifierId from a request body. Returns the id if it
// matches a known modifier, otherwise null (treated as "no modifier").
export function normalizeModifierId(input: unknown): ModifierId | null {
  if (typeof input !== "string") return null;
  return (MODIFIER_IDS as readonly string[]).includes(input) ? (input as ModifierId) : null;
}
