import type { Character } from "@workspace/db";

export interface FightRound {
  round: number;
  attacker: string;
  defender: string;
  attackType: string;
  narrative: string;
  team1Hp: number;
  team2Hp: number;
}

export interface FightResult {
  winner: number;
  rounds: FightRound[];
  summary: string;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── 20 Arenas ────────────────────────────────────────────────────────────────

const arenas = [
  {
    name: "a crumbling mountain summit",
    flavor: [
      "Boulders the size of buses tumble into the void below.",
      "The ridge cracks and shifts — footing is becoming impossible.",
      "Lightning hammers the peak, drawn by the raw energy of the fight.",
      "The summit is disintegrating round by round.",
    ],
  },
  {
    name: "a sinking aircraft carrier in the North Atlantic",
    flavor: [
      "The deck tilts another ten degrees as seawater floods the lower decks.",
      "Fighter jets slide off the tilting runway and plunge into the grey sea.",
      "Freezing ocean spray lashes across the battlefield.",
      "The ship groans metallically — she won't stay afloat much longer.",
    ],
  },
  {
    name: "an active volcano crater",
    flavor: [
      "Magma geysers erupt between the fighters without warning.",
      "The crater rim crumbles into the churning lava below.",
      "Superheated air distorts every visual — nothing is where it appears.",
      "The entire volcano shudders as if enraged by the fight above it.",
    ],
  },
  {
    name: "a Walmart parking lot at 3am",
    flavor: [
      "A shopping cart rolls gently into the fray and explodes on contact with a stray energy blast.",
      "Someone is still sitting in their idling pickup truck, watching and eating a gas station hotdog.",
      "The fluorescent parking lot lights flicker and explode one by one.",
      "A seagull inexplicably dive-bombs the battlefield.",
    ],
  },
  {
    name: "a medieval castle under siege",
    flavor: [
      "Flaming catapult boulders arc overhead and crash into the battlements.",
      "The drawbridge collapses into the moat under the weight of the violence.",
      "Peasants flee screaming through the courtyard below.",
      "The portcullis tears free from its housing and smashes into the fight.",
    ],
  },
  {
    name: "a rapidly flooding subway tunnel",
    flavor: [
      "Brown water surges to knee-depth and rising fast.",
      "A runaway subway train roars through the tunnel with zero warning.",
      "Electrical conduits short-circuit and arc wildly across the flooded floor.",
      "The tunnel ceiling fractures and chunks of concrete rain down.",
    ],
  },
  {
    name: "a children's birthday party venue — now completely destroyed",
    flavor: [
      "A confetti cannon fires at maximum pressure, briefly blinding both sides.",
      "The inflatable bouncy castle has somehow survived the worst of it and is still bouncing.",
      "A seven-tier birthday cake takes a direct hit and coats the arena in frosting.",
      "The animatronic birthday bear continues singing in the corner, undeterred by the carnage.",
    ],
  },
  {
    name: "a glass-floored skyscraper observation deck, 110 floors up",
    flavor: [
      "Cracks spider-web across the glass floor — one wrong step and it's a half-mile drop.",
      "The windows blow out, creating a howling wind tunnel at altitude.",
      "A chunk of the floor gives way and falls silently into the city far below.",
      "The entire building sways in the wind like a reed, amplifying every impact.",
    ],
  },
  {
    name: "an overgrown jungle temple during a monsoon",
    flavor: [
      "The rain is so thick it's nearly impossible to see more than three meters.",
      "Ancient stone steps collapse under the force of the fighting.",
      "A massive stone idol topples and crashes through two walls.",
      "Vines and roots seem to reach for the combatants, alive with the storm's electricity.",
    ],
  },
  {
    name: "the frozen surface of Europa",
    flavor: [
      "The ice sheet splinters under their feet, revealing dark ocean below.",
      "In the near-zero gravity, shockwaves carry for miles.",
      "Jupiter looms vast and silent overhead.",
      "Something enormous moves beneath the ice. Something that is definitely not human.",
    ],
  },
  {
    name: "a decommissioned nuclear power plant",
    flavor: [
      "Warning alarms echo through every corridor — they've been going off for days.",
      "Coolant steam vents without warning from cracked pipes.",
      "Radiation meters in the fight zone are simply reading ERROR.",
      "A reactor vessel groans and then cracks — everyone has new problems.",
    ],
  },
  {
    name: "a 500-acre pumpkin farm that is aggressively on fire",
    flavor: [
      "Thousands of burning pumpkins roll across the field in every direction.",
      "A scarecrow catches fire and runs — nobody can explain this.",
      "The farmhouse explodes as the fire reaches a propane tank.",
      "A tractor, apparently self-driving, charges through the battlefield with no clear agenda.",
    ],
  },
  {
    name: "the International Space Station (interior, zero gravity)",
    flavor: [
      "In zero-G, blood and debris float in eerie slow motion.",
      "A hull breach tears part of the station open to the vacuum of space.",
      "Untethered equipment — laptops, food pouches, fire extinguishers — orbits the fight.",
      "Mission Control is screaming into their headsets. Nobody is listening.",
    ],
  },
  {
    name: "a packed NFL stadium, mid-game",
    flavor: [
      "Eighty thousand people are simultaneously fleeing and filming on their phones.",
      "The jumbotron shows the fight in real time before taking a direct hit and going dark.",
      "A hot dog vendor continues to vend, clearly in shock.",
      "One end zone has already been destroyed. The other end zone is on fire.",
    ],
  },
  {
    name: "a Viking longship in a raging storm",
    flavor: [
      "The longship crests a forty-foot wave and goes briefly airborne.",
      "Lightning splits the mast. Half the sail is gone.",
      "Ice floes collide with the hull, threatening to tear it apart.",
      "A rogue wave sweeps the deck, taking everything not nailed down into the ocean.",
    ],
  },
  {
    name: "the surface of Mars during a planet-wide dust storm",
    flavor: [
      "Visibility drops to zero — both sides are fighting blind and by instinct.",
      "The Martian dust is electrostatically charged, causing random sparks and discharges.",
      "A terraforming station collapses in the distance, slowly and completely.",
      "The storm strips paint, armor plating, and flesh with equal enthusiasm.",
    ],
  },
  {
    name: "a luxurious cruise ship casino — currently sinking",
    flavor: [
      "Poker chips and roulette balls cascade across the tilting floor.",
      "The slot machines are still paying out as the room floods from one end.",
      "A grand piano slides slowly but inevitably toward the fight.",
      "The chandelier sways violently, raining crystal on everyone below.",
    ],
  },
  {
    name: "a bottomless ancient colosseum with no exits",
    flavor: [
      "The crowd of carved stone faces watches without expression.",
      "Sand soaks dark with blood as the floor absorbs everything.",
      "The walls are too high and too smooth to climb. There is no leaving.",
      "A hidden trap door opens in the floor. Something below it is breathing.",
    ],
  },
  {
    name: "a burning rainforest during an earthquake",
    flavor: [
      "The ground splits open in jagged fissures that glow orange from below.",
      "Ancient trees — some five hundred years old — snap like toothpicks.",
      "The earthquake and the fire are each trying to win the title of 'worst thing happening right now.'",
      "A river changes course, surging through the battlefield and sweeping debris in all directions.",
    ],
  },
  {
    name: "a transdimensional void where the laws of physics are more like suggestions",
    flavor: [
      "Gravity rotates ninety degrees without warning.",
      "A copy of the arena from ten seconds ago overlaps the current one — double the hazards.",
      "Sound travels backwards here. Screams arrive before the blows that caused them.",
      "The concept of 'floor' stops being applicable for about four seconds.",
    ],
  },
];

// ─── Chaos Events ─────────────────────────────────────────────────────────────

interface ChaosEvent {
  name: string;
  narrative: (victim: string, beneficiary: string, arena: string) => string;
  hpSwing: number; // positive = hurts leading team, negative = hurts trailing team
  targetStrong: boolean; // true = prefers to target the stronger/winning team
}

const chaosEvents: ChaosEvent[] = [
  {
    name: "lightning strike",
    narrative: (v, b, arena) =>
      `CHAOS — A bolt of lightning from the storm above ${arena} hammers ${v} directly with approximately 300 million volts. ${b} did not cause this. Nature simply chose a side. ${v} is left twitching and smoking while ${b} cannot believe their luck.`,
    hpSwing: 22,
    targetStrong: true,
  },
  {
    name: "a goat",
    narrative: (v, b, arena) =>
      `CHAOS — A goat appears on ${arena}. Nobody knows where it came from. It headbutts ${v} squarely in the back of the knees with laser-targeted precision, dropping them at a critical moment. The goat trots off with the confident energy of someone who had a very specific task to complete.`,
    hpSwing: 14,
    targetStrong: false,
  },
  {
    name: "ancient curse",
    narrative: (v, b, arena) =>
      `CHAOS — Something in ${arena} is cursed. It was always cursed. ${v} triggers it by stepping on exactly the wrong tile. For three agonizing seconds, they experience every bad decision they've ever made simultaneously. ${b} watches with wide eyes and steps carefully around the cursed tile.`,
    hpSwing: 18,
    targetStrong: true,
  },
  {
    name: "rogue satellite",
    narrative: (v, b, arena) =>
      `CHAOS — A decommissioned Soviet satellite re-enters the atmosphere and strikes ${arena} with pinpoint inaccuracy that still somehow hits ${v} directly. The collision is not survivable by most metrics. ${b} picks debris out of their hair and quietly thanks the cosmos.`,
    hpSwing: 26,
    targetStrong: true,
  },
  {
    name: "uninvited spectator",
    narrative: (v, b, arena) =>
      `CHAOS — An elderly man in a fishing hat walks directly into the fight on ${arena}, seemingly lost. ${v} pulls their finishing blow at the last second to avoid hitting him. This hesitation costs them dearly. The old man disappears into a hedge. Nobody finds the hedge later.`,
    hpSwing: 12,
    targetStrong: true,
  },
  {
    name: "gravity inversion",
    narrative: (v, b, arena) =>
      `CHAOS — Gravity briefly inverts on ${arena}. ${b} — by luck, instinct, or sheer absurdity — had already left the ground at the moment of inversion. ${v}, however, was firmly planted and gets launched ceiling-first into whatever ceiling exists with full gravitational force.`,
    hpSwing: 20,
    targetStrong: true,
  },
  {
    name: "dimensional rift",
    narrative: (v, b, arena) =>
      `CHAOS — A dimensional rift tears open inches from ${v}'s face on ${arena}. A different, angrier version of ${v} from a parallel timeline reaches through and delivers a single devastating punch before the rift closes. The regular ${v} has now been beaten up by themselves and has a lot of questions.`,
    hpSwing: 24,
    targetStrong: true,
  },
  {
    name: "swarm of bees",
    narrative: (v, b, arena) =>
      `CHAOS — Sixty thousand bees arrive at ${arena} simultaneously and select ${v} with the unified democratic conviction of a hive that has decided. The bees have no agenda beyond justice. ${b} is not stung once. ${v} cannot stop running in circles for a full fifteen seconds.`,
    hpSwing: 16,
    targetStrong: false,
  },
  {
    name: "betrayal by the arena itself",
    narrative: (v, b, arena) =>
      `CHAOS — ${arena} seems to actively choose a side. The ground shifts, a wall falls, a trap opens — all targeting ${v} with an intentionality that suggests the environment itself has opinions about this fight. ${b} makes a mental note to fight here again sometime.`,
    hpSwing: 18,
    targetStrong: true,
  },
  {
    name: "inspirational music",
    narrative: (v, b, arena) =>
      `CHAOS — Someone on ${arena}'s perimeter starts playing eye-of-the-tiger on a portable speaker directly at ${b}. The effect is medically inexplicable but impossible to deny — ${b} attacks with sudden, renewed fury while ${v} struggles to focus against the tonal assault.`,
    hpSwing: 14,
    targetStrong: true,
  },
  {
    name: "spontaneous sinkholes",
    narrative: (v, b, arena) =>
      `CHAOS — The ground beneath ${v}'s feet on ${arena} gives way — a sinkhole opens with zero warning and swallows ${v} to the waist. They spend two rounds extracting themselves, during which ${b} respectfully (and then disrespectfully) continues fighting.`,
    hpSwing: 20,
    targetStrong: false,
  },
  {
    name: "rogue energy discharge",
    narrative: (v, b, arena) =>
      `CHAOS — The sheer density of power being thrown around ${arena} reaches a critical threshold. A feedback loop of discharged energy spontaneously forms and detonates directly above ${v}. This is technically ${v}'s fault for being too powerful in an enclosed space.`,
    hpSwing: 28,
    targetStrong: true,
  },
  {
    name: "intervention from a talking animal",
    narrative: (v, b, arena) =>
      `CHAOS — A crow lands on a piece of debris on ${arena}, looks directly at ${v}, and says — clearly, in the local language — "Not today." It then divebombs ${v}'s face with surgical precision. The crow has not explained itself and cannot be found for comment. ${b} will remember this crow forever.`,
    hpSwing: 15,
    targetStrong: false,
  },
  {
    name: "time hiccup",
    narrative: (v, b, arena) =>
      `CHAOS — Time stutters on ${arena}. ${v} gets stuck in a 0.8-second loop and throws the same punch at empty air four times in rapid succession while ${b} — who is outside the loop — has an entire uninterrupted window of opportunity and uses all of it.`,
    hpSwing: 22,
    targetStrong: true,
  },
  {
    name: "catastrophic structural failure",
    narrative: (v, b, arena) =>
      `CHAOS — A load-bearing element of ${arena} finally gives up. The section ${v} is standing on drops six meters before catching on a lower ledge. ${v} survives but is briefly occupied with not falling to their death, which costs them the momentum of the round.`,
    hpSwing: 18,
    targetStrong: false,
  },
  {
    name: "the fight goes viral",
    narrative: (v, b, arena) =>
      `CHAOS — The fight is being livestreamed and ${v} has just recognized their face on a phone screen. The comments are not kind. The awareness of being judged publicly causes a critical hesitation in ${v}'s movements that ${b} exploits immediately and without mercy or sympathy.`,
    hpSwing: 13,
    targetStrong: true,
  },
  {
    name: "weather event",
    narrative: (v, b, arena) =>
      `CHAOS — The weather on ${arena} changes instantaneously from whatever it was to something ${v} is specifically vulnerable to. This is either cosmic irony or targeted atmospheric weaponization — either way, ${v} is dealing with hail, UV radiation, or extreme humidity at exactly the wrong time.`,
    hpSwing: 19,
    targetStrong: true,
  },
  {
    name: "a second goat",
    narrative: (v, b, arena) =>
      `CHAOS — The first goat returns. It has brought a friend. They operate as a unit. ${v} is headbutted from two different angles in rapid succession on ${arena}. The goats share a meaningful look, then disperse. The fight continues.`,
    hpSwing: 17,
    targetStrong: false,
  },
  {
    name: "power nullification field",
    narrative: (v, b, arena) =>
      `CHAOS — A localized power nullification field activates on ${arena} — source unknown. For exactly one round, ${v}'s signature abilities simply don't work. All that training, all those powers — temporarily offline. ${b} has never had a better window. They use it.`,
    hpSwing: 30,
    targetStrong: true,
  },
  {
    name: "the floor is actually lava",
    narrative: (v, b, arena) =>
      `CHAOS — Part of the floor on ${arena} is, at this moment, literally lava. This is not a game. ${v} has just stepped in it. The good news is they're still in the fight. The bad news is everything else about this situation.`,
    hpSwing: 16,
    targetStrong: false,
  },
];

// ─── Betrayal Events ──────────────────────────────────────────────────────────

interface BetrayalEvent {
  narrative: (traitor: string, victim: string, justification: string) => string;
  hpSwing: number; // damage dealt to the traitor's own team
}

const betrayalTemplates: BetrayalEvent[] = [
  {
    narrative: (traitor, victim, why) =>
      `BETRAYAL — ${traitor} stops mid-fight, turns, and attacks ${victim} on their own team. ${why} The blow lands clean. Allies and enemies alike stare in disbelief.`,
    hpSwing: 20,
  },
  {
    narrative: (traitor, victim, why) =>
      `BETRAYAL — Without warning, ${traitor} redirects a full-power attack toward ${victim} — their own teammate. ${why} The damage is severe and the alliance may not recover.`,
    hpSwing: 22,
  },
  {
    narrative: (traitor, victim, why) =>
      `BETRAYAL — ${traitor} has been calculating this for several rounds. The moment comes and ${traitor} drives a devastating blow into ${victim}'s exposed flank. ${why} The crowd doesn't know whether to gasp or applaud.`,
    hpSwing: 18,
  },
  {
    narrative: (traitor, victim, why) =>
      `BETRAYAL — ${traitor} pauses, meets ${victim}'s eyes, and says something too quiet to hear — then hits them harder than anyone has hit anything all fight. ${why} Nobody on either side moves for a full second.`,
    hpSwing: 24,
  },
];

const betrayalJustifications = [
  (traitor: string) =>
    `${traitor} has decided that winning with this team is worth less than what they'd gain by switching sides.`,
  (traitor: string) =>
    `${traitor} was never fully committed to this alliance — only to their own survival.`,
  (traitor: string) =>
    `${traitor} sensed an opportunity and has the moral flexibility to take it.`,
  (traitor: string) =>
    `${traitor} privately calculated that the enemy team is more likely to win and adjusted accordingly.`,
  (traitor: string) =>
    `${traitor} was paid — in some currency, metaphysical or otherwise — to do exactly this.`,
  (traitor: string) =>
    `${traitor} doesn't work well with others. This was always going to happen eventually.`,
  (traitor: string) =>
    `${traitor} received a psychic vision. The vision said: hit ${traitor === "them" ? "your allies" : "them"}. ${traitor} trusts the vision.`,
  (traitor: string) =>
    `${traitor} has a deeply complicated history with their teammate that just became relevant.`,
  (traitor: string) =>
    `${traitor} saw their teammate hesitate two rounds ago and has never trusted them since.`,
  (traitor: string) =>
    `The chaos of this arena has cracked something fundamental in ${traitor}'s decision-making.`,
];

// ─── Power Tag System ─────────────────────────────────────────────────────────

const TAG_PATTERNS: [string, RegExp][] = [
  ["fire",      /\b(fire|flame|inferno|hellfire|pyro|scorch|ember|heat blast)\b/i],
  ["ice",       /\b(ice|freeze|cryo|frost|cold|glacial|absolute zero|cryomancer)\b/i],
  ["lightning", /\b(lightning|thunder|electric|volt|shock|plasma|electrokinesis)\b/i],
  ["magic",     /\b(magic|sorcery|spell|arcane|mystic|enchant|witch|wizard|curse|hex|dark arts|chaos magic|eldritch)\b/i],
  ["psychic",   /\b(psychic|telekinesis|telepathy|mind control|mental|psionic|mind reading|thought)\b/i],
  ["immortal",  /\b(immortal|unkillable|cannot be killed|cannot die|healing factor|regenerat|resurrect|undead|back from the dead|infinite lives|true immortality)\b/i],
  ["reality",   /\b(reality|dimensional|chaos magic|probability|warp|quantum|rewrite|reshape)\b/i],
  ["tech",      /\b(power suit|battle suit|cybernetic|android|mech\b|robot|arc reactor|nanotech|exo.?suit|weapons system)\b/i],
  ["speedster", /\b(speed force|mach \d|supersonic|light speed|fastest alive|zero to|move at light)\b/i],
  ["giant",     /\b(300 meter|colossal|mountain-sized|planet-wide|kaiju|city block|the size of)\b/i],
  ["cosmic",    /\b(cosmic|galactic|universe\b|infinity\b|power cosmic|planet.eating|devourer|omnipotent|all-powerful)\b/i],
  ["vampire",   /\b(vampire|blood drain|daywalker|blood.drinking|undying)\b/i],
  ["metal",     /\b(magnetic|metal control|magnetism|iron manipulation|adamantium|vibranium control)\b/i],
  ["poison",    /\b(venom|poison|toxin|acid blood|acid spit|corrosive)\b/i],
  ["undead",    /\b(undead|lich|necromancy|death magic|death god|death energy|corpse)\b/i],
  ["soul",      /\b(soul steal|soul drain|soul manipulation|absorb soul|hell.?fire soul|soul power)\b/i],
  ["time",      /\b(time travel|time stop|temporal|time loop|stop time|rewind time)\b/i],
  ["shadow",    /\b(shadow|darkness|void|dark energy|shadow manipulation|shade)\b/i],
  ["water",     /\b(water control|hydrokinesis|ocean|aquatic|tidal|sea power)\b/i],
  ["wind",      /\b(wind|air control|storm|tornado|hurricane|aerokinesis|gale)\b/i],
];

function getTags(char: Character): Set<string> {
  // Only index ABILITIES and DESCRIPTION for attacker power tags — NOT weaknesses.
  // Weaknesses are checked separately on the defender side in getWeaknessMatchNote.
  const text = `${char.specialAbility} ${char.description}`;
  const tags = new Set<string>();
  for (const [tag, pattern] of TAG_PATTERNS) {
    if (pattern.test(text)) tags.add(tag);
  }
  return tags;
}

// ─── Fighting Style Detection ─────────────────────────────────────────────────

// Tags whose primary expression is ranged/projected — NOT physical melee
const RANGED_POWER_TAGS = new Set([
  "fire", "ice", "lightning", "magic", "psychic", "cosmic",
  "reality", "wind", "water", "shadow", "time", "undead", "soul",
]);

// Characters who cannot walk/run — wheelchair, paralysis, etc.
const IMMOBILE_PATTERNS = /\b(wheelchair|paralyz|cannot walk|confined to|paraplegic|immobile|levitat)\b/i;

function getFightStyle(char: Character, tags: Set<string>): "melee" | "ranged" {
  for (const t of RANGED_POWER_TAGS) {
    if (tags.has(t)) return "ranged";
  }
  return "melee";
}

function isImmobile(char: Character): boolean {
  const text = `${char.description} ${char.specialAbility}`;
  return IMMOBILE_PATTERNS.test(text);
}

// ─── Move Name Extraction ─────────────────────────────────────────────────────
// Returns a SHORT move name (2–5 words) that can appear naturally in action prose.
// Cycles through semicolon-separated abilities so characters rotate their moves.

const TRAIT_ONLY_PATTERNS = /^(true immortality|cannot be killed|cannot die|unkillable|immortal|infinite lives|absolute immortality|virtually unkillable|healing factor|near-total invulnerability|invulnerability|invincible)/i;

function getMoveName(char: Character, variant: number): string {
  const raw = char.specialAbility.trim();
  // Semicolons separate distinct moves — cycle through them
  const semiClauses = raw.split(";").map(c => c.trim()).filter(c => c.length > 3);
  const actionClauses = semiClauses.filter(c => !TRAIT_ONLY_PATTERNS.test(c));
  let chosen: string;
  if (actionClauses.length > 1) {
    chosen = actionClauses[variant % actionClauses.length]!;
  } else {
    // Comma-separated: take first non-trait item
    const commas = raw.split(",").map(c => c.trim()).filter(c => c.length > 3);
    chosen = commas.find(c => !TRAIT_ONLY_PATTERNS.test(c)) ?? commas[0] ?? raw;
  }
  // Trim to first comma-chunk and cap at 5 words
  const firstChunk = chosen.split(",")[0]!.trim();
  const words = firstChunk.split(/\s+/);
  return words.slice(0, 3).join(" ").toLowerCase();
}

// ─── No-Repeat Template Picker ────────────────────────────────────────────────
// Tracks which templates have fired this fight so we never see the same one twice.
// Resets automatically when the pool is exhausted.
function pickFresh<T>(arr: T[], used: Set<number>): T {
  const available = arr.map((_, i) => i).filter(i => !used.has(i));
  if (available.length === 0) {
    used.clear();
    const i = Math.floor(Math.random() * arr.length);
    used.add(i);
    return arr[i]!;
  }
  const idx = available[Math.floor(Math.random() * available.length)]!;
  used.add(idx);
  return arr[idx]!;
}

function getDominantStat(char: Character): "strength" | "speed" | "intelligence" | "durability" {
  const { strength, speed, intelligence, durability } = char;
  const high = Math.max(strength, speed, intelligence, durability);
  if (high === strength) return "strength";
  if (high === speed) return "speed";
  if (high === intelligence) return "intelligence";
  return "durability";
}

// ─── Interaction Detection ────────────────────────────────────────────────────

function getWeaknessMatchNote(
  attacker: Character,
  atkTags: Set<string>,
  defender: Character,
  defTags: Set<string>,
): string | null {
  const defWeakness = defender.weaknesses.toLowerCase();
  const n = attacker.name;
  const d = defender.name;

  // Immortal DEFENDER reaction — always fires (most important narrative beat)
  if (defTags.has("immortal")) {
    return pickRandom([
      `${d} gets back up. Already.`,
      `${d} hits the ground. Gets back up. The wounds are already closing.`,
      `${d} takes the full hit. Shakes it off. Keeps coming.`,
      `${d} doesn't go down. Or goes down and gets right back up. Same outcome.`,
      `${d} is up again. ${n} is going to have to hit them a lot harder than that.`,
      `The damage lands. ${d}'s body just doesn't agree that it matters.`,
    ]);
  }

  // Gated interactions — only fire ~55% of the time to avoid repetition
  if (Math.random() > 0.55) return null;

  // Fire vs ice weakness
  if (atkTags.has("fire") && /fire|heat|flame|burn/.test(defWeakness))
    return pickRandom([
      `The fire hits ${d} somewhere that actually matters — listed under known vulnerabilities for a reason.`,
      `${d}'s defenses weren't designed for this temperature. The difference is visible.`,
      `Heat at this level gets through in ways that physical resistance can't compensate for.`,
    ]);

  // Ice vs fire weakness
  if (atkTags.has("ice") && /ice|cold|freeze|frost/.test(defWeakness))
    return pickRandom([
      `The cold gets into ${d} in ways that armor and rage and strength simply can't stop.`,
      `${d}'s power runs hot. Cold at this magnitude causes cascading failure across all of it.`,
      `The temperature differential is catastrophic for ${d}. It shows.`,
    ]);

  // Magic vs magic-vulnerable
  if (atkTags.has("magic") && /magic|sorcery|mystical|arcane|supernatural/.test(defWeakness))
    return pickRandom([
      `The sorcery bypasses everything ${d} trained to defend against — built for physical threats, not this.`,
      `${d}'s protection has a specific gap shaped exactly like sorcery. ${n} found it.`,
      `Magic operates on a register ${d}'s defenses were never calibrated for. It shows.`,
    ]);

  // Lightning vs electrical weakness
  if (atkTags.has("lightning") && /lightning|electric|shock|emp/.test(defWeakness))
    return pickRandom([
      `The electrical discharge finds every gap simultaneously. ${d} has no answer for current that moves faster than thought.`,
      `${d}'s systems weren't hardened against this. The discharge cascades through everything at once.`,
      `The conductivity issue is real and immediate. ${d} did not plan for this.`,
    ]);

  // Psychic vs mind-weak
  if (atkTags.has("psychic") && /psychic|mind|mental|willpower/.test(defWeakness))
    return pickRandom([
      `${d}'s body is prepared. Their mind is not. The psychic assault finds the soft center behind all that power.`,
      `Physical defense means nothing here. The attack bypasses every layer ${d} ever built.`,
      `${d} can tank almost anything physical. Almost.`,
    ]);

  // Cosmic vs cosmic-weak
  if (atkTags.has("cosmic") && /cosmic|energy|overwhelm/.test(defWeakness))
    return pickRandom([
      `Power at the cosmic scale wasn't something ${d} was designed to absorb. The math doesn't work.`,
      `${d} can survive a lot. This is calibrated at a level that "a lot" doesn't cover.`,
    ]);

  // Metal control vs tech/armor
  if (atkTags.has("metal") && (defTags.has("tech") || /armor|metal|iron|steel/.test(defWeakness)))
    return pickRandom([
      `${n} doesn't need to touch ${d} — they reach out and rearrange the metal in their armor from a distance.`,
      `Every ferrous component in ${d}'s setup becomes a liability the moment ${n} focuses on it.`,
      `The armor meant to protect ${d} is now working against them. That's a ${n} special.`,
    ]);

  // Reality warping vs non-reality
  if (atkTags.has("reality") && !defTags.has("reality") && !defTags.has("cosmic"))
    return pickRandom([
      `${d} attempts to respond. Reality disagrees. ${n} rewrote the parameters of what ${d}'s attack was allowed to do mid-swing.`,
      `The rules of the fight just changed. ${d} wasn't consulted. ${n} was.`,
    ]);

  // Giant vs normal-sized
  if (atkTags.has("giant") && !defTags.has("giant") && !defTags.has("cosmic"))
    return pickRandom([
      `The shockwave from a being of ${n}'s scale alone would end most fights. The actual strike is almost secondary.`,
      `${d} is operating on a completely different scale of threat. The gap is not theoretical.`,
    ]);

  // Speedster vs slow
  if (atkTags.has("speedster") && defender.speed < 65)
    return pickRandom([
      `${d} didn't see it start, let alone finish. Complete before any signal traveled from eye to brain to body.`,
      `Reaction time becomes irrelevant at this velocity. ${d} is defending against something that was already over.`,
    ]);

  // Cosmic/scale defender vs non-cosmic attacker (reverse: attacker is puny)
  if (defTags.has("cosmic") && !atkTags.has("cosmic") && !atkTags.has("reality"))
    return pickRandom([
      `Against a being of ${d}'s scale, that attack makes a mark. A small mark on an incomprehensibly large target — but something.`,
      `${d} registers the hit. Notes it. Files it away somewhere between inconvenience and mild concern.`,
      `The hit connects. ${d} doesn't slow down.`,
      `${d} takes it. Keeps moving. The damage is real — it's just not enough.`,
      `That would end anyone else. ${d} rolls their neck and looks back at ${n}.`,
      `${d} felt that one. Whether ${d} cares about it is a different question.`,
    ]);

  // Poison vs biological weakness
  if (atkTags.has("poison") && /poison|toxin|biological/.test(defWeakness))
    return pickRandom([
      `The toxin finds its way in regardless of armor or power level. Biology doesn't care about fighting ability.`,
      `${d}'s resilience is physical. The toxin operates at a biological level that physical strength cannot defend.`,
    ]);

  return null;
}

// ─── Attack Description Builder ───────────────────────────────────────────────
// Returns a short (≤ 10 word) physical attack phrase: "[verb] [target/move]"
// These plug into templates as: "${atk} ${action}."

function buildAttackAction(attacker: Character, atkTags: Set<string>, variant: number): string {
  const move = getMoveName(attacker, variant);
  const dominant = getDominantStat(attacker);

  if (atkTags.has("fire")) {
    return pickRandom([
      `fires ${move} directly into their chest`,
      `hits them with a concentrated blast of ${move}`,
      `opens up with ${move} at point-blank range`,
      `launches ${move} — the heat scorches everything between them`,
      `drives ${move} through their guard before they can react`,
      `unleashes ${move} in a focused column that punches clean through`,
    ]);
  }
  if (atkTags.has("ice")) {
    return pickRandom([
      `locks their legs in ice and hits them while they're frozen`,
      `hits them with ${move} and the impact shatters on contact`,
      `encases their arms in frost and drives the real strike through`,
      `blasts them with ${move} — they skid backward, half-frozen`,
      `hits them with ${move} and the follow-up before they can break free`,
    ]);
  }
  if (atkTags.has("lightning")) {
    return pickRandom([
      `hits them with a lightning strike before they can move`,
      `sends ${move} through them — the bolt gets there before the warning does`,
      `calls down ${move} with pinpoint accuracy`,
      `chains ${move} through the arena and into them`,
      `fires ${move} in a burst that pins them to the ground`,
      `hits them three times with ${move} — the chain jumps between impacts`,
    ]);
  }
  if (atkTags.has("magic") || atkTags.has("reality")) {
    return pickRandom([
      `hits them with ${move} from an angle that shouldn't exist`,
      `fires ${move} — the blast curves around their guard`,
      `blasts them with ${move}, the impact warping the space around it`,
      `snaps ${move} out — precise, immediate, no room to counter`,
      `drives ${move} through every layer of magical shielding`,
      `fires ${move} from close range — no time to dodge, no room to block`,
    ]);
  }
  if (atkTags.has("psychic")) {
    return pickRandom([
      `hits them with a psychic shockwave — they seize up mid-step`,
      `locks them in place with ${move} and drives the real strike through`,
      `overloads their senses with ${move} — they can't process the follow-up`,
      `hits them where armor can't reach: the inside of their own head`,
      `drives ${move} through their mental defenses and scrambles their focus`,
      `freezes their motor control with ${move} — they can't swing back`,
    ]);
  }
  if (atkTags.has("cosmic")) {
    return pickRandom([
      `hits them with ${move} at a scale that rewrites local geography`,
      `releases ${move} — the arena is a rounding error`,
      `applies ${move} the way a planet applies gravity: inevitably`,
      `hits them with ${move} — the surrounding landscape craters outward`,
      `fires ${move} with the casual indifference of something that eats stars`,
      `unleashes ${move} — the shockwave alone flattens everything within range`,
      `channels ${move} and the output is measured in geological damage`,
      `lets ${move} loose at close range — there was no surviving that gap`,
      `slams ${move} down like a verdict — no appeal, no block, no answer`,
      `hammers them with ${move} — the arena registers it before they do`,
    ]);
  }
  if (atkTags.has("speedster")) {
    return pickRandom([
      `hits them eight times before they process the first`,
      `blurs through and hits from three angles before the exchange even starts`,
      `laps the arena and hits them from behind — they're still turning`,
      `hits them with ${move}, resets, hits again — four strikes in one breath`,
      `lands ${move} from inside their guard before their guard knows it's open`,
      `fires ${move} so fast the afterimage throws the block in the wrong direction`,
    ]);
  }
  if (atkTags.has("giant")) {
    return pickRandom([
      `drops a fist from height — the shockwave alone throws them backward`,
      `stamps them into the ground and the crater does the rest`,
      `brings ${move} down from above — the impact registers on seismographs`,
      `swings ${move} and the displacement of air is its own attack`,
      `grabs them — they're the size of a toy — and throws them into the arena wall`,
    ]);
  }
  if (atkTags.has("metal")) {
    return pickRandom([
      `tears every metal surface in the arena into shrapnel and drives it all at once`,
      `pulls the iron out of the air and slams it into them`,
      `hits them with ${move} — then uses the same power to pin the limbs that try to block`,
      `rearranges the arena's metal into a cage and hits from the inside`,
    ]);
  }
  if (atkTags.has("shadow")) {
    return pickRandom([
      `strikes from inside their shadow — they never saw the angle`,
      `dissolves into the dark and hits from a direction that shouldn't exist`,
      `materializes behind them and hits before they can turn`,
      `uses ${move} to attack from everywhere at once and nowhere specific`,
    ]);
  }
  if (atkTags.has("vampire")) {
    return pickRandom([
      `closes the distance in an instant and hits them at the throat`,
      `hits them with ${move} with the cold precision of something centuries old`,
      `moves through them like they're standing still — hits twice on the way out`,
    ]);
  }
  if (atkTags.has("undead") || atkTags.has("soul")) {
    return pickRandom([
      `hits them with ${move} — power that comes from somewhere past the living`,
      `draws on ${move} and the air between them goes cold`,
      `hits them with something that isn't quite force — it's closer to inevitability`,
    ]);
  }
  if (atkTags.has("poison")) {
    return pickRandom([
      `makes contact — a scratch is all it takes for ${move} to start`,
      `hits them once and steps back — the damage is already inside them`,
      `gets past their guard and makes skin contact. That's the whole attack.`,
    ]);
  }
  if (atkTags.has("time")) {
    return pickRandom([
      `stops time, repositions, and hits them from the perfect angle`,
      `rewinds two seconds and takes the hit they didn't defend`,
      `pauses the exchange and rearranges the outcome`,
      `sees the counter coming, skips past it, and hits them on the other side`,
    ]);
  }
  if (atkTags.has("wind") || atkTags.has("water")) {
    return pickRandom([
      `drives a column of ${move} into them from the side`,
      `wraps them in ${move} and slams them into the nearest wall`,
      `hits them with ${move} from every direction at once`,
      `weaponizes the arena itself — ${move} closes off every escape and hits`,
    ]);
  }

  // Stat-based fallback — short and physical
  const byDominant: Record<string, string[]> = {
    strength: [
      `drives a straight into their jaw that snaps their head back`,
      `grabs them and slams them into the ground`,
      `charges through their guard and hits them at full extension`,
      `catches them across the temple — the crack echoes across the arena`,
      `lifts them and throws them across the arena`,
      `hits them with ${move} and the shockwave craters the ground`,
    ],
    speed: [
      `hits them three times before the first one registers`,
      `blurs past and hits from behind — they're still turning when the second lands`,
      `lands four strikes in the time it takes to blink`,
      `hits them with ${move}, retreats, hits again before they can answer`,
    ],
    intelligence: [
      `times the counter perfectly and hits through their attack`,
      `reads the telegraphed strike, sidesteps, and hits at the pivot`,
      `baits the block and hits the arm that goes up — then hits the opening`,
      `finds the gap in their guard and places ${move} exactly there`,
    ],
    durability: [
      `walks through their guard and hits them at point-blank`,
      `takes a hit mid-approach and hits back harder without slowing down`,
      `shrugs off the defense and drives through with full force`,
      `doesn't stop for the block — hits them through it`,
    ],
  };
  return pickRandom(byDominant[dominant] ?? byDominant.strength!);
}

// ─── Combat Narrative Templates ───────────────────────────────────────────────
// MK / action-cutscene style: 2–3 short sentences of physical cause-and-effect.
// Template signature: (attacker, defender, action, arena) => string

const openingTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} hits first. The moment both sides land on ${env}, ${atk} ${action}. ${def} goes sliding backward — first blood is already running.`,
  (atk: string, def: string, action: string, env: string) =>
    `No wind-up. No warning. ${atk} ${action} the instant ${def} hits ${env}. ${def} goes flying, crashes into the terrain, and gets up slower than expected.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} charges the moment both sides touch ${env}. ${atk} ${action}. ${def} takes the hit clean and the ground craters under them.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} is still orienting on ${env} when ${atk} ${action}. The impact kicks up a shockwave. ${def} hits something solid and doesn't bounce.`,
  (atk: string, def: string, action: string, env: string) =>
    `The fight starts before anyone gives a signal. ${atk} ${action} — immediately, no setup, no posturing. ${def} is sent skidding and the tone is set.`,
];

const midTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} ${action}. ${def}'s guard shatters. They go down hard, skid across ${env}, and come up bleeding.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} hesitates. ${atk} ${action}, snapping ${def}'s head back. ${def} cartwheels across ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} grabs ${def} and drives them headfirst into ${env}. Twice. Then ${atk} ${action} at point-blank range. ${def} tumbles away trailing blood.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} feints left. ${def} bites. ${atk} ${action} from the right — ${def} never saw it. They hit the ground of ${env} hard.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} lands something — barely. ${atk} takes it and answers: ${action}. Faster than the hit ${def} just threw. ${def} staggers with wounds that weren't there two seconds ago.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} catches ${def} mid-swing. ${atk} ${action} and the blow multiplies by ${def}'s own momentum. ${def} is driven into the nearest solid thing ${env} has to offer.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} doesn't let ${def} breathe. ${atk} ${action} before ${def} can reset. The hit folds them around the point of impact and they slide across ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} tries to hold ground. ${atk} ${action} — and ${def} is off their feet. They land twenty meters away on ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} commits to what they think is the killing blow. ${atk} sidesteps, ${action}, and ${def} eats all of it. They bounce off the terrain of ${env} and stay down for a beat.`,
  (atk: string, def: string, action: string, env: string) =>
    `Three seconds locked together, neither budging. Then ${atk} ${action} — the gap is found. ${def} is blown clear, skipping across ${env}.`,
];

const counterTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${def} moves in to finish it. ${atk} lets them get close — then ${action} from inside their guard. ${def} never had the angle to defend it. They go down across ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} is bleeding, stumbling. ${def} commits to the close-out. ${atk} ${action} at the exact moment ${def} overextends. The counter lands clean and ${def} is sent back the way they came.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} thought they had this. ${atk} was baiting the whole time. ${atk} ${action} through the gap ${def} left while going for the kill — and the tables turn, violently, on ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} absorbs one more hit. Takes the pain. ${atk} ${action} as a counter — short, ugly, from a direction ${def} forgot to cover. It lands. ${def} drops.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} goes for the big hit. ${atk} rolls with it, stays on their feet, and ${action} before ${def} can pull back. The reversal is sudden and brutal. Both of them know the fight just shifted on ${env}.`,
];

const closingTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${def} drops to a knee on ${env}. ${atk} ${action} point-blank. ${def} hits the ground and the fight ends there.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} is battered — doesn't matter. ${atk} ${action} one final time. ${def} goes down and stays down. It's over.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} is finished and they know it. ${atk} ${action} — clean, final, no hesitation. ${def} hits the floor of ${env} and doesn't move.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} grabs ${def}, drives them into ${env} one last time, then ${action} at zero distance. ${def} doesn't get up.`,
  (atk: string, def: string, action: string, env: string) =>
    `Both still standing. Barely. ${atk} ${action} in a final surge. ${def} goes down. It's done.`,
];

// ─── Ranged / Caster Narrative Templates ─────────────────────────────────────
// Attacker stays at range — no grabbing, no physical contact.

const rangedOpeningTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} doesn't advance. The moment both sides land on ${env}, ${atk} ${action}. ${def} is hit before they've taken a step — driven backward into the terrain.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} barely sets foot on ${env} before ${atk} ${action}. The shot arrives before ${def} can track the source. They land hard and wonder if closing the gap is even possible.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} doesn't move. ${atk} ${action} from full range the instant ${def} appears on ${env}. The impact kicks up a crater. ${def} hits something solid.`,
  (atk: string, def: string, action: string, env: string) =>
    `First move goes to ${atk}. ${atk} ${action} before ${def} can set their footing on ${env}. The blast knocks ${def} off their feet — they skid to a halt, bleeding.`,
];

const rangedMidTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} ${action}. ${def} has no cover. The hit lands clean and ${def} skids across ${env} trailing smoke.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} tries to close the gap. ${atk} ${action} mid-charge. ${def} is stopped cold and thrown backward.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} hesitates for a half-second. ${atk} ${action} during that half-second. ${def} doesn't get a third of the way through the dodge.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} reads the angle on ${env} and ${action}. ${def} is caught with nowhere to deflect it. The terrain craters outward.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} is still advancing when ${atk} ${action}. The blast multiplies by ${def}'s own forward momentum. They go down harder for it.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} ${action} from the other side of ${env}. Distance is irrelevant. ${def} takes it like they were standing right in front.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} ${action}. ${def} blocks — it doesn't matter. The force blows through the block and ${def} slides back into the wall of ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} bloodied but still coming. ${atk} ${action} before they cover the distance. ${def} goes down again on ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `Standoff across ${env}. Neither moving. Then ${atk} ${action} — the edge is found. ${def} is blown clear.`,
];

const rangedCounterTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${def} moves in to finish it. ${atk} ${action} at the worst possible moment for ${def}. The shot catches them mid-charge. They go down on ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} was fading. ${def} pushes for the close-out. ${atk} ${action} as the counter — precise, full power. ${def} takes it and hits the terrain hard.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} thought this was over. ${atk} ${action} through the gap ${def} left reaching for the finish. The tables turn on ${env}, violently.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} takes one more hit. Stays standing. ${atk} ${action} as the answer — from range, full force. ${def} eats every bit of it.`,
];

const rangedClosingTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${def} is on their knees in ${env}. ${atk} ${action} one final time. ${def} doesn't move. It's done.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} is running on fumes. Doesn't matter. ${atk} ${action} — last shot, full power. ${def} goes down and stays down.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} is finished. ${atk} ${action} at maximum range. The blast lands clean on ${env}. ${def} hits the ground and the fight is over.`,
  (atk: string, def: string, action: string, env: string) =>
    `Both of them barely standing. ${atk} ${action} in a final surge. ${def} goes down. Done.`,
];

// ─── Extended Mid Templates: Tone Variants ───────────────────────────────────

const brutalMidTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} ${action}. ${def} blocks — ${atk} breaks through the block. The hit lands anyway. ${def}'s knees buckle on ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} hits ${def}. ${def} gets up. ${atk} hits again before they're upright. ${atk} ${action} — one more. ${def} doesn't get up as fast this time.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} tries to reset. ${atk} ${action} before the reset finishes. The second hit is worse than the first. ${env} registers every impact.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} and ${def} trade. ${atk} is winning the trade. ${atk} ${action} and the math of this exchange only goes one way. ${def} is taking more hits than they're landing.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} ${action}. No technique — just damage. ${def} has no clever answer because there isn't one. The hit lands like a structural problem.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} hits. Follows up. Hits again. ${atk} ${action} into the exchange and ${def} is at the center of a storm that isn't stopping.`,
];

const tacticalMidTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} drops their guard on purpose. ${def} takes the bait. ${atk} ${action} as ${def} overextends — the whole sequence was built for this.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} has been watching ${def}'s patterns. This round, the pattern gets punished. ${atk} ${action} at the exact moment ${def} commits to the wrong read.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} waits. ${def} thinks they've taken control. ${atk} ${action} from the spot ${def} forgot to cover. The hit lands like it was always going to.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} feints. ${def} bites. ${atk} ${action} from the opposite side — ${def} had been watching the wrong hand the whole exchange.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} is trying to read ${atk} in real time. ${atk} ${action} as the answer to a counter ${def} hasn't thrown yet. When ${def} throws it, the window is already closed.`,
  (atk: string, def: string, action: string, env: string) =>
    `Three rounds of setup. Half a second of execution. ${atk} ${action} from the angle ${def}'s training never covered.`,
];

const dominantMidTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${def} tries to reset. ${atk} doesn't let them. ${atk} ${action} before ${def} is back on their feet. The gap keeps building.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} throws a counter. ${atk} walks through it and ${action}. ${def}'s counter didn't slow anything down.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} absorbs it. Gets up. ${atk} hits them again. Then ${atk} ${action} — another. ${def} is running out of ways to keep absorbing this.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} has ${def} on the back foot and knows it. ${atk} ${action} — not flashy, just relentless — and ${def} is losing ground they won't recover on ${env}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} can't find an angle. Every reset, ${atk} is already there. ${atk} ${action} and there's nowhere to go. The pressure is total.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} is trying everything. ${atk} has an answer for everything. ${atk} ${action} and the answer this round is the same as every round: forward, direct, followed up.`,
];

const desperateMidTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} is getting taken apart. Then — ${atk} ${action} from nowhere. A shot that shouldn't have connected. It connects. ${def} didn't see it.`,
  (atk: string, def: string, action: string, env: string) =>
    `${def} moves in to finish it. ${atk} ${action} from the collapse — short-range, ugly, desperate. It connects. Both of them are surprised.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} is losing. They know it. Then ${atk} ${action} and the momentum on ${env} wobbles for a second. Not over. Not yet.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} has taken three hits that should have ended this. They haven't. ${atk} ${action} from the edge of standing and drives it home. ${def} wasn't expecting that to still be in them.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} shouldn't still be fighting. The body says stop. ${atk} ${action} with whatever's left — and whatever's left is more than ${def} planned for.`,
  (atk: string, def: string, action: string, env: string) =>
    `Cornered on ${env}, bleeding — ${atk} ${action} because it's the only move left. It's not clean. It doesn't have to be. It lands.`,
];

const environmentalMidTemplates = [
  (atk: string, def: string, action: string, env: string) =>
    `${atk} shoves ${def} into ${env}. The arena does some of the work. ${atk} ${action} at the same moment. ${def} was fighting two things at once.`,
  (atk: string, def: string, action: string, env: string) =>
    `The ground on ${env} shifts under ${def}'s feet. ${atk} doesn't wait for them to recover — ${atk} ${action} before ${def} can get their footing back.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} drives ${def} toward the worst part of ${env} on purpose. When the arena delivers its hazard, ${atk} ${action} in the same instant. ${def} takes both hits.`,
  (atk: string, def: string, action: string, env: string) =>
    `Something in ${env} becomes a weapon. ${atk} uses it — ${action} from the angle the arena just opened up. ${def} was watching the wrong threat.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} has been reading ${env} as much as reading ${def}. It pays off. ${atk} ${action} at the exact moment ${env} provides the edge — right place, right time, catastrophic for ${def}.`,
  (atk: string, def: string, action: string, env: string) =>
    `${atk} uses ${env} instead of fighting ${def} directly. ${atk} ${action} while ${def} is handling what the arena just threw at them. ${def} is down before they process either problem.`,
];

// Short consequence lines — physical damage observations, not philosophy
const consequenceLines = [
  (def: string) => `Blood is running from ${def}'s lip now.`,
  (def: string) => `${def} is limping. They're trying not to show it.`,
  (def: string) => `${def} spits blood and gets back up.`,
  (def: string) => `${def} shakes their head — trying to clear the ringing.`,
  (def: string) => `One of ${def}'s arms isn't moving right.`,
  (def: string) => `${def} is still up. Taking longer to stand each time.`,
  (def: string) => `The hits are stacking. ${def} is starting to feel all of them at once.`,
  (def: string) => `${def} wipes the blood out of their eye and keeps moving.`,
];

// ─── Round Narrative Builder ──────────────────────────────────────────────────

interface FightNarrativeState {
  // Separate per-pool trackers so index {3} in Brutal ≠ index {3} in Tactical
  usedBrutal: Set<number>;
  usedTactical: Set<number>;
  usedDominant: Set<number>;
  usedDesperate: Set<number>;
  usedEnvironmental: Set<number>;
  usedClassicMid: Set<number>;
  usedCounter: Set<number>;
  usedRangedMid: Set<number>;
  usedRangedCounter: Set<number>;
  attackCounts: Map<number, number>; // characterId → times attacked (drives ability cycling)
  attackerWinning: boolean;
  defenderWinning: boolean;
}

function buildRoundNarrative(
  round: number,
  maxRounds: number,
  attacker: Character,
  defender: Character,
  arenaName: string,
  arenaFlavors: string[],
  state: FightNarrativeState,
  isFinalRound: boolean,
): string {
  const atkTags = getTags(attacker);
  const defTags = getTags(defender);

  // Track how many times this character has attacked and cycle their abilities
  const prevCount = state.attackCounts.get(attacker.id) ?? 0;
  state.attackCounts.set(attacker.id, prevCount + 1);

  const action = buildAttackAction(attacker, atkTags, prevCount);
  const progress = round / maxRounds;
  const useRanged = getFightStyle(attacker, atkTags) === "ranged" || isImmobile(attacker);

  // ── Phase & tone selection ────────────────────────────────────────────────
  let template: (a: string, d: string, ac: string, env: string) => string;

  if (round === 1) {
    template = pickRandom(useRanged ? rangedOpeningTemplates : openingTemplates);
  } else if (isFinalRound || progress >= 0.82) {
    // Final round of the actual fight always gets a closing beat
    template = pickRandom(useRanged ? rangedClosingTemplates : closingTemplates);
  } else if (round % 5 === 0) {
    // Every 5th round: dramatic counter/reversal beat — no-repeat tracked
    template = useRanged
      ? pickFresh(rangedCounterTemplates, state.usedRangedCounter)
      : pickFresh(counterTemplates, state.usedCounter);
  } else {
    if (useRanged) {
      template = pickFresh(rangedMidTemplates, state.usedRangedMid);
    } else {
      // Melee: choose tone to match fight state, each with its own no-repeat tracker
      const r = Math.random();
      if (state.attackerWinning && r < 0.35) {
        template = pickFresh(dominantMidTemplates, state.usedDominant);
      } else if (state.defenderWinning && r < 0.35) {
        template = pickFresh(desperateMidTemplates, state.usedDesperate);
      } else if (r < 0.55) {
        template = pickFresh(brutalMidTemplates, state.usedBrutal);
      } else if (r < 0.75) {
        template = pickFresh(tacticalMidTemplates, state.usedTactical);
      } else if (r < 0.88) {
        template = pickFresh(environmentalMidTemplates, state.usedEnvironmental);
      } else {
        template = pickFresh(midTemplates, state.usedClassicMid);
      }
    }
  }

  let narrative = template(attacker.name, defender.name, action, arenaName);

  // Append weakness/interaction note
  const interaction = getWeaknessMatchNote(attacker, atkTags, defender, defTags);
  if (interaction) narrative += ` ${interaction}`;

  // Arena flavor on even rounds when no interaction note fired
  if (!interaction && round % 2 === 0) {
    narrative += ` ${pickRandom(arenaFlavors)}`;
  }

  // Consequence lines: fired on some mid rounds only — never on final round
  if (!interaction && !isFinalRound && round > 2 && progress < 0.75 && Math.random() < 0.25) {
    narrative += ` ${pickRandom(consequenceLines)(defender.name)}`;
  }

  return narrative;
}

// ─── Core Simulation ──────────────────────────────────────────────────────────

function teamPower(team: Character[]): number {
  return team.reduce((sum, c) => sum + c.strength + c.speed + c.intelligence + c.durability, 0);
}

// Apply a concrete damage bonus when an attacker's power type exploits a defender's known weakness.
// This makes weaknesses mechanically meaningful, not just narrative flavor.
function getWeaknessBonus(attacker: Character, defender: Character): number {
  const atkTags = getTags(attacker);
  const defWeakness = defender.weaknesses.toLowerCase();
  let bonus = 0;
  if (atkTags.has("fire")      && /fire|heat|flame|burn/.test(defWeakness))          bonus += 4;
  if (atkTags.has("ice")       && /ice|cold|freeze|frost/.test(defWeakness))          bonus += 4;
  if (atkTags.has("magic")     && /magic|sorcery|mystical|arcane|supernatural/.test(defWeakness)) bonus += 5;
  if (atkTags.has("lightning") && /lightning|electric|shock|emp/.test(defWeakness))   bonus += 4;
  if (atkTags.has("psychic")   && /psychic|mind|mental|willpower/.test(defWeakness))  bonus += 5;
  if (atkTags.has("metal")     && /armor|metal|iron|steel/.test(defWeakness))         bonus += 4;
  if (atkTags.has("poison")    && /poison|toxin|biological/.test(defWeakness))        bonus += 4;
  if (atkTags.has("shadow")    && /light|holy|radiant/.test(defWeakness))             bonus += 3;
  if (atkTags.has("cosmic")    && /cosmic|energy|overwhelm/.test(defWeakness))        bonus += 5;
  return bonus;
}

// ─── Gang-up Narrative Templates ──────────────────────────────────────────────
// Used when a larger team piles on a smaller/solo opponent simultaneously.

const gangUpTemplates: ((attackers: string, defender: string, arena: string) => string)[] = [
  (atk, def, env) => `${atk} converge on ${def} simultaneously on ${env}. There is no angle left to defend. ${def} is hit from multiple directions in the span of a single second — the numbers are simply overwhelming.`,
  (atk, def, env) => `${atk} split apart and attack ${def} from every angle at once on ${env}. It's not a fight anymore — it's a coordinated elimination. ${def} blocks one hit and takes the other two.`,
  (atk, def, env) => `Being outnumbered finally catches up to ${def}. ${atk} coordinate without a word on ${env} and strike together. ${def} cannot be in three places at once.`,
  (atk, def, env) => `${atk} close in from opposite ends of ${env}. ${def} turns to face the first — the second doesn't give them time to turn back. This is what being outnumbered actually means.`,
  (atk, def, env) => `On ${env}, ${atk} execute a pincer attack with zero margin for error. ${def} sees it coming and still can't stop it. You can't block what hits you from behind while you're blocking what's hitting you from the front.`,
  (atk, def, env) => `${atk} don't need a plan. They have the numbers. They rush ${def} on ${env} from multiple directions and let physics sort it out. Physics is not kind to ${def}.`,
];

export function simulateFight(team1: Character[], team2: Character[]): FightResult {
  const base1 = teamPower(team1);
  const base2 = teamPower(team2);

  // Power gap: 0 = equal, ~±0.35 at extreme mismatch
  const totalPower = base1 + base2;
  const powerGap = (base1 - base2) / totalPower;

  // ── Team size tracking ───────────────────────────────────────────────────────
  const size1 = team1.length;
  const size2 = team2.length;
  const sizeDiff = Math.abs(size1 - size2); // 0 = equal, 1 = slight edge, 2+ = big mismatch

  // ── Speed-based initiative ────────────────────────────────────────────────
  // Faster teams attack more often; combined with HP momentum for dynamic swings.
  const avgSpeed1 = team1.reduce((sum, c) => sum + c.speed, 0) / size1;
  const avgSpeed2 = team2.reduce((sum, c) => sum + c.speed, 0) / size2;
  const speedFrac1 = avgSpeed1 / (avgSpeed1 + avgSpeed2); // >0.5 → team1 faster

  let hp1 = 100;
  let hp2 = 100;

  const rounds: FightRound[] = [];

  const maxRounds = 14 + Math.floor(Math.random() * 9); // 14–22 rounds
  const arena = pickRandom(arenas);

  // Narrative state — separate no-repeat trackers per pool + ability cycling
  const narrativeState: FightNarrativeState = {
    usedBrutal: new Set(),
    usedTactical: new Set(),
    usedDominant: new Set(),
    usedDesperate: new Set(),
    usedEnvironmental: new Set(),
    usedClassicMid: new Set(),
    usedCounter: new Set(),
    usedRangedMid: new Set(),
    usedRangedCounter: new Set(),
    attackCounts: new Map(),
    attackerWinning: false,
    defenderWinning: false,
  };

  // ── Chaos tuning ──────────────────────────────────────────────────────────
  // Reduce chaos when the mismatch is severe — chaos shouldn't rescue a 5v1 underdog.
  const chaosFrequency = Math.max(0.06, 0.12 + Math.abs(powerGap) * 0.2 - sizeDiff * 0.03);
  // Betrayal: 3% per round (was 6%). Rare but still possible.
  const betrayalChance = 0.03;
  // No back-to-back chaos — after a chaos round, skip the next chaos check.
  let chaosCooldown = false;
  // Gang-up cooldown — don't fire multiple gang-up rounds in a row.
  let gangUpCooldown = false;

  for (let i = 1; i <= maxRounds; i++) {
    if (hp1 <= 0 || hp2 <= 0) break;

    // ── Chaos event check ─────────────────────────────────────────────────────
    if (!chaosCooldown && Math.random() < chaosFrequency) {
      chaosCooldown = true; // suppress next round — no back-to-back

      const event = pickRandom(chaosEvents);

      // Chaos still slightly favors the underdog, but with a softer bias (60% vs 72%).
      // In extreme mismatches it's even softer — chaos shouldn't fully rescue lost causes.
      const strongBias = Math.min(0.60, 0.55 + Math.abs(powerGap));
      let chaosHitsTeam1: boolean;
      if (event.targetStrong) {
        chaosHitsTeam1 = powerGap > 0 ? Math.random() < strongBias : Math.random() < (1 - strongBias);
      } else {
        chaosHitsTeam1 = Math.random() < 0.5;
      }

      const victim      = chaosHitsTeam1 ? pickRandom(team1).name : pickRandom(team2).name;
      const beneficiary = chaosHitsTeam1 ? pickRandom(team2).name : pickRandom(team1).name;
      const chaos = event.narrative(victim, beneficiary, arena.name);

      // Chaos swings reduced ~35% — significant but not fight-ending.
      const rawSwing = event.hpSwing + Math.floor(Math.random() * 6) - 3;
      const swing = Math.round(rawSwing * 0.65);

      if (chaosHitsTeam1) {
        hp1 = Math.max(2, hp1 - swing);
      } else {
        hp2 = Math.max(2, hp2 - swing);
      }

      rounds.push({
        round: i,
        attacker: beneficiary,
        defender: victim,
        attackType: `chaos: ${event.name}`,
        narrative: chaos,
        team1Hp: Math.round(hp1),
        team2Hp: Math.round(hp2),
      });
      continue;
    } else {
      chaosCooldown = false;
    }

    // ── Betrayal check ────────────────────────────────────────────────────────
    const canBetray1 = team1.length >= 2;
    const canBetray2 = team2.length >= 2;
    if ((canBetray1 || canBetray2) && Math.random() < betrayalChance) {
      const betrayTeam1 = canBetray1 && (!canBetray2 || Math.random() < 0.5);
      const team = betrayTeam1 ? team1 : team2;
      const shuffled = [...team].sort(() => Math.random() - 0.5);
      const traitor = shuffled[0]!;
      const victim  = shuffled[1]!;
      const template      = pickRandom(betrayalTemplates);
      const justification = pickRandom(betrayalJustifications)(traitor.name);
      const narrative     = template.narrative(traitor.name, victim.name, justification);
      // Betrayal damage also modestly reduced
      const damage = Math.round((template.hpSwing + Math.floor(Math.random() * 6) - 3) * 0.8);

      if (betrayTeam1) {
        hp1 = Math.max(2, hp1 - damage);
      } else {
        hp2 = Math.max(2, hp2 - damage);
      }

      rounds.push({
        round: i,
        attacker: traitor.name,
        defender: victim.name,
        attackType: "betrayal",
        narrative,
        team1Hp: Math.round(hp1),
        team2Hp: Math.round(hp2),
      });
      continue;
    }

    // ── Gang-up check (fires when sizeDiff >= 2 and larger team has advantage) ──
    // When a team outnumbers by 2+, they can all pile on the smaller team's fighter(s).
    // This fires ~25% of rounds during the fight, not back-to-back.
    const currentHpAdvantage = hp1 / (hp1 + hp2);
    const largerTeamIsTeam1 = size1 > size2;
    const largerTeamIsWinning = largerTeamIsTeam1 ? currentHpAdvantage > 0.45 : currentHpAdvantage < 0.55;

    if (
      !gangUpCooldown &&
      sizeDiff >= 2 &&
      largerTeamIsWinning &&
      Math.random() < 0.28
    ) {
      gangUpCooldown = true;
      const gangTeam  = largerTeamIsTeam1 ? team1 : team2;
      const victim    = pickRandom(largerTeamIsTeam1 ? team2 : team1);

      // Build attacker name string: "X, Y, and Z"
      const shuffledAttackers = [...gangTeam].sort(() => Math.random() - 0.5).slice(0, Math.min(gangTeam.length, 3));
      const attackerNames = shuffledAttackers.length === 1
        ? shuffledAttackers[0]!.name
        : shuffledAttackers.length === 2
          ? `${shuffledAttackers[0]!.name} and ${shuffledAttackers[1]!.name}`
          : `${shuffledAttackers[0]!.name}, ${shuffledAttackers[1]!.name}, and ${shuffledAttackers[2]!.name}`;

      // Combined damage: each attacker contributes their stat-weighted share
      const gangDamage = shuffledAttackers.reduce((sum, a) => {
        const statBonus = (a.strength + a.speed) / 200;
        const share = largerTeamIsTeam1
          ? (base1 / totalPower / size1) * 0.55 + statBonus * 0.23
          : (base2 / totalPower / size2) * 0.55 + statBonus * 0.23;
        return sum + Math.round(share * 17 + 3);
      }, 0);

      const gangNarrative = pickRandom(gangUpTemplates)(attackerNames, victim.name, arena.name);

      if (largerTeamIsTeam1) {
        hp2 = Math.max(0, hp2 - gangDamage);
        narrativeState.attackerWinning = true;
        narrativeState.defenderWinning = false;
      } else {
        hp1 = Math.max(0, hp1 - gangDamage);
        narrativeState.attackerWinning = true;
        narrativeState.defenderWinning = false;
      }

      rounds.push({
        round: i,
        attacker: attackerNames,
        defender: victim.name,
        attackType: "gang-up",
        narrative: gangNarrative,
        team1Hp: Math.round(hp1),
        team2Hp: Math.round(hp2),
      });
      continue;
    } else if (gangUpCooldown) {
      gangUpCooldown = false;
    }

    // ── Normal combat ─────────────────────────────────────────────────────────
    // Initiative: speed determines attack frequency + HP momentum for in-fight swings.
    // speedFrac1 × 0.40 + (hpAdvantage - 0.5) × 0.20 + 0.30 base keeps range in [0,1].
    const currentAdvantage = hp1 / (hp1 + hp2);
    const team1Attacks = Math.random() < speedFrac1 * 0.40 + (currentAdvantage - 0.5) * 0.20 + 0.30;

    let attacker: Character;
    let defender: Character;
    let damage: number;

    if (team1Attacks) {
      attacker = pickRandom(team1);
      defender = pickRandom(team2);
      // Exponential scaling: powerRatio^1.4 amplifies large gaps without distorting close fights.
      // Multiplier raised to 30, random reduced to 0.13, min damage scales with power (not flat +4).
      const statBonus     = (attacker.strength + attacker.speed) / 200;
      const sizeBonus     = size1 > size2 ? 1 + (size1 - size2) * 0.08 : 1;
      const ratio1        = base1 / totalPower;
      const scaledRatio   = Math.pow(ratio1, 1.4);
      const effectiveness = (scaledRatio * 0.72 + Math.random() * 0.13 + statBonus * 0.15) * sizeBonus;
      const minDmg        = Math.max(1, Math.round(ratio1 * 7));
      const weakBonus     = getWeaknessBonus(attacker, defender);
      damage = Math.round(effectiveness * 30 + minDmg) + weakBonus;
      hp2 = Math.max(0, hp2 - damage);
      narrativeState.attackerWinning = hp1 > hp2 + 10;
      narrativeState.defenderWinning = hp2 > hp1 + 10;
    } else {
      attacker = pickRandom(team2);
      defender = pickRandom(team1);
      const statBonus     = (attacker.strength + attacker.speed) / 200;
      const sizeBonus     = size2 > size1 ? 1 + (size2 - size1) * 0.08 : 1;
      const ratio2        = base2 / totalPower;
      const scaledRatio   = Math.pow(ratio2, 1.4);
      const effectiveness = (scaledRatio * 0.72 + Math.random() * 0.13 + statBonus * 0.15) * sizeBonus;
      const minDmg        = Math.max(1, Math.round(ratio2 * 7));
      const weakBonus     = getWeaknessBonus(attacker, defender);
      damage = Math.round(effectiveness * 30 + minDmg) + weakBonus;
      hp1 = Math.max(0, hp1 - damage);
      narrativeState.attackerWinning = hp2 > hp1 + 10;
      narrativeState.defenderWinning = hp1 > hp2 + 10;
    }

    const isFinalRound = hp1 <= 0 || hp2 <= 0;
    const narrative = buildRoundNarrative(i, maxRounds, attacker, defender, arena.name, arena.flavor, narrativeState, isFinalRound);

    rounds.push({
      round: i,
      attacker: attacker.name,
      defender: defender.name,
      attackType: getMoveName(attacker, 0),
      narrative,
      team1Hp: Math.round(hp1),
      team2Hp: Math.round(hp2),
    });
  }

  const winner = hp1 >= hp2 ? 1 : 2;
  const winTeam = winner === 1 ? team1 : team2;
  const loseTeam = winner === 1 ? team2 : team1;
  const winnerNames = winTeam.map((c) => c.name).join(" & ");
  const loserNames = loseTeam.map((c) => c.name).join(" & ");

  // Count chaos events and betrayals for summary flavour
  const chaosCount = rounds.filter((r) => r.attackType.startsWith("chaos:")).length;
  const betrayalCount = rounds.filter((r) => r.attackType === "betrayal").length;

  const summaryAddons = [];
  if (chaosCount > 0) summaryAddons.push(`the environment intervened ${chaosCount} time${chaosCount > 1 ? "s" : ""}`);
  if (betrayalCount > 0) summaryAddons.push(`${betrayalCount} act${betrayalCount > 1 ? "s" : ""} of betrayal changed the course of the fight`);

  const extraClause = summaryAddons.length > 0 ? ` Along the way, ${summaryAddons.join(" and ")}.` : "";

  const summaries = [
    `After ${rounds.length} rounds of mayhem on ${arena.name}, ${winnerNames} stand victorious over the wreckage that was ${loserNames}.${extraClause}`,
    `${winnerNames} survive ${rounds.length} savage rounds on ${arena.name} and emerge as the last ones standing. ${loserNames} gave everything — it simply wasn't enough.${extraClause}`,
    `${rounds.length} rounds on ${arena.name}. One winner. ${winnerNames} outlasted, outfought, and outlucked ${loserNames}.${extraClause} The arena will never fully recover.`,
    `When the dust settles on ${arena.name} after ${rounds.length} brutal rounds, ${winnerNames} remain standing while ${loserNames} do not.${extraClause} Whether this counts as a fair fight is a matter of opinion.`,
    `${winnerNames} — battered, bleeding, possibly betrayed — stand victorious after ${rounds.length} rounds on ${arena.name}.${extraClause} History will remember this as a spectacular mess.`,
  ];

  return { winner, rounds, summary: pickRandom(summaries) };
}
