import type { Character } from "@workspace/db";
import { computeSynergy } from "./synergies";
import { openai } from "@workspace/integrations-openai-ai-server";

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
  arenaIntro?: string;
  intro?: string;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── 20 Arenas ────────────────────────────────────────────────────────────────
// `boost` = tags that get a damage edge fighting here (environment helps them).
// `nerf`  = tags that struggle here (environment works against them).

interface Arena {
  name: string;
  flavor: string[];
  boost?: string[];
  nerf?: string[];
}

const arenas: Arena[] = [
  {
    name: "a crumbling mountain summit",
    flavor: [
      "Boulders the size of buses tumble into the void below.",
      "The ridge cracks and shifts — footing is becoming impossible.",
      "Lightning hammers the peak, drawn by the raw energy of the fight.",
      "The summit is disintegrating round by round.",
    ],
    boost: ["lightning", "wind", "speedster"],
    nerf: ["giant", "tech"],
  },
  {
    name: "a sinking aircraft carrier in the North Atlantic",
    flavor: [
      "The deck tilts another ten degrees as seawater floods the lower decks.",
      "Fighter jets slide off the tilting runway and plunge into the grey sea.",
      "Freezing ocean spray lashes across the battlefield.",
      "The ship groans metallically — she won't stay afloat much longer.",
    ],
    boost: ["water", "ice", "lightning"],
    nerf: ["fire"],
  },
  {
    name: "an active volcano crater",
    flavor: [
      "Magma geysers erupt between the fighters without warning.",
      "The crater rim crumbles into the churning lava below.",
      "Superheated air distorts every visual — nothing is where it appears.",
      "The entire volcano shudders as if enraged by the fight above it.",
    ],
    boost: ["fire", "cosmic"],
    nerf: ["ice", "water", "tech"],
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
    boost: ["water", "lightning", "shadow"],
    nerf: ["fire", "wind"],
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
    boost: ["wind", "speedster", "magic"],
    nerf: ["giant", "tech"],
  },
  {
    name: "an overgrown jungle temple during a monsoon",
    flavor: [
      "The rain is so thick it's nearly impossible to see more than three meters.",
      "Ancient stone steps collapse under the force of the fighting.",
      "A massive stone idol topples and crashes through two walls.",
      "Vines and roots seem to reach for the combatants, alive with the storm's electricity.",
    ],
    boost: ["water", "magic", "shadow", "lightning"],
    nerf: ["fire", "tech"],
  },
  {
    name: "the frozen surface of Europa",
    flavor: [
      "The ice sheet splinters under their feet, revealing dark ocean below.",
      "In the near-zero gravity, shockwaves carry for miles.",
      "Jupiter looms vast and silent overhead.",
      "Something enormous moves beneath the ice. Something that is definitely not human.",
    ],
    boost: ["ice", "cosmic", "speedster"],
    nerf: ["fire"],
  },
  {
    name: "a decommissioned nuclear power plant",
    flavor: [
      "Warning alarms echo through every corridor — they've been going off for days.",
      "Coolant steam vents without warning from cracked pipes.",
      "Radiation meters in the fight zone are simply reading ERROR.",
      "A reactor vessel groans and then cracks — everyone has new problems.",
    ],
    boost: ["tech", "cosmic", "undead"],
    nerf: [],
  },
  {
    name: "a 500-acre pumpkin farm that is aggressively on fire",
    flavor: [
      "Thousands of burning pumpkins roll across the field in every direction.",
      "A scarecrow catches fire and runs — nobody can explain this.",
      "The farmhouse explodes as the fire reaches a propane tank.",
      "A tractor, apparently self-driving, charges through the battlefield with no clear agenda.",
    ],
    boost: ["fire", "shadow"],
    nerf: ["ice", "water"],
  },
  {
    name: "the International Space Station (interior, zero gravity)",
    flavor: [
      "In zero-G, blood and debris float in eerie slow motion.",
      "A hull breach tears part of the station open to the vacuum of space.",
      "Untethered equipment — laptops, food pouches, fire extinguishers — orbits the fight.",
      "Mission Control is screaming into their headsets. Nobody is listening.",
    ],
    boost: ["speedster", "psychic", "cosmic"],
    nerf: ["giant"],
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
    boost: ["water", "wind", "lightning"],
    nerf: ["fire", "tech"],
  },
  {
    name: "the surface of Mars during a planet-wide dust storm",
    flavor: [
      "Visibility drops to zero — both sides are fighting blind and by instinct.",
      "The Martian dust is electrostatically charged, causing random sparks and discharges.",
      "A terraforming station collapses in the distance, slowly and completely.",
      "The storm strips paint, armor plating, and flesh with equal enthusiasm.",
    ],
    boost: ["wind", "psychic", "stealth"],
    nerf: ["tech", "long-range"],
  },
  {
    name: "a luxurious cruise ship casino — currently sinking",
    flavor: [
      "Poker chips and roulette balls cascade across the tilting floor.",
      "The slot machines are still paying out as the room floods from one end.",
      "A grand piano slides slowly but inevitably toward the fight.",
      "The chandelier sways violently, raining crystal on everyone below.",
    ],
    boost: ["water"],
    nerf: [],
  },
  {
    name: "a bottomless ancient colosseum with no exits",
    flavor: [
      "The crowd of carved stone faces watches without expression.",
      "Sand soaks dark with blood as the floor absorbs everything.",
      "The walls are too high and too smooth to climb. There is no leaving.",
      "A hidden trap door opens in the floor. Something below it is breathing.",
    ],
    boost: ["aggressive", "giant", "undead"],
    nerf: [],
  },
  {
    name: "a burning rainforest during an earthquake",
    flavor: [
      "The ground splits open in jagged fissures that glow orange from below.",
      "Ancient trees — some five hundred years old — snap like toothpicks.",
      "The earthquake and the fire are each trying to win the title of 'worst thing happening right now.'",
      "A river changes course, surging through the battlefield and sweeping debris in all directions.",
    ],
    boost: ["fire", "wind", "shadow"],
    nerf: ["ice"],
  },
  {
    name: "a transdimensional void where the laws of physics are more like suggestions",
    flavor: [
      "Gravity rotates ninety degrees without warning.",
      "A copy of the arena from ten seconds ago overlaps the current one — double the hazards.",
      "Sound travels backwards here. Screams arrive before the blows that caused them.",
      "The concept of 'floor' stops being applicable for about four seconds.",
    ],
    boost: ["reality", "magic", "cosmic", "psychic"],
    nerf: ["tech", "long-range"],
  },
];

// Per-arena modifier applied to outgoing damage based on attacker tags.
// Returns a multiplier centered on 1.0. Boost = +18%, nerf = -18%, capped.
function getArenaDamageMod(arena: Arena, atkTags: Set<string>): number {
  let mod = 1.0;
  if (arena.boost) for (const t of arena.boost) if (atkTags.has(t)) { mod += 0.18; break; }
  if (arena.nerf)  for (const t of arena.nerf)  if (atkTags.has(t)) { mod -= 0.18; break; }
  return clamp(mod, 0.7, 1.35);
}

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
      `CHAOS — A goat appears from nowhere. Nobody knows where it came from. It headbutts ${v} squarely in the back of the knees with laser-targeted precision, dropping them at a critical moment. The goat trots off with the confident energy of someone who had a very specific task to complete.`,
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
      `CHAOS — An elderly man in a fishing hat walks directly into the fight, seemingly lost. ${v} pulls their finishing blow at the last second to avoid hitting him. This hesitation costs them dearly. The old man disappears into a hedge. Nobody finds the hedge later.`,
    hpSwing: 12,
    targetStrong: true,
  },
  {
    name: "gravity inversion",
    narrative: (v, b, arena) =>
      `CHAOS — Gravity briefly inverts. ${b} — by luck, instinct, or sheer absurdity — had already left the ground at the moment of inversion. ${v}, however, was firmly planted and gets launched ceiling-first into whatever ceiling exists with full gravitational force.`,
    hpSwing: 20,
    targetStrong: true,
  },
  {
    name: "dimensional rift",
    narrative: (v, b, arena) =>
      `CHAOS — A dimensional rift tears open inches from ${v}'s face. A different, angrier version of ${v} from a parallel timeline reaches through and delivers a single devastating punch before the rift closes. The regular ${v} has now been beaten up by themselves and has a lot of questions.`,
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
      `CHAOS — Someone on the sideline starts playing eye-of-the-tiger on a portable speaker directly at ${b}. The effect is medically inexplicable but impossible to deny — ${b} attacks with sudden, renewed fury while ${v} struggles to focus against the tonal assault.`,
    hpSwing: 14,
    targetStrong: true,
  },
  {
    name: "spontaneous sinkholes",
    narrative: (v, b, arena) =>
      `CHAOS — The ground beneath ${v}'s feet gives way — a sinkhole opens with zero warning and swallows ${v} to the waist. They spend two rounds extracting themselves, during which ${b} respectfully (and then disrespectfully) continues fighting.`,
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
      `CHAOS — A crow lands on a piece of nearby debris, looks directly at ${v}, and says — clearly, in the local language — "Not today." It then divebombs ${v}'s face with surgical precision. The crow has not explained itself and cannot be found for comment. ${b} will remember this crow forever.`,
    hpSwing: 15,
    targetStrong: false,
  },
  {
    name: "time hiccup",
    narrative: (v, b, arena) =>
      `CHAOS — Time stutters. ${v} gets stuck in a 0.8-second loop and throws the same punch at empty air four times in rapid succession while ${b} — who is outside the loop — has an entire uninterrupted window of opportunity and uses all of it.`,
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
      `CHAOS — The weather changes instantaneously to something ${v} is specifically vulnerable to. This is either cosmic irony or targeted atmospheric weaponization — either way, ${v} is dealing with hail, UV radiation, or extreme humidity at exactly the wrong time.`,
    hpSwing: 19,
    targetStrong: true,
  },
  {
    name: "a second goat",
    narrative: (v, b, arena) =>
      `CHAOS — The first goat returns. It has brought a friend. They operate as a unit. ${v} is headbutted from two different angles in rapid succession. The goats share a meaningful look, then disperse. The fight continues.`,
    hpSwing: 17,
    targetStrong: false,
  },
  {
    name: "power nullification field",
    narrative: (v, b, arena) =>
      `CHAOS — A localized power nullification field activates — source unknown. For exactly one round, ${v}'s signature abilities simply don't work. All that training, all those powers — temporarily offline. ${b} has never had a better window. They use it.`,
    hpSwing: 30,
    targetStrong: true,
  },
  {
    name: "the floor is actually lava",
    narrative: (v, b, arena) =>
      `CHAOS — Part of the floor is, at this moment, literally lava. This is not a game. ${v} has just stepped in it. The good news is they're still in the fight. The bad news is everything else about this situation.`,
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
  // Merge stored behavior tags (assigned by tagCharacters script)
  for (const t of char.behaviorTags ?? []) tags.add(t);
  return tags;
}

// ─── Behavior Modifiers ───────────────────────────────────────────────────────
// Derive per-team combat modifiers from their collective behavior tags.
interface BehaviorMods {
  initiativeBonus: number;   // added to attack-probability formula
  damageMult:      number;   // multiplier on outgoing damage (1.0 = baseline)
  damageResist:    number;   // multiplier on incoming damage (1.0 = no reduction)
  regenPerRound:   number;   // HP recovered at end of each round
  firstStrike:     number;   // extra flat damage bonus on round 1 only
}

function getTeamBehaviorMods(
  team: Character[],
  isRealistic: boolean,
  round: number,
): BehaviorMods {
  const tags = new Set<string>();
  for (const c of team) for (const t of getTags(c)) tags.add(t);

  let initiativeBonus = 0;
  let damageMult      = 1.0;
  let damageResist    = 1.0;
  let regenPerRound   = 0;
  let firstStrike     = 0;

  // Aggressive teams hit harder and push initiative
  if (tags.has("aggressive")) { initiativeBonus += 0.07; damageMult += 0.10; }

  // Sadistic fighters press advantages ruthlessly
  if (tags.has("sadistic")) damageMult += 0.08;

  // Tactical teams are more effective in realistic tone; still decisive in cinematic/brutal/funny
  if (tags.has("tactical")) {
    damageMult      += isRealistic ? 0.12 : 0.05;
    initiativeBonus += isRealistic ? 0.05 : 0.03;
  }

  // Arrogant fighters are overconfident early — slight damage boost rounds 1-2
  if (tags.has("arrogant") && round <= 2) damageMult += 0.06;

  // Defensive fighters absorb more punishment
  if (tags.has("defensive")) damageResist *= 0.88;

  // Regenerators slowly claw back HP each round
  if (tags.has("regen")) regenPerRound += 3;

  // Speedsters already benefit from higher speed stats, but add a small initiative nudge
  if (tags.has("speedster")) initiativeBonus += 0.04;

  // Stealth bonus: ambush on round 1 only
  if (tags.has("stealth") && round === 1) firstStrike += 4;

  // Long-range fighters get a small opening-range advantage
  if (tags.has("long-range") && round === 1) firstStrike += 2;

  return { initiativeBonus, damageMult, damageResist, regenPerRound, firstStrike };
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
      `${d} swings with everything. The blow lands wrong — ${n} shifted the angle of impact at contact. What was meant to cave in a chest barely grazes. ${d} doesn't know what just happened.`,
      `${d}'s counter comes in hard. ${n} redirects it — not by blocking, but by making the air between them refuse the hit. ${d}'s arm snaps through empty space.`,
      `${d} throws the right move. ${n} simply unmakes the trajectory mid-flight. The strike lands nowhere.`,
      `${d} commits to the attack. ${n} lets them — then reshapes the point of impact. The force goes sideways. ${d} staggers on their own swing.`,
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

// ─── Immunity Note ────────────────────────────────────────────────────────────
// Fires when an attacker's method fundamentally CAN'T work against this defender.
// Narrative-only — the stat system handles actual damage, this makes it feel right.

function getImmunityNote(
  attacker: Character,
  atkTags: Set<string>,
  defender: Character,
  defTags: Set<string>,
): string | null {
  // Only fires ~35% of rounds — flavor, not spam
  if (Math.random() > 0.35) return null;

  const n = attacker.name;
  const d = defender.name;
  const hasAnySpecialPower = atkTags.size > 0;

  // Pure physical fighter punching liquid metal / reforming entity
  if (!hasAnySpecialPower && defTags.has("immortal") && !defTags.has("tech")) {
    return pickRandom([
      `Conventional force, correctly applied, completely absorbed. ${d} doesn't acknowledge it the way anything else would.`,
      `${n} hits exactly right. ${d} is reforming before the follow-through finishes.`,
      `${n} is using the right techniques against the wrong opponent. The body doesn't stay damaged.`,
    ]);
  }

  // Mortal physical fighter vs a truly cosmic being
  if (!hasAnySpecialPower && defTags.has("cosmic")) {
    return pickRandom([
      `${n} is fighting with everything they have. Against something of ${d}'s magnitude, that's less a threat and more a statement of intent.`,
      `The strike lands. ${d} experiences it the way a star experiences a thrown stone.`,
      `${n}'s hit is technically successful. The effect on ${d} is technically negligible. Both things are true simultaneously.`,
    ]);
  }

  // Tech-heavy attacker vs magnetic/metal controller
  if (atkTags.has("tech") && defTags.has("metal")) {
    return pickRandom([
      `${n}'s systems are misfiring — something in ${d}'s vicinity is making the hardware choose sides. The wrong ones.`,
      `Half of ${n}'s tech advantages just became ${d}'s. That's the specific nightmare of fighting someone who controls metal.`,
    ]);
  }

  // Purely physical fighters vs intangible/shadow entities
  if (!hasAnySpecialPower && defTags.has("shadow")) {
    return pickRandom([
      `${n}'s fist passes through ${d}'s silhouette. There's nothing solid to connect with unless ${d} chooses to be.`,
      `Physical force requires a physical target. ${d} is offering neither right now.`,
    ]);
  }

  // Fire user vs fire-immune
  if (atkTags.has("fire") && /immune to fire|fire doesn't|cannot burn|fire.?proof/.test(defender.weaknesses.toLowerCase())) {
    return pickRandom([
      `The flames wash over ${d} and accomplish nothing. This was not an effective strategy.`,
      `${d} stands in the fire. Unimpressed. Unharmed. This attack was wasted.`,
    ]);
  }

  return null;
}

// ─── Elimination Line ─────────────────────────────────────────────────────────
// The definitive final sentence — HOW this fight ends for the loser.
// Every fight ends. Not every fighter dies the same way.

function getEliminationLine(loser: Character, loserTags: Set<string>, winner: Character, winnerTags: Set<string>): string {
  const d = loser.name;
  const w = winner.name;

  // Cosmic entities: dispersed, scattered, ended as a presence
  if (loserTags.has("cosmic")) {
    return pickRandom([
      `${d}'s power disperses across the void — no single point remaining. Not death. Something larger. An ending without a body.`,
      `${d} ceases to be a coherent force. Scattered. Unraveled at a fundamental level. Removed from the equation permanently.`,
      `The cosmic presence that was ${d} fragments and fades. This fight has ended something that should have been unkillable. It wasn't.`,
    ]);
  }

  // Immortals: contained, overwhelmed past the point of relevance
  if (loserTags.has("immortal")) {
    return pickRandom([
      `${d} cannot be killed. But they can be beaten so completely that resurrection becomes irrelevant. That's what happened here. They will heal. The fight is already over.`,
      `${d} will survive this. Eventually. Right now, what remains of them is pinned to the ground by the full weight of total defeat — and ${w} is already walking away.`,
      `You can't end ${d}. But you can take them out of the equation so thoroughly that it doesn't matter. ${w} just did that.`,
      `${d} goes down. Gets back up. Goes down harder. Gets back up slower. Goes down one final time and the math runs out — they're up, technically, but this fight is over.`,
    ]);
  }

  // Undead / necromantic entities: unraveled, dispersed
  if (loserTags.has("undead")) {
    return pickRandom([
      `The dark force animating ${d} shatters. The body collapses. Whatever held the pieces together is gone now — not suppressed, not delayed. Broken.`,
      `${d}'s necromantic tether snaps. The construct that was ${d} falls apart completely. The dead stay dead this time.`,
    ]);
  }

  // Robots / tech / androids: permanently destroyed
  if (loserTags.has("tech") && !loserTags.has("immortal")) {
    return pickRandom([
      `${d}'s systems go offline permanently. Not shut down — destroyed. There is no rebooting this.`,
      `Every light on ${d} goes dark simultaneously. The chassis hits the ground and nothing inside it is working. This unit is done.`,
      `${d} crashes. Every system, simultaneously. The kind of catastrophic failure that engineers have nightmares about — no recovery, no backup, no restart. Done.`,
    ]);
  }

  // Vampires: burned, staked, ended by the right means
  if (loserTags.has("vampire")) {
    return pickRandom([
      `${d} burns. Centuries of survival end in seconds when the right weakness is found. The night has no more use for them.`,
      `${d} is gone — dust, ash, and silence where something immortal used to be. ${w} found the thing that vampires cannot survive. There is always a thing.`,
    ]);
  }

  // Giant / kaiju: felled
  if (loserTags.has("giant")) {
    return pickRandom([
      `${d} falls. The impact registers on seismographs three hundred miles from here. Something that enormous takes the ground down with it when it goes.`,
      `${d} crashes to the earth and the shockwave flattens everything within a mile. Dead before impact. The crater is already forming.`,
    ]);
  }

  // Animals: killed cleanly — they lived by the fight and died by it
  if (loser.universe === "Animals") {
    return pickRandom([
      `${d} goes still. An apex predator — one of the most dangerous creatures that ever walked this planet — ends here, in this arena, in this fight. The silence after is total.`,
      `${d} dies as it lived: in combat, in the middle of a fight it believed it could win. It was wrong today. It won't get another chance to be right.`,
      `The greatest predator of its era hits the ground and does not move again. ${w} stands over what used to be a threat and breathes.`,
    ]);
  }

  // Default: they died. Say it plainly.
  return pickRandom([
    `${d} is dead. No dramatic last words. No second wind. The fight ended the only way fights at this level can end.`,
    `${d} hits the ground and doesn't get up. This time, permanently. ${w} is already breathing easier.`,
    `${d} goes down for the last time. That's the end of it. Final. Irreversible. Done.`,
    `${d} is gone. The fight has its winner. The arena has its casualty. The difference between them was everything.`,
    `${d} dies here. On ${w}'s terms, in ${w}'s fight. The last thing they see is the arena they lost in.`,
  ]);
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
      `channels ${move} at contact range — they take it full in the chest and hit the ground`,
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
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. ${def}'s guard shatters. They go down hard, skid across the ground, and come up bleeding.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} hesitates. ${atk} ${action}, snapping ${def}'s head back. ${def} hits the dirt hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} grabs ${def} and drives them headfirst into the ground. Twice. Then ${atk} ${action} at point-blank range. ${def} tumbles away trailing blood.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} feints left. ${def} bites. ${atk} ${action} from the right — ${def} never saw it. They hit the ground hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} lands something — barely. ${atk} takes it and answers: ${action}. Faster than the hit ${def} just threw. ${def} staggers with wounds that weren't there two seconds ago.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} catches ${def} mid-swing. ${atk} ${action} and the blow multiplies by ${def}'s own momentum. ${def} is driven into the nearest solid surface.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} doesn't let ${def} breathe. ${atk} ${action} before ${def} can reset. The hit folds them around the point of impact and they slide across the terrain.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} tries to hold ground. ${atk} ${action} — and ${def} is off their feet. They land twenty meters away.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} commits to what they think is the killing blow. ${atk} sidesteps, ${action}, and ${def} eats all of it. They bounce off the terrain and stay down for a beat.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Three seconds locked together, neither budging. Then ${atk} ${action} — the gap is found. ${def} is blown clear.`,
];

const counterTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${def} moves in to finish it. ${atk} lets them get close — then ${action} from inside their guard. ${def} never had the angle to defend it. They go down hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is bleeding, stumbling. ${def} commits to the close-out. ${atk} ${action} at the exact moment ${def} overextends. The counter lands clean and ${def} is sent back the way they came.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} thought they had this. ${atk} was baiting the whole time. ${atk} ${action} through the gap ${def} left while going for the kill — and the tables turn, violently.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} absorbs one more hit. Takes the pain. ${atk} ${action} as a counter — short, ugly, from a direction ${def} forgot to cover. It lands. ${def} drops.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} goes for the big hit. ${atk} rolls with it, stays on their feet, and ${action} before ${def} can pull back. The reversal is sudden and brutal. Both of them know the fight just shifted.`,
];

const closingTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${def} drops to a knee. ${atk} ${action} point-blank. ${def} hits the ground and the fight ends there.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is battered — doesn't matter. ${atk} ${action} one final time. ${def} goes down and stays down. It's over.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is finished and they know it. ${atk} ${action} — clean, final, no hesitation. ${def} hits the floor and doesn't move.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} grabs ${def}, drives them into the ground one last time, then ${action} at zero distance. ${def} doesn't get up.`,
  (atk: string, def: string, action: string, _env: string) =>
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
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. ${def} has no cover. The hit lands clean and ${def} skids backward trailing smoke.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} tries to close the gap. ${atk} ${action} mid-charge. ${def} is stopped cold and thrown backward.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} hesitates for a half-second. ${atk} ${action} during that half-second. ${def} doesn't get a third of the way through the dodge.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} reads the angle and ${action}. ${def} is caught with nowhere to deflect it. The terrain craters outward.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is still advancing when ${atk} ${action}. The blast multiplies by ${def}'s own forward momentum. They go down harder for it.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action} from range. Distance is irrelevant. ${def} takes it like they were standing right in front.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. ${def} blocks — it doesn't matter. The force blows through the block and ${def} slides back into the nearest wall.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} bloodied but still coming. ${atk} ${action} before they cover the distance. ${def} goes down again.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Standoff. Neither moving. Then ${atk} ${action} — the edge is found. ${def} is blown clear.`,
];

const rangedCounterTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${def} moves in to finish it. ${atk} ${action} at the worst possible moment for ${def}. The shot catches them mid-charge. They go down hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} was fading. ${def} pushes for the close-out. ${atk} ${action} as the counter — precise, full power. ${def} takes it and hits the terrain hard.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} thought this was over. ${atk} ${action} through the gap ${def} left reaching for the finish. The tables turn, violently.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} takes one more hit. Stays standing. ${atk} ${action} as the answer — from range, full force. ${def} eats every bit of it.`,
];

const rangedClosingTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is on their knees. ${atk} ${action} one final time. ${def} doesn't move. It's done.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is running on fumes. Doesn't matter. ${atk} ${action} — last shot, full power. ${def} goes down and stays down.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is finished. ${atk} ${action} at maximum range. The blast lands clean. ${def} hits the ground and the fight is over.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Both of them barely standing. ${atk} ${action} in a final surge. ${def} goes down. Done.`,
];

// ─── Extended Mid Templates: Tone Variants ───────────────────────────────────

const brutalMidTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. ${def} blocks — ${atk} breaks through the block. The hit lands anyway. ${def}'s knees buckle.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} hits ${def}. ${def} gets up. ${atk} hits again before they're upright. ${atk} ${action} — one more. ${def} doesn't get up as fast this time.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} tries to reset. ${atk} ${action} before the reset finishes. The second hit is worse than the first. The ground registers every impact.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} and ${def} trade. ${atk} is winning the trade. ${atk} ${action} and the math of this exchange only goes one way. ${def} is taking more hits than they're landing.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} ${action}. No technique — just damage. ${def} has no clever answer because there isn't one. The hit lands like a structural problem.`,
  (atk: string, def: string, action: string, _env: string) =>
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
  (atk: string, def: string, action: string, _env: string) =>
    `${def} tries to reset. ${atk} doesn't let them. ${atk} ${action} before ${def} is back on their feet. The gap keeps building.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} throws a counter. ${atk} walks through it and ${action}. ${def}'s counter didn't slow anything down.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} absorbs it. Gets up. ${atk} hits them again. Then ${atk} ${action} — another. ${def} is running out of ways to keep absorbing this.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} has ${def} on the back foot and knows it. ${atk} ${action} — not flashy, just relentless — and ${def} is losing ground they won't recover.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} can't find an angle. Every reset, ${atk} is already there. ${atk} ${action} and there's nowhere to go. The pressure is total.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} is trying everything. ${atk} has an answer for everything. ${atk} ${action} and the answer this round is the same as every round: forward, direct, followed up.`,
];

const desperateMidTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is getting taken apart. Then — ${atk} ${action} from nowhere. A shot that shouldn't have connected. It connects. ${def} didn't see it.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${def} moves in to finish it. ${atk} ${action} from the collapse — short-range, ugly, desperate. It connects. Both of them are surprised.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} is losing. They know it. Then ${atk} ${action} and the momentum wobbles for a second. Not over. Not yet.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} has taken three hits that should have ended this. They haven't. ${atk} ${action} from the edge of standing and drives it home. ${def} wasn't expecting that to still be in them.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} shouldn't still be fighting. The body says stop. ${atk} ${action} with whatever's left — and whatever's left is more than ${def} planned for.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Back against the wall, bleeding — ${atk} ${action} because it's the only move left. It's not clean. It doesn't have to be. It lands.`,
];

const environmentalMidTemplates = [
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} shoves ${def} into the terrain. The arena does some of the work. ${atk} ${action} at the same moment. ${def} was fighting two things at once.`,
  (atk: string, def: string, action: string, _env: string) =>
    `The ground shifts under ${def}'s feet. ${atk} doesn't wait for them to recover — ${atk} ${action} before ${def} can get their footing back.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} drives ${def} toward the worst part of the arena on purpose. When the hazard hits, ${atk} ${action} in the same instant. ${def} takes both at once.`,
  (atk: string, def: string, action: string, _env: string) =>
    `Something nearby becomes a weapon. ${atk} uses it — ${action} from the angle the chaos just opened up. ${def} was watching the wrong threat.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} has been reading the terrain as much as reading ${def}. It pays off. ${atk} ${action} at the exact moment the arena provides the edge — right place, right time, catastrophic for ${def}.`,
  (atk: string, def: string, action: string, _env: string) =>
    `${atk} uses the battlefield instead of fighting ${def} directly. ${atk} ${action} while ${def} is handling what just got thrown at them. ${def} is down before they process either problem.`,
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

  if (isFinalRound) {
    // ── FINAL ROUND: append definitive death/elimination ─────────────────────
    // Closing template already sets the physical beat — elimination line seals the fate.
    const elimLine = getEliminationLine(defender, defTags, attacker, atkTags);
    narrative += ` ${elimLine}`;
  } else {
    // ── MID ROUNDS ────────────────────────────────────────────────────────────
    // 1. Weakness match (already handles immortal, cosmic, elements, etc.)
    const interaction = getWeaknessMatchNote(attacker, atkTags, defender, defTags);
    if (interaction) {
      narrative += ` ${interaction}`;
    } else {
      // 2. Immunity note — fires when attacker's method can't work on this defender
      const immunityNote = getImmunityNote(attacker, atkTags, defender, defTags);
      if (immunityNote) {
        narrative += ` ${immunityNote}`;
      } else if (round % 2 === 0) {
        // 3. Arena flavor when neither note fired
        narrative += ` ${pickRandom(arenaFlavors)}`;
      }
    }

    // Consequence lines — physical damage accumulation, mid-fight only
    if (!isFinalRound && round > 2 && progress < 0.75 && Math.random() < 0.25) {
      narrative += ` ${pickRandom(consequenceLines)(defender.name)}`;
    }
  }

  return narrative;
}

// ─── Core Simulation ──────────────────────────────────────────────────────────

function teamPower(team: Character[]): number {
  const raw = team.reduce((sum, c) => sum + c.strength + c.speed + c.intelligence + c.durability, 0);
  return raw * computeSynergy(team).multiplier;
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
  (atk, def, _env) => `${atk} converge on ${def} simultaneously. There is no angle left to defend. ${def} is hit from multiple directions in the span of a single second — the numbers are simply overwhelming.`,
  (atk, def, _env) => `${atk} split apart and attack ${def} from every angle at once. It's not a fight anymore — it's a coordinated elimination. ${def} blocks one hit and takes the other two.`,
  (atk, def, _env) => `Being outnumbered finally catches up to ${def}. ${atk} coordinate without a word and strike together. ${def} cannot be in three places at once.`,
  (atk, def, _env) => `${atk} close in from opposite ends. ${def} turns to face the first — the second doesn't give them time to turn back. This is what being outnumbered actually means.`,
  (atk, def, _env) => `${atk} execute a pincer attack with zero margin for error. ${def} sees it coming and still can't stop it. You can't block what hits you from behind while you're blocking what's hitting you from the front.`,
  (atk, def, _env) => `${atk} don't need a plan. They have the numbers. They rush ${def} from multiple directions and let physics sort it out. Physics is not kind to ${def}.`,
];

// ─── AI Narrative Generation ───────────────────────────────────────────────────

interface ArenaData {
  name: string;
  flavor: string[];
}

interface RoundSimData {
  round: number;
  attackerName: string;
  defenderName: string;
  attackMove: string;
  team1HpBefore: number;
  team2HpBefore: number;
  team1HpAfter: number;
  team2HpAfter: number;
  isChaos: boolean;
  isBetrayal: boolean;
}

// Race a streaming AI call against a hard timeout, returning the raw text.
async function aiTextWithTimeout(prompt: string, maxTokens: number, timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve) => {
    const ac = new AbortController();
    const deadline = setTimeout(() => { ac.abort(); resolve(""); }, timeoutMs);

    (async () => {
      let text = "";
      try {
        const stream = await openai.chat.completions.create(
          { model: "gpt-5-mini", max_completion_tokens: maxTokens, messages: [{ role: "user", content: prompt }], stream: true },
          { signal: ac.signal },
        );
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) text += delta;
        }
        clearTimeout(deadline);
        resolve(text);
      } catch {
        clearTimeout(deadline);
        resolve("");
      }
    })();
  });
}

// Parse AI narrative that uses === MARKER === delimiters into a map of MARKER -> content.
// Falls back to numbered-header detection if the AI omits delimiters.
function parseSections(raw: string): Map<string, string> {
  const map = new Map<string, string>();

  // Primary: === LABEL === format (our enforced prompt format)
  // Split the text on these markers directly — case-insensitive, any word/space content
  const delimRe = /===\s*([A-Za-z][A-Za-z0-9 ]*?)\s*===/g;
  const dparts: Array<{ name: string; contentStart: number; delimEnd: number }> = [];
  let dm: RegExpExecArray | null;
  while ((dm = delimRe.exec(raw)) !== null) {
    dparts.push({
      name: dm[1]!.trim().toUpperCase(),
      contentStart: dm.index + dm[0].length,
      delimEnd: dm.index, // position where this section's delimiter STARTS (= end of previous content)
    });
  }

  if (dparts.length > 0) {
    for (let i = 0; i < dparts.length; i++) {
      const { name, contentStart } = dparts[i]!;
      // End of content is the start of the NEXT delimiter
      const end = dparts[i + 1]?.delimEnd ?? raw.length;
      const content = raw.slice(contentStart, end).trim();
      if (content && !map.has(name)) map.set(name, content);
    }
    return map;
  }

  // Fallback: strip markdown, then match short header lines
  const text = raw
    .replace(/#{1,4}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");

  const ALIASES: Array<[string, string]> = [
    ['combatant entrance', 'ENTRANCE'],
    ['the combatants',     'ENTRANCE'],
    ['fighters enter',     'ENTRANCE'],
    ['fighter entrance',   'ENTRANCE'],
    ['both fighters',      'ENTRANCE'],
    ['the fighters',       'ENTRANCE'],
    ['fighters arrive',    'ENTRANCE'],
    ['entrance',           'ENTRANCE'],
    ['combatants',         'ENTRANCE'],
    ['entering',           'ENTRANCE'],
    ['round 1',            'ROUND 1'],
    ['round one',          'ROUND 1'],
    ['round 2',            'ROUND 2'],
    ['round two',          'ROUND 2'],
    ['round 3',            'ROUND 3'],
    ['round three',        'ROUND 3'],
    ['setting',            'SETTING'],
    ['arena',              'SETTING'],
    ['result',             'RESULT'],
    ['outcome',            'RESULT'],
    ['conclusion',         'RESULT'],
    ['aftermath',          'RESULT'],
  ];

  const lines = text.split("\n");
  const fparts: Array<{ key: string; lineIdx: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const cleaned = lines[i]!.trim().replace(/^\d+\.\s*/, "").replace(/:$/, "").trim().toLowerCase();
    if (!cleaned || cleaned.length > 60) continue;
    for (const [kw, key] of ALIASES) {
      if (cleaned === kw || cleaned.startsWith(kw) || (kw.includes(' ') && cleaned.includes(kw))) {
        fparts.push({ key, lineIdx: i });
        break;
      }
    }
  }

  for (let i = 0; i < fparts.length; i++) {
    const { key, lineIdx } = fparts[i]!;
    const end = fparts[i + 1]?.lineIdx ?? lines.length;
    const content = lines.slice(lineIdx + 1, end).join("\n").trim();
    if (content && !map.has(key)) map.set(key, content);
  }
  return map;
}

// Extract a named section by key from the AI narrative text.
function extractSection(text: string, ...patterns: string[]): string {
  const sections = parseSections(text);
  for (const pat of patterns) {
    const val = sections.get(pat.toUpperCase().trim());
    if (val?.trim()) return val;
  }
  return "";
}

// ─── Tone Types ────────────────────────────────────────────────────────────
export type FightTone = "cinematic" | "brutal" | "realistic" | "funny";

export function normalizeTone(input: string | undefined): FightTone {
  switch (input) {
    case "brutal":    return "brutal";
    case "realistic":
    case "debate":    return "realistic";
    case "funny":     return "funny";
    case "cinematic":
    case "fun":
    default:          return "cinematic";
  }
}

const TONE_INSTRUCTIONS: Record<FightTone, string> = {
  cinematic: `TONE — CINEMATIC EPIC.
• Operatic, theatrical, larger-than-life. Slow-motion beats. Dust motes in shafts of light. Camera-style framing.
• Powers feel mythic. Music swells in the prose. Each hit lands with the weight of a film climax.
• Vary pace — quiet beats between explosions. Land the finisher like a curtain drop.`,
  brutal: `TONE — BRUTAL & GROUNDED.
• Visceral, anatomical, ugly. Bones. Blood. Tendons. Concrete. Real impact, real damage, real cost.
• No magic-system explanations — describe what hits, where it lands, what tears, what breaks.
• Short, hard sentences. No adverbs. No fanfare. Pain has texture and consequence.
• Treat injuries like injuries. The fight should feel exhausting, not heroic.`,
  realistic: `TONE — TIGHT & STAT-DRIVEN.
• Restrained, almost analytical. Outcomes follow capability — the stronger fighter wins on technique and matchup.
• No chaos events, no random environmental saves, no luck-based reversals. Every result is earned.
• Describe what their abilities CAN ACTUALLY DO and what the opponent CAN ACTUALLY COUNTER.
• Sound like an honest debate-mode breakdown that just happens to be visceral.`,
  funny: `TONE — ABSURD & COMEDIC.
• Take the fight DEAD seriously while every detail is ridiculous. Deadpan. The arena has opinions. The crowd is unhinged.
• Bystanders, pets, vending machines, weather — everything is somehow involved.
• NEVER use death-final language. Loser is "humiliated", "thoroughly defeated", "carried off in a shopping cart". They survive — embarrassed, not eliminated.
• Wordy, observational, dryly funny. Specific brand names, oddly precise measurements, suspicious goats.`,
};

async function generateAINarrative(
  team1: Character[],
  team2: Character[],
  arena: ArenaData,
  roundSimData: RoundSimData[],
  winner: number,
  tone: FightTone = "cinematic",
): Promise<{ arenaIntro: string; intro: string; roundNarratives: string[]; resultText: string }> {
  const team1Names = team1.map(c => c.name).join(" & ");
  const team2Names = team2.map(c => c.name).join(" & ");
  const winnerNames = winner === 1 ? team1Names : team2Names;
  const loserNames = winner === 1 ? team2Names : team1Names;

  const charProfile = (c: Character) => {
    const bTags = c.behaviorTags?.length ? ` [${c.behaviorTags.join(", ")}]` : "";
    return `${c.name} (${c.universe})${bTags} — ${c.specialAbility.slice(0, 80)}`;
  };
  const team1Info = team1.map(charProfile).join("; ");
  const team2Info = team2.map(charProfile).join("; ");

  const chaosRounds = roundSimData.filter(r => r.isChaos).map(r => r.round);
  const betrayalRounds = roundSimData.filter(r => r.isBetrayal).map(r => r.round);
  const specialNotes = [
    ...chaosRounds.map(r => `Round ${r}: chaos event erupts in the arena`),
    ...betrayalRounds.map(r => `Round ${r}: a team member betrays their own side`),
  ].join("; ");

  const rd = (i: number) => roundSimData[i];

  // Build per-round HP delta strings so the AI can calibrate damage weight
  const hpNote = (idx: number) => {
    const r = roundSimData[idx];
    if (!r) return "";
    const d1 = r.team1HpBefore - r.team1HpAfter;
    const d2 = r.team2HpBefore - r.team2HpAfter;
    if (d1 > 0) return `Team 1 takes ${d1} damage (now ${r.team1HpAfter}/100 HP).`;
    if (d2 > 0) return `Team 2 takes ${d2} damage (now ${r.team2HpAfter}/100 HP).`;
    return "";
  };

  const betrayalNote = betrayalRounds.length
    ? `\nBetrayal rounds: ${betrayalRounds.join(", ")} — a team member turns on their own side.`
    : "";

  const prompt = `You are a fight narrator. Write a visceral, power-specific battle across FIVE rounds.

${TONE_INSTRUCTIONS[tone]}

FIGHTERS:
Team 1: ${team1Info}
Team 2: ${team2Info}
Arena: ${arena.name} — ${arena.flavor.join(" ")}
Winner: ${winnerNames} defeats ${loserNames}${betrayalNote}

POWER WRITING RULES — apply these to every round:
• Describe EXACTLY what each power looks like when it fires: colour, sound, heat, light, physical distortion, smell of ozone, shockwave, etc.
• Describe what the power DOES to the target: where it hits, what the impact looks like, how the target's body reacts, what visible damage occurs.
• Describe the RESPONSE: does the target stagger, get launched, crater the ground, scream, or absorb it silently?
• Never say "attacks" or "fights" — say WHAT they do. "Blasts with heat vision that cuts a white-hot trench across the chest." "Drives a knee strike so fast it cracks the sound barrier, shattering three ribs and a wall behind them."
• Each power use must be unique to that character — no generic punches unless that IS their power.

You MUST use these exact markers (surrounded by === on their own line) to separate sections.
Do NOT skip any section. Every section needs real content.

=== SETTING ===
(3-5 sentences: the arena in sensory detail — light, texture, hazards, atmosphere. No combat yet.)

=== ENTRANCE ===
(2-4 sentences: each fighter arrives. What their power looks like at rest — aura, energy, physical presence. No attacks.)

=== ROUND 1 ===
(Opening. ${rd(0) ? `${rd(0).attackerName} strikes first with ${rd(0).attackMove}.` : "First move."} ${hpNote(0)} Describe the power activation in full sensory detail, the impact, and the target's reaction. First blood. Momentum is unclear.)

=== ROUND 2 ===
(Escalation. ${rd(1) ? `${rd(1).attackerName} uses ${rd(1).attackMove}.` : "Powers unleashed."} ${hpNote(1)} Both sides reveal more of what they can do. Show the visual scale of the powers growing. One side edges ahead but it's not decisive.)

=== ROUND 3 ===
(TURNING POINT. ${rd(2) ? `${rd(2).attackerName} deploys ${rd(2).attackMove}.` : "Pivotal moment."} ${hpNote(2)} Something shifts — a desperate counter, a power used in a new way, a hit that lands harder than expected. Make the reader genuinely unsure who survives.)

=== ROUND 4 ===
(Last stand. ${rd(3) ? `${rd(3).attackerName} launches ${rd(3).attackMove}.` : "Final push."} ${hpNote(3)} The losing side throws everything. It nearly works — describe the desperate power use in detail. But ${winnerNames} endures and answers back.)

=== ROUND 5 ===
${tone === "funny"
    ? `(Finale. ${rd(4) ? `${rd(4).attackerName} lands the absurd, decisive move: ${rd(4).attackMove}.` : "The end."} ${hpNote(4)} Make the finishing power use the most cartoonish and humiliating of the fight. ${winnerNames} ends it. The loser is thoroughly embarrassed and dignity-shattered — NEVER dead, NEVER killed, NEVER "goes down and stays down" in a final sense. They're concussed, confused, face-down in icing, politely asking for a moment alone, etc.)`
    : `(Finale. ${rd(4) ? `${rd(4).attackerName} delivers the ${tone === "realistic" ? "decisive blow" : "killing blow"}: ${rd(4).attackMove}.` : "The end."} ${hpNote(4)} Make the finishing power use the most detailed and visceral of the fight. ${winnerNames} ends it. The loser goes down and stays down.)`}

=== RESULT ===
(2-3 sentences: declare the winner, describe the physical state of both sides, give one line of finality.)

FORMAT RULES:
- Each round = 2-4 paragraphs. Keep each paragraph punchy — max 4 sentences.
- NEVER use: "exchanged blows", "fought fiercely", "unleashed their power", "clash of titans", "duel", "battle ensued".
- Each hit must specify: what power → what it looks like → where it lands → what happens next.`;

  // 22-second window for 5-round narrative (30s proxy limit minus buffer)
  const raw = await aiTextWithTimeout(prompt, 2500, 22_000);

  if (!raw.trim()) {
    return { arenaIntro: "", intro: "", roundNarratives: [], resultText: "" };
  }

  const arenaIntro  = extractSection(raw, "SETTING");
  let   intro       = extractSection(raw, "ENTRANCE", "COMBATANT ENTRANCE");
  const round1      = extractSection(raw, "ROUND 1");
  const round2      = extractSection(raw, "ROUND 2");
  const round3      = extractSection(raw, "ROUND 3");
  const round4      = extractSection(raw, "ROUND 4");
  const round5      = extractSection(raw, "ROUND 5");
  const resultText  = extractSection(raw, "RESULT");

  return {
    arenaIntro,
    intro,
    roundNarratives: [round1, round2, round3, round4, round5],
    resultText,
  };
}

export async function simulateFight(team1: Character[], team2: Character[], mode: string = "cinematic"): Promise<FightResult> {
  const tone = normalizeTone(mode);
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

  const maxRounds = 5; // 5 rounds — builds suspense with a proper 5-act arc
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

  // ── Tone tuning ────────────────────────────────────────────────────────────
  // realistic = pure stat logic, no chaos, no betrayals, tight variance.
  // cinematic = epic but disciplined — minor chaos, occasional betrayal.
  // brutal    = vicious, slightly higher damage variance, chaos rare but harsh.
  // funny     = arena & chaos lean absurd, more betrayals, no-death final language.
  const isRealistic = tone === "realistic";
  const isFunny     = tone === "funny";
  const isBrutal    = tone === "brutal";

  // Chaos and betrayal frequency by tone.
  const chaosFrequency =
    isRealistic ? 0 :
    isFunny     ? 0.10 :
    isBrutal    ? 0.04 :
                  0.02;          // cinematic
  const betrayalChance =
    isRealistic ? 0 :
    isFunny     ? 0.05 :
                  0.03;
  // Brutal damage modifier — incoming/outgoing damage scaled up.
  const brutalDamageMult = isBrutal ? 1.12 : 1.0;
  // Reality-warpers tracked for narrative colour.
  const hasRealityWarper = [...team1, ...team2].some(c => c.behaviorTags?.includes("reality-warper"));
  void hasRealityWarper;
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

      // Chaos swings scaled for 5-round fights — dramatic but not instantly decisive.
      const rawSwing = event.hpSwing + Math.floor(Math.random() * 6) - 3;
      const swing = Math.round(rawSwing * 0.45);

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
        const statBonus = (a.strength + a.speed) / 20000; // stats now 0-10000
        const share = largerTeamIsTeam1
          ? (base1 / totalPower / size1) * 0.55 + statBonus * 0.23
          : (base2 / totalPower / size2) * 0.55 + statBonus * 0.23;
        return sum + Math.round(share * 11 + 2);
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
    // Behavior mods for this round — recalculate per round because firstStrike only applies on round 1.
    const bMods1 = getTeamBehaviorMods(team1, isRealistic, i);
    const bMods2 = getTeamBehaviorMods(team2, isRealistic, i);

    // Initiative: speed + HP momentum + behavior (aggressive/speedster push initiative).
    const currentAdvantage = hp1 / (hp1 + hp2);
    const initBase = speedFrac1 * 0.40 + (currentAdvantage - 0.5) * 0.20 + 0.30;
    const initAdj  = clamp(initBase + bMods1.initiativeBonus - bMods2.initiativeBonus, 0.05, 0.95);
    const team1Attacks = Math.random() < initAdj;

    let attacker: Character;
    let defender: Character;
    let damage: number;

    if (team1Attacks) {
      attacker = pickRandom(team1);
      defender = pickRandom(team2);
      const atkTags       = getTags(attacker);
      const arenaMod      = getArenaDamageMod(arena, atkTags);
      const statBonus     = (attacker.strength + attacker.speed) / 20000;
      const sizeBonus     = size1 > size2 ? 1 + (size1 - size2) * 0.08 : 1;
      const ratio1        = base1 / totalPower;
      const scaledRatio   = isRealistic ? Math.pow(ratio1, 1.8) : Math.pow(ratio1, 1.4);
      const variance      = isRealistic ? Math.random() * 0.04 : (isBrutal ? Math.random() * 0.16 : Math.random() * 0.13);
      const effectiveness = (scaledRatio * 0.72 + variance + statBonus * 0.15) * sizeBonus;
      const minDmg        = Math.max(1, Math.round(ratio1 * 4));
      const weakBonus     = getWeaknessBonus(attacker, defender);
      // Apply attacker damage boost × defender resistance reduction × arena tags × tone
      const rawDmg = Math.round(effectiveness * 18 + minDmg) + weakBonus + bMods1.firstStrike;
      damage = Math.max(1, Math.round(rawDmg * bMods1.damageMult * bMods2.damageResist * arenaMod * brutalDamageMult));
      hp2 = Math.max(0, hp2 - damage);
      // Regen: team2 recovers some HP after taking the hit
      if (bMods2.regenPerRound > 0) hp2 = Math.min(100, hp2 + bMods2.regenPerRound);
      narrativeState.attackerWinning = hp1 > hp2 + 10;
      narrativeState.defenderWinning = hp2 > hp1 + 10;
    } else {
      attacker = pickRandom(team2);
      defender = pickRandom(team1);
      const atkTags       = getTags(attacker);
      const arenaMod      = getArenaDamageMod(arena, atkTags);
      const statBonus     = (attacker.strength + attacker.speed) / 20000;
      const sizeBonus     = size2 > size1 ? 1 + (size2 - size1) * 0.08 : 1;
      const ratio2        = base2 / totalPower;
      const scaledRatio   = isRealistic ? Math.pow(ratio2, 1.8) : Math.pow(ratio2, 1.4);
      const variance      = isRealistic ? Math.random() * 0.04 : (isBrutal ? Math.random() * 0.16 : Math.random() * 0.13);
      const effectiveness = (scaledRatio * 0.72 + variance + statBonus * 0.15) * sizeBonus;
      const minDmg        = Math.max(1, Math.round(ratio2 * 4));
      const weakBonus     = getWeaknessBonus(attacker, defender);
      const rawDmg = Math.round(effectiveness * 18 + minDmg) + weakBonus + bMods2.firstStrike;
      damage = Math.max(1, Math.round(rawDmg * bMods2.damageMult * bMods1.damageResist * arenaMod * brutalDamageMult));
      hp1 = Math.max(0, hp1 - damage);
      if (bMods1.regenPerRound > 0) hp1 = Math.min(100, hp1 + bMods1.regenPerRound);
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

  // Build a character-appropriate conclusion for the losing side.
  // In funny tone, NEVER use death-final language — losers are humiliated, not killed.
  const loserTags = loseTeam.reduce((set, c) => { getTags(c).forEach(t => set.add(t)); return set; }, new Set<string>());
  const loserConclusion = isFunny
    ? pickRandom([
        `${loserNames} — thoroughly humiliated, currently being heckled by a passing goat.`,
        `${loserNames} — defeated, dazed, and politely asking for a moment alone.`,
        `${loserNames} — wheeled off the field on a borrowed shopping cart, dignity not included.`,
        `${loserNames} — concussed, embarrassed, plotting an extremely petty rematch.`,
      ])
    : loserTags.has("cosmic")
    ? `${loserNames} dispersed — scattered across dimensions, no longer present in this reality.`
    : loserTags.has("immortal")
    ? `${loserNames} will eventually recover. They won't be back for this fight.`
    : loserTags.has("tech") && !loserTags.has("immortal")
    ? `${loserNames} — systems permanently offline.`
    : loseTeam.every(c => c.universe === "Animals")
    ? `${loserNames} died here. The greatest predator has its own predators.`
    : `${loserNames} — dead.`;

  const summaries = [
    `After ${rounds.length} rounds on ${arena.name}, ${winnerNames} are the last ones standing. ${loserConclusion}${extraClause}`,
    `${winnerNames} survive ${rounds.length} brutal rounds on ${arena.name}. ${loserConclusion}${extraClause} This was not a close fight. It was a fight.`,
    `${rounds.length} rounds. One winner. ${winnerNames} made sure of it. ${loserConclusion}${extraClause}`,
    `${arena.name} saw ${rounds.length} rounds of escalating violence. ${winnerNames} walked away. ${loserConclusion}${extraClause}`,
    `${winnerNames} — battered, possibly betrayed, still breathing — close out ${rounds.length} rounds on ${arena.name}. ${loserConclusion}${extraClause}`,
  ];

  // ── AI narrative generation ──────────────────────────────────────────────────
  // Build the round-sim data from the computed rounds array.
  // hp1Before/hp2Before come from the prior round's trailing HP (or 100 for round 1).
  const roundSimData: RoundSimData[] = rounds.map((r, idx) => ({
    round: r.round,
    attackerName: r.attacker,
    defenderName: r.defender,
    attackMove: r.attackType,
    team1HpBefore: idx === 0 ? 100 : rounds[idx - 1]!.team1Hp,
    team2HpBefore: idx === 0 ? 100 : rounds[idx - 1]!.team2Hp,
    team1HpAfter: r.team1Hp,
    team2HpAfter: r.team2Hp,
    isChaos: r.attackType.startsWith("chaos:"),
    isBetrayal: r.attackType === "betrayal",
  }));

  const aiResult = await generateAINarrative(team1, team2, arena, roundSimData, winner, tone);

  // Inject AI narratives — fall back to template narrative if AI returned empty for that round
  const finalRounds = rounds.map((r, idx) => ({
    ...r,
    narrative: aiResult.roundNarratives[idx]?.trim().length ? aiResult.roundNarratives[idx]! : r.narrative,
  }));

  // If AI didn't produce an arena intro, fall back to built-in arena flavor
  const finalArenaIntro = aiResult.arenaIntro?.trim().length
    ? aiResult.arenaIntro
    : `${arena.name[0]!.toUpperCase() + arena.name.slice(1)}. ${arena.flavor[0]} ${arena.flavor[1]}`;

  // Use AI result text as the match summary, fall back to template summary
  const finalSummary = aiResult.resultText?.trim().length ? aiResult.resultText : pickRandom(summaries);

  // Combatant entrance: use AI if available, otherwise build from character data
  const finalIntro = aiResult.intro?.trim().length
    ? aiResult.intro
    : team1
        .map(c => `${c.name} steps into ${arena.name}, ${(c.specialAbility.split(".")[0] ?? "").trim().toLowerCase() || "powers at the ready"}.`)
        .concat(team2.map(c => `Across the field, ${c.name} arrives — ${(c.specialAbility.split(".")[0] ?? "").trim().toLowerCase() || "ready for battle"}.`))
        .concat(["The air between them crackles. Neither speaks."])
        .join(" ");

  return {
    winner,
    rounds: finalRounds,
    summary: finalSummary,
    arenaIntro: finalArenaIntro,
    intro: finalIntro,
  };
}
