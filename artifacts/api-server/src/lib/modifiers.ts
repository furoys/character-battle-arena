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
      `POWERS OFF — non-negotiable rule for this entire match. Every superpower, energy projection, magic spell, ki blast, technopathy, cosmic ability, mutation, healing factor, divine intervention, and supernatural property is suppressed. Fighters keep ONLY: physical conditioning, training, intelligence, and mundane gear (firearms, blades, melee weapons, body armor).
REQUIRED PER ROUND:
• At least one fighter visibly tries to call on a power and it FAILS — Goku throws a Kamehameha and gets a wisp of warm air; Thor swings Mjolnir and it's dead weight; Cyclops opens his eyes and it's just eyes; a wizard's incantation produces nothing but a hoarse cough. Name the attempt, name the failure.
• Show the dawning recognition — confusion, panic, then improvisation with fists, weapons, training.
ARENA: keep mundane terrain. No portals, no enchanted props.
WHO SHOULD LOOK LIKE THE FAVORITE: whichever side has the better hand-to-hand training, weapons, and conditioning. Cosmic gods become regular people. The locked winner already accounts for this.`,
  },
  underdog: {
    id: "underdog",
    label: "Underdog Buff",
    promptBlock:
      `UNDERDOG BUFF — the locked winner has been re-pointed at the weaker team. Reality has visibly bent in their favor for this single match. Their stats are effectively doubled and physics has chosen a side.
REQUIRED PER ROUND:
• Show the underdog doing something they should not be capable of — a normal human bracing a punch from a god and not breaking; a street-tier fighter outpacing a speedster for one critical exchange; a sword cutting through armor that should be uncuttable.
• Show the favorite's growing realization. Confidence in round 1 → confusion in the middle rounds → naked disbelief by the finish. Use a quoted moment of "this isn't possible" or "what the hell is happening" from the favorite's side.
• Never explain the buff in-universe (no "the gods favor you today" speeches). Just let it manifest as impossible competence on the underdog's side.
THE DECLARED WINNER IS THE UNDERDOG. They take the win, period — no "moral victory" endings.`,
    flipUnderdog: true,
  },
  lava_floor: {
    id: "lava_floor",
    label: "Lava Floor",
    promptBlock:
      `LAVA FLOOR — the arena floor is a churning sheet of molten orange lava. Bright glow, hissing, ankle-deep heat haze, sulfur stink, occasional fountain bursts. Combatants stand on crumbling debris islands, suspended chains, the carcasses of fallen drones, or each other. Touching the lava: armor cooks in a heartbeat, flesh vaporizes, healing factors can't outpace it.
REQUIRED PER ROUND:
• Reference the lava environment — the heat warping vision, sweat boiling on skin, an island cracking, a chunk of rock dropping in with a fat hiss, glowing splatter from a hard hit.
• At least one near-miss or fighter forced to leap to a new island. Footing is part of the violence.
• Keep mobility-poor fighters suffering for it; flight / teleport / wall-cling fighters look advantaged early.
FINISH:
• The decisive blow should put the loser INTO the lava (knockback, throw, missed jump, severed limb dragging them in). Describe the moment of contact — the scream cutting off, the surface of the lava swallowing them, the shape going under. If the locked winner is somehow themselves immune to lava, that immunity is part of the kill.`,
  },
  zero_gravity: {
    id: "zero_gravity",
    label: "Zero Gravity",
    promptBlock:
      `ZERO GRAVITY — there is no down. Fighters, debris, drifting blood, loose hair, spent shell casings all hang and drift. Newton's third law is amplified: every thrown punch sends the puncher tumbling backward in equal measure. There is no ground to push off of unless they grab onto something — a wall, a chunk of rock, the enemy.
REQUIRED PER ROUND:
• Describe the floating: hair drifting up, blood beading into spheres, debris tumbling slow, a discarded weapon spinning in place.
• Show the recoil cost — a brawler throws a haymaker and pinwheels backward out of reach; a kick sends the kicker spinning the wrong way.
• Give flight / telekinesis / jetpack / web-swinging fighters a clear advantage in positioning. Show grounded brawlers improvising — kicking off rubble, grappling the opponent for leverage, using their own corpse-weight as ballast.
FINISH:
• The decisive moment uses the lack of gravity — pinning the opponent against a free-floating slab and driving through them, or hurling them into the void where they keep going forever, or using their own missed swing's recoil to set up the kill.`,
  },
  glass_cannons: {
    id: "glass_cannons",
    label: "Glass Cannons",
    promptBlock:
      `GLASS CANNONS — every fighter on both teams hits like a god and folds like wet paper. Armor cracks like eggshell. Durability is meaningless. Healing factors are off. The FIRST clean, solid strike on any combatant takes them out, period — KO, dismemberment, or death depending on the strike.
REQUIRED:
• Total fight length: 2 to 3 rounds maximum, and the prose must feel that compressed. Round 1 is opening / first kill. Round 2 is the rest. Round 3 only if absolutely needed for the finisher.
• Each round opens with a tense reading-each-other moment, then explodes into one decisive exchange. No grinding. No long trades. No rope-a-dope.
• When a clean hit lands, the recipient goes DOWN — broken in half, head separated from shoulders, ribs exploded from a kick, dropped instantly. Describe the disproportion: a single jab caves a chest in.
• The winner's own fragility is a real threat — they win because they landed first, not because they took anything well.`,
  },
  comedy: {
    id: "comedy",
    label: "Comedy Mode",
    promptBlock:
      `COMEDY MODE — the violence is real, the stakes are real, but the staging is full physical comedy. Looney Tunes meets Hot Fuzz. Slapstick choreography drives every round.
REQUIRED PER ROUND:
• At least one slapstick beat the audience would laugh out loud at — a fighter slips on their own gore, headbutts a wall they thought was open, gets clocked by their own ricocheting projectile, mistakes their teammate for the enemy, lunges and faceplants, swings at empty air and pulls a muscle.
• At least one deadpan line of dialogue that reacts to the absurdity ("...okay, that one's on me," "I felt that in my ancestors," "my whole back hurts now"). Dry, sarcastic, never explained.
• Overconfidence MUST be punished at least once — a fighter calls their shot, then immediately eats dirt.
FINISH:
• The winning blow is still decisive but has a comedic shape — the loser is taken out by their own dropped weapon, by gravity, by a banana-peel pivot the winner improvised, by a contraption backfiring, by an enemy they didn't see coming.
• Dignity is not the goal. Make the loss humiliating AND fatal/decisive at the same time.`,
  },
  trash_talk: {
    id: "trash_talk",
    label: "Trash Talk",
    promptBlock:
      `TRASH TALK MODE — dialogue is the spine of this fight. Every single round MUST open with the attacking side delivering a vicious, character-true taunt BEFORE the first blow of that round connects.
REQUIRED PER ROUND:
• Opening taunt: at least one full sentence, in voice. Deadpool gets meta and references the fourth wall. Wolverine growls something short with "bub." Tony Stark mocks the opponent's suit / hair / brand. Vegeta brings up power levels and Saiyan pride. Joker laughs through it. Captain America picks a moral nerve. The taunt MUST land before the strike does.
• Counter-quip: after the hit lands, the opponent gets exactly one short comeback line — defiant, snarling, or wheezed through broken teeth. One line, no monologue.
• Mid-round chatter: at least one more piece of trash talk during the exchange — corner men shouting, a teammate calling a shot, a jeer from the loser's side.
FINISH:
• The decisive blow is bookended by dialogue: a final cutting line from the winner before the kill, and (if possible) a defiant or broken last word from the loser as they go down.
• The dialogue should be as memorable as the violence. Quote it. Make it quotable.`,
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
