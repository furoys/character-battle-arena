import { db } from "@workspace/db";
import { charactersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const newChars = [
  {
    name: "Yennefer of Vengerberg",
    universe: "The Witcher",
    imageUrl: null,
    strength: 4200,
    speed: 5800,
    intelligence: 9100,
    durability: 5500,
    specialAbility: "Chaos magic; Djinn binding and wish-granting; Illusion and mind control; Portal creation; Healing and body enhancement magic",
    weaknesses: "Physically fragile in close melee; requires a source of Chaos to draw power; emotionally volatile under pressure",
    description: "Once a hunchbacked girl, Yennefer became one of the most powerful sorceresses on the Continent through sheer will and mastery of Chaos magic. Cold, brilliant, and ruthless — she is not someone who loses gracefully.",
  },
  {
    name: "Dovahkiin",
    universe: "The Elder Scrolls",
    imageUrl: null,
    strength: 7800,
    speed: 6200,
    intelligence: 7500,
    durability: 7900,
    specialAbility: "Dragon Shouts (Thu'um) — Unrelenting Force, Dragonrend, Slow Time; soul absorption from dragons; Daedric artifact wielding; master of all weapon and magic schools",
    weaknesses: "Shout abilities require cooldown; mortal physiology beneath the power; overconfidence from being the most powerful person in the room",
    description: "The Last Dragonborn — a mortal warrior born with the soul of a dragon, wielding the Thu'um to level mountains and bring ancient dragons to their knees. A walking weapon with a library of destruction at their throat.",
  },
  {
    name: "Spawn",
    universe: "Image Comics",
    imageUrl: null,
    strength: 8800,
    speed: 7200,
    intelligence: 7000,
    durability: 9200,
    specialAbility: "Necroplasm manipulation; Leetha symbiote suit with chainwhip and living armor; Hellfire projection; resurrection and self-repair; reality warping at full power",
    weaknesses: "Finite necroplasm supply that depletes with every power use; holy weapons bypass his armor; direct sunlight weakens the symbiote",
    description: "Al Simmons — a murdered CIA assassin resurrected as a Hellspawn. His necroplasm-fueled symbiote armor and chains have torn through both angels and demons. He exists between life and death, and is furious about it.",
  },
  {
    name: "Light Yagami",
    universe: "Death Note",
    imageUrl: null,
    strength: 2500,
    speed: 3200,
    intelligence: 9900,
    durability: 2000,
    specialAbility: "Death Note — kills any human whose name and face he knows with a written cause of death; master manipulator and contingency planner; photographic memory; multi-layered trap architecture",
    weaknesses: "Physically average with no combat training; the Death Note requires knowing the target's full name and face; his ego creates catastrophic blind spots when he feels untouchable",
    description: "A high-school prodigy who found a Death Note and used it to reshape the world in his own image. His intelligence is near-unmatched — but so is his hubris. He doesn't lose. He miscalculates.",
  },
  {
    name: "L",
    universe: "Death Note",
    imageUrl: null,
    strength: 2800,
    speed: 3000,
    intelligence: 9800,
    durability: 2200,
    specialAbility: "World's greatest detective and logical deducer; Capoeira combat trained; pattern recognition that borders on supernatural; psychological profiling and counter-manipulation",
    weaknesses: "Physically unimposing with no power advantages; vulnerable to the Death Note if his name is discovered; over-relies on deduction when gut instinct is needed",
    description: "The world's greatest detective — an eccentric, sleep-deprived savant who matched wits with Kira himself and came terrifyingly close to winning. L sees patterns others cannot imagine.",
  },
  {
    name: "Walter White",
    universe: "Breaking Bad",
    imageUrl: null,
    strength: 2600,
    speed: 2400,
    intelligence: 9500,
    durability: 2100,
    specialAbility: "Master organic chemist; improvised explosive synthesis (fulminated mercury, thermite); ricin and poison deployment; psychological manipulation and long-term scheming; ruthless adaptability under pressure",
    weaknesses: "Terminally ill with limited stamina; no physical combat capability; pride causes critical strategic mistakes when he believes he has already won",
    description: "A chemistry teacher turned drug kingpin. Walter White's genius lies in his willingness to destroy anything — including himself — to win. He doesn't fight with fists. He fights with patience, poison, and inevitability.",
  },
  {
    name: "Ip Man",
    universe: "Martial Arts Films",
    imageUrl: null,
    strength: 5200,
    speed: 7800,
    intelligence: 7200,
    durability: 5800,
    specialAbility: "Wing Chun grandmastery — simultaneous attack-and-defense; chain punching at extreme speed; joint locks and pressure point targeting; adapts to any opponent's style within seconds",
    weaknesses: "No superhuman attributes — human strength and endurance only; age-related stamina limitations; struggles against opponents far outside human scale",
    description: "Grandmaster of Wing Chun kung fu. Ip Man's fighting philosophy merges efficiency with devastating speed — every movement covers two purposes. He defeated ten black belts simultaneously and didn't spill his tea.",
  },
  {
    name: "Rama",
    universe: "The Raid",
    imageUrl: null,
    strength: 6100,
    speed: 8200,
    intelligence: 6800,
    durability: 6400,
    specialAbility: "Pencak Silat mastery — close-quarters brutality using elbows, knees, and throws; knife fighting; extreme pain tolerance and combat continuation through injury; improvised weapon adaptation in any environment",
    weaknesses: "No superhuman attributes — human durability limits; vulnerable to firearms at range; exhaustion in extended fights is a real factor",
    description: "An elite Indonesian SWAT officer who fought through an entire skyscraper packed with killers — floor by floor, door by door. Pencak Silat is visceral, efficient, and built to hurt people in small spaces.",
  },
  {
    name: "Doctor Fate",
    universe: "DC Comics",
    imageUrl: null,
    strength: 7500,
    speed: 8200,
    intelligence: 9200,
    durability: 8800,
    specialAbility: "Helm of Nabu channels the Lord of Order; supreme sorcery — mystic blasts, force fields, binding chains; flight; teleportation; fate manipulation; anti-magic nullification",
    weaknesses: "The Helm of Nabu can possess and override the human host's will; the host body has mortal limits without the helmet; vulnerable to sufficiently chaotic or elder magic",
    description: "Lord of Order. Doctor Fate channels the ancient sorcerer Nabu through the Helm of Fate — one of DC's most powerful magical forces. His blasts don't burn. They unmake.",
  },
  {
    name: "Bugs Bunny",
    universe: "Looney Tunes",
    imageUrl: null,
    strength: 4000,
    speed: 8500,
    intelligence: 9000,
    durability: 9500,
    specialAbility: "Toon Force — immune to physics and death within cartoon logic; dimensional travel via painted or drawn holes; disguise mastery; hammer space weapons; fourth-wall awareness and manipulation",
    weaknesses: "Operates on a strict personal code — only retaliates, never strikes first; Toon Force has limits against opponents who fully ignore cartoon logic",
    description: "Bugs Bunny operates on pure Toon Force — logic doesn't apply to him. He has fallen off cliffs, been blown up, and been flattened by boulders. He dusts himself off and asks what's up, Doc. He has never, technically, lost a fight he chose to finish.",
  },
];

export async function seedNewChars(): Promise<void> {
  let inserted = 0;
  for (const c of newChars) {
    const existing = await db
      .select({ id: charactersTable.id })
      .from(charactersTable)
      .where(eq(charactersTable.name, c.name))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(charactersTable).values(c);
    inserted++;
  }
  if (inserted > 0) {
    console.log(`[seed] Inserted ${inserted} new character(s)`);
  }
}
