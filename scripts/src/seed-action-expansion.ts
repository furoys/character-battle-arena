import { db, charactersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

// ─── Fix Neo (id=121): strip the John Wick mashup, restore true Matrix identity
async function fixNeo() {
  await db.execute(sql`
    UPDATE characters SET
      name = 'Neo',
      strength = 8836,
      speed = 9801,
      intelligence = 9025,
      durability = 8836,
      special_ability = 'Sees the Matrix as cascading code — bends physics at will, stops bullets in mid-air, learns any martial art in seconds, and can fly; The One',
      weaknesses = 'Bound by rules of the Matrix; EMP shuts him down in the real world; love for Trinity is his only exploitable vulnerability',
      description = 'Thomas A. Anderson became the most dangerous person in history the moment he chose the red pill. Inside the Matrix, Neo is not fighting — he is rewriting the rules of reality itself.'
    WHERE id = 121
  `);
  console.log("  ✓ Updated: Neo (was Neo John Wick Mode)");
}

// ─── All stats on 0–10,000 scale (direct insert)
const characters = [

  // ── John Wick — the myth, the boogeyman ───────────────────────────────────
  {
    name: "John Wick",
    universe: "Action Heroes",
    strength: 7744,
    speed: 8836,
    intelligence: 8836,
    durability: 7744,
    specialAbility: "Gun-fu: fires from contact range while being choked; 128 kills documented with a pencil; perfect tactical reloads mid-throw; every room is a weapon",
    weaknesses: "Still mortal — gets stabbed, shot, and beaten throughout every film; grief-driven rage clouds tactical judgment",
    description: "They say John Wick killed three men with a pencil. A fucking pencil. The criminal underworld calls him the Boogeyman — and the Boogeyman checks under his bed for John Wick.",
  },

  // ── 80s/90s Action Heroes ─────────────────────────────────────────────────
  {
    name: "Dutch",
    universe: "Action Heroes",
    strength: 9025,
    speed: 7744,
    intelligence: 8100,
    durability: 8836,
    specialAbility: "Jungle guerrilla mastery — constructs elaborate lethal traps from foliage; reads terrain like a map; mud camouflage to mask heat signature; elite Green Beret instincts",
    weaknesses: "Team-dependent by nature; heat-signature camouflage works once; loses strategic advantage in urban environments",
    description: "Major Alan 'Dutch' Schaefer survived the Predator by turning the jungle itself into a killing field. He didn't defeat an alien hunter — he made the alien lose its mind.",
  },
  {
    name: "John Matrix",
    universe: "Action Heroes",
    strength: 9801,
    speed: 7056,
    intelligence: 5776,
    durability: 9409,
    specialAbility: "One-man army logistics: walks into a weapons depot and emerges carrying everything; documented 81 kills in under 11 minutes; tosses a telephone booth with one hand",
    weaknesses: "No subtlety whatsoever; telegraphs every attack; strategy extends no further than 'charge forward and shoot more'",
    description: "John Matrix is what happens when the military makes a man so dangerous they have to retire him. When his daughter is taken, he invades an entire island nation. Alone. And wins.",
  },
  {
    name: "Axel Foley",
    universe: "Action Heroes",
    strength: 5476,
    speed: 8100,
    intelligence: 9604,
    durability: 5776,
    specialAbility: "Talks his way through anything — impersonates detectives, federal agents, hotel inspectors, and health inspectors on the spot; Banana in Tailpipe Technique",
    weaknesses: "Physically outmatched against trained fighters; badge gets suspended constantly; relies on improvisation with zero backup plan",
    description: "Detroit detective Axel Foley doesn't win fights — he wins conversations. He once talked his way into a secure art gallery, a private club, and a police station all in one afternoon.",
  },
  {
    name: "Harry Callahan",
    universe: "Action Heroes",
    strength: 6889,
    speed: 6084,
    intelligence: 8100,
    durability: 7744,
    specialAbility: ".44 Magnum psychological warfare — makes criminals doubt their own count; 'Do you feel lucky?' disarms without firing; the most powerful handgun in the world, always loaded",
    weaknesses: "Methods are constitutionally questionable; cases get thrown out on technicalities; goes rogue when the system fails",
    description: "Dirty Harry Callahan doesn't stop criminals with his gun. He stops them with doubt — makes them count his shots and question their odds while staring down the most powerful handgun in the world.",
  },
  {
    name: "Max Rockatansky",
    universe: "Action Heroes",
    strength: 7744,
    speed: 9801,
    intelligence: 7744,
    durability: 8649,
    specialAbility: "Post-apocalyptic vehicular supremacy — intercepts, rams, and destroys at 200 mph; Interceptor handling; nothing-left-to-lose combat state eliminates hesitation",
    weaknesses: "Peak performance requires a vehicle; grief and isolation cloud strategy; the wasteland has taken everything already",
    description: "Mad Max has no fear left. When the apocalypse takes your family and your world, what remains is a man who drives into danger faster than anyone because he has no reason to slow down.",
  },
  {
    name: "Connor MacLeod",
    universe: "Action Heroes",
    strength: 8100,
    speed: 8100,
    intelligence: 8649,
    durability: 9801,
    specialAbility: "400 years of continuous sword mastery; Quickening — absorbs the power and memories of every immortal he beheads, growing stronger with each victory; cannot die except by decapitation",
    weaknesses: "Decapitation ends everything permanently; watches everyone he loves age and die, creating psychological burden",
    description: "The Highlander has fought every style of combat across four centuries. Every duel he's survived made him stronger. There can be only one — and MacLeod keeps being the one.",
  },
  {
    name: "RoboCop",
    universe: "Action Heroes",
    strength: 8836,
    speed: 5184,
    intelligence: 7744,
    durability: 10000,
    specialAbility: "Titanium alloy chassis rated to absorb high-explosive rounds; auto-targeting locks onto targets through walls; three inviolable Prime Directives that cannot be overridden by bribery, pain, or politics",
    weaknesses: "Cannot arrest OCP senior executives by Prime Directive 4; slow speed exploited by vehicles; humanity resurfaces at worst moments",
    description: "Officer Murphy was murdered and rebuilt as the future of law enforcement. RoboCop cannot be bribed, cannot feel fear, and cannot look away — the perfect cop in an imperfect world.",
  },
  {
    name: "Leon",
    universe: "Action Heroes",
    strength: 6724,
    speed: 7744,
    intelligence: 8836,
    durability: 6724,
    specialAbility: "Perfectionist contract killer — never misses from any position; survives undetected inside target buildings for days; cleans up evidence with OCD precision; milk, plants, and patience",
    weaknesses: "Illiterate — can't read contracts or escape routes; emotional attachment to Mathilda is his first and fatal vulnerability",
    description: "Leon is the best cleaner in New York. He doesn't leave evidence, witnesses, or bodies visible in public. His one vulnerability was a twelve-year-old girl who taught him how to read.",
  },
  {
    name: "Casey Ryback",
    universe: "Action Heroes",
    strength: 7744,
    speed: 7225,
    intelligence: 8100,
    durability: 7744,
    specialAbility: "Navy SEAL master chief who became a cook — improvises lethal weapons from kitchen equipment; can disable a battleship with condiments and a wire; pressure-point combat from SEAL training",
    weaknesses: "Chronically underestimated due to chef role; insubordinate enough to get demoted twice; refuses to ask for backup",
    description: "Casey Ryback was the most dangerous SEAL in the Navy. They made him a cook. When terrorists seized the USS Missouri, he fought them off with knives, hot oil, and whatever was on the menu.",
  },
  {
    name: "Frank Dux",
    universe: "Action Heroes",
    strength: 7056,
    speed: 9025,
    intelligence: 7225,
    durability: 6724,
    specialAbility: "Kumite champion — dim mak death touch targets pressure points for instant paralysis; fights fully blind using sound, breath, and chi alone; holds world record for fastest knockout (3.2 seconds)",
    weaknesses: "Blinded by his own technique when used against him; tournament rules-conditioned reflex can be exploited in street fights",
    description: "Frank Dux won the 1975 Kumite — the world's most brutal underground fighting tournament — blind. He can hear your heartbeat change before you throw a punch.",
  },
  {
    name: "Jack Burton",
    universe: "Action Heroes",
    strength: 5776,
    speed: 6400,
    intelligence: 3844,
    durability: 7744,
    specialAbility: "Indestructible lucky idiot — routinely knocks himself out and wakes up fine; stumbles into solutions through pure accident; the universe bends around his incompetence to produce victories",
    weaknesses: "Genuinely believes he's the hero when he's the comic relief; truck is his only reliable weapon",
    description: "Jack Burton will tell you he knows what he's doing. He doesn't. What Jack has instead of skill is luck so improbable it borders on supernatural — and a trucker's indestructible skull.",
  },
  {
    name: "Ethan Hunt",
    universe: "Action Heroes",
    strength: 7225,
    speed: 8649,
    intelligence: 9601,
    durability: 7225,
    specialAbility: "IMF impossible infiltration — hangs from planes at takeoff, breathes through a ventilation shaft for 6 hours, swaps faces with a mask in 60 seconds; the mission always succeeds somehow",
    weaknesses: "Team dependency — his plans require multiple specialists; the mission always gets compromised before the third act",
    description: "Ethan Hunt does the thing everyone says is impossible, then does three more impossible things to fix what went wrong with the first one. His briefing always says 'should you choose to accept it.' He always does.",
  },
  {
    name: "Dalton",
    universe: "Action Heroes",
    strength: 8649,
    speed: 8100,
    intelligence: 7744,
    durability: 8100,
    specialAbility: "PhD in philosophy + elite bouncer combat — rips throats out with two fingers as a last resort; 'be nice until it's time to not be nice'; pain doesn't deter him and can't be used as leverage",
    weaknesses: "Committed to de-escalation until it's too late; falls in love with the wrong woman in every town",
    description: "Dalton has a PhD from NYU and a reputation that clears rooms. The cooler of the Double Deuce only has one rule: be nice. The throat-ripping is for when someone makes being nice impossible.",
  },
  {
    name: "Conan the Barbarian",
    universe: "Action Heroes",
    strength: 9409,
    speed: 7056,
    intelligence: 5476,
    durability: 9409,
    specialAbility: "Survived crucifixion and cannibalism to climb off the Cross of Shame; Cimmerian berserker rage doubles effective strength; survived every sorcerer, god, and warlord the Hyborian Age has offered",
    weaknesses: "Strategy runs out after 'charge'; sorcery and supernatural entities can outmaneuver brute force; slow against fast technical fighters",
    description: "Born on a battlefield, enslaved, crucified, and resurrected by sheer will. Conan of Cimmeria has killed sorcerers, kings, and demigods with his bare hands. No one has ever broken him.",
  },
  {
    name: "El Mariachi",
    universe: "Action Heroes",
    strength: 6084,
    speed: 8649,
    intelligence: 7744,
    durability: 6400,
    specialAbility: "Guitar case carrying a concealed arsenal — rocket launcher, shotgun, twin pistols; moves through crowds as a musician until weapons appear; revenge-fueled dead-eye accuracy",
    weaknesses: "Guitar hand was shot and never fully healed; fights from grief not tactics; small squad dependent",
    description: "He came to town as a musician. He left as a myth. El Mariachi lost his hand and his love — and made everyone responsible pay with their lives, one guitar case at a time.",
  },
  {
    name: "John Shaft",
    universe: "Action Heroes",
    strength: 7056,
    speed: 7744,
    intelligence: 8836,
    durability: 6724,
    specialAbility: "Reads every room before entering — knows which exit is real, which bartender is informant, which cop is bent; operates simultaneously in the street, the precinct, and the mob's world",
    weaknesses: "Refuses to take the safe path; personal codes of conduct prevent certain tactics that would make cases easier",
    description: "John Shaft is the private detective who solves the cases nobody in law enforcement will touch because he lives in both worlds — the streets and the system — and answers to neither.",
  },
  {
    name: "Cobra",
    universe: "Action Heroes",
    strength: 7056,
    speed: 7744,
    intelligence: 6724,
    durability: 7056,
    specialAbility: "Covert terminator for crimes the legal system won't solve — ice pick finisher; moves through crime scenes like a ghost; 'crime is a disease, meet the cure' zero-hesitation protocol",
    weaknesses: "Lone wolf refusal to coordinate with other cops causes friendly fire risk; his methods are chronically illegal",
    description: "Marion Cobretti is the cop the LAPD sends when they've run out of options and patience. He doesn't arrest criminals — he processes them. With an ice pick. His sunglasses never come off.",
  },
  {
    name: "Harry Tasker",
    universe: "Action Heroes",
    strength: 8100,
    speed: 7744,
    intelligence: 8836,
    durability:    7744,
    specialAbility: "Omega Sector super spy — fights in a tuxedo AND detonates a nuclear warhead; rides a horse into a helicopter; surveys a terrorist cell from the suburbs while pretending to be a salesman",
    weaknesses: "Catastrophically bad at marriage communication; compartmentalizes his spy life until it collapses into his personal life at the worst moment",
    description: "Harry Tasker saves the world on Tuesdays and is home for dinner. His wife didn't know he was the country's most dangerous spy. By the end of the film, she did.",
  },
  {
    name: "Tequila",
    universe: "Action Heroes",
    strength: 6724,
    speed: 9025,
    intelligence: 6724,
    durability: 6400,
    specialAbility: "Dual pistol ballistic ballet — slides down hospital corridors on gurneys firing twin guns; improvised cover from bodies; jazz-fueled chaos as a disorientation tactic; never stands still",
    weaknesses: "Reckless disregard for cover reduces survival probability; creates massive collateral damage in populated areas; tunnel vision during gunfights",
    description: "Inspector Tequila plays jazz and kills people at the same speed. John Woo made him the avatar of Hong Kong action cinema — a man who never walks through a gunfight when he can slide.",
  },
  {
    name: "Sarah Connor",
    universe: "Action Heroes",
    strength: 7056,
    speed: 7225,
    intelligence: 8836,
    durability: 7744,
    specialAbility: "Transformed from helpless waitress to military survivalist — builds bombs from phone book instructions; trained the world's future commander; prepares for robot apocalypse with methodical precision",
    weaknesses: "PTSD from the first Terminator causes erratic judgment; institutionalized and drugged for years, weakening her physical edge",
    description: "Sarah Connor was a waitress who learned the world would end and decided to stop it herself. She didn't wait for a hero — she became the mother of one, then became the hero anyway.",
  },
  {
    name: "Rick Deckard",
    universe: "Action Heroes",
    strength: 5776,
    speed: 6400,
    intelligence: 9025,
    durability: 5776,
    specialAbility: "Voight-Kampff empathy interrogation detects replicants through micro-expression analysis; blade runner tracking through neon rain; uses ESPER enhancement to see around corners in photographs",
    weaknesses: "Physically weaker than every replicant he hunts; possibly IS a replicant himself and doesn't know it; driven by moral ambiguity rather than conviction",
    description: "Rick Deckard hunts artificial humans for a living. The terrifying irony is that he might be one. He's the only detective in history whose biggest case might be himself.",
  },
  {
    name: "Johnny Utah",
    universe: "Action Heroes",
    strength: 7225,
    speed: 9025,
    intelligence: 6724,
    durability: 7225,
    specialAbility: "FBI agent and former college QB — elite athletic pursuit; jumps from airplanes without a parachute; will follow a target off any cliff, into any wave, or over any skydiving altitude",
    weaknesses: "Goes native on undercover assignments; too emotionally invested in targets; fires gun into the sky instead of at targets",
    description: "Johnny Utah was the all-American quarterback turned FBI agent who went undercover with surfers and almost became one. He jumped from a plane without a chute. He fired into the sky. He felt the rush.",
  },

  // ── New Action Villains from the era ─────────────────────────────────────
  {
    name: "T-1000",
    universe: "Action Villains",
    strength: 8649,
    speed: 8836,
    intelligence: 7744,
    durability: 10000,
    specialAbility: "Liquid polyalloy morphs around any wound instantly — bullets pass through him; mimics anyone it touches with tactile sample; finger-blades penetrate steel; cannot be stopped by conventional firepower",
    weaknesses: "Extreme cold makes it brittle; molten steel destroys it permanently; doesn't comprehend human unpredictability in emotional situations",
    description: "The T-1000 is what happens when Skynet learned from its mistakes. It doesn't bleed, it doesn't tire, and every bullet hole closes before you reload. There is no killing it. Only delaying it.",
  },
  {
    name: "The Predator",
    universe: "Action Villains",
    strength: 8836,
    speed: 8649,
    intelligence: 8649,
    durability: 8836,
    specialAbility: "Plasma caster shoulder cannon; active optical camouflage; thermal/UV/electromagnetic vision modes; self-destruct nuclear device; only hunts prey it deems worthy — will not attack unarmed targets",
    weaknesses: "Honor code prevents attacking unarmed or injured targets; removes armor for 'fair' fights, reducing protection; cannot track through mud-covered heat signatures",
    description: "The Predator came from another world to hunt the most dangerous game. It passed over soldiers and targeted Special Forces. It's not here to conquer — it's here because hunting is sport, and you're the trophy.",
  },
  {
    name: "Roy Batty",
    universe: "Action Villains",
    strength: 9025,
    speed: 8100,
    intelligence: 8100,
    durability: 8100,
    specialAbility: "Nexus-6 replicant — 5x human strength, perfect recall of combat data, unbreakable pain tolerance; four-year lifespan compressed into terrifying vitality; holds the eye of his maker",
    weaknesses: "Expiration date is always approaching — aware his death is imminent; chose mercy at the end; dying body degrades rapidly in final hours",
    description: "Roy Batty has seen things you people wouldn't believe. Attack ships on fire off the shoulder of Orion. He broke his creator's hands and wept in the rain. The most human thing in Blade Runner wasn't human.",
  },
  {
    name: "Stansfield",
    universe: "Action Villains",
    strength: 6724,
    speed: 6724,
    intelligence: 8100,
    durability: 6724,
    specialAbility: "DEA badge gives full authority to murder entire families legally; Beethoven-fueled dissociative rage state removes all hesitation and self-preservation instinct; absolutely no one suspects the badge",
    weaknesses: "Beethoven overdoses destabilize judgment; depends on institutional power for impunity; rage overrides tactical planning",
    description: "Stansfield is the most dangerous kind of killer — one with a badge. He quotes Beethoven before murdering children and calls it law enforcement. The system that should stop him gave him a gun.",
  },
  {
    name: "Clarence Boddicker",
    universe: "Action Villains",
    strength: 6400,
    speed: 6400,
    intelligence: 7744,
    durability: 6084,
    specialAbility: "Detroit crime lord who personally executes with hands-on relish — spike gloves, military-grade weapons; connected to OCP board; Murphy's murderer; 'bitches leave' authority over his crew",
    weaknesses: "No real combat training — relies on crew and firepower; arrogant about police protection; falls apart without institutional backing",
    description: "Clarence Boddicker killed Officer Murphy with industrial enthusiasm and called it business. He runs Detroit's crime through corporate connections, not skill — which is exactly why RoboCop terrifies him.",
  },
];

async function main() {
  // Fix Neo first
  await fixNeo();

  console.log(`\nSeeding ${characters.length} action characters...`);
  let added = 0;
  let skipped = 0;

  for (const char of characters) {
    const existing = await db.execute(
      sql`SELECT id FROM characters WHERE LOWER(name) = LOWER(${char.name}) LIMIT 1`
    );
    if ((existing as any).rows?.length > 0) {
      console.log(`  SKIP (exists): ${char.name}`);
      skipped++;
      continue;
    }
    await db.insert(charactersTable).values(char);
    console.log(`  + ${char.name} (${char.universe})`);
    added++;
  }

  console.log(`\nDone. Added: ${added}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
