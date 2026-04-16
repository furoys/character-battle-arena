import { db, charactersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const characters = [

  // ── OBSCURE MARVEL ──────────────────────────────────────────────────────────
  {
    name: "Uncle Ben",
    universe: "Marvel",
    strength: 52, speed: 48, intelligence: 72, durability: 55,
    specialAbility: "The Lesson — his death activates Peter Parker to fight at 200% if present; unlimited moral authority; anyone who beats him feels genuinely terrible; wisdom that outlasts death",
    weaknesses: "Fully human; no combat training; probably should not be here; entirely mortal",
    description: "Ben Parker — the man whose death created Spider-Man. Not a fighter. The most important person in Marvel Comics regardless.",
  },
  {
    name: "Squirrel Girl",
    universe: "Marvel",
    strength: 72, speed: 82, intelligence: 88, durability: 74,
    specialAbility: "Commands millions of squirrels simultaneously; superhuman tail; knuckle spikes; has defeated Thanos, Doctor Doom, and Galactus — documented Marvel canon",
    weaknesses: "Loses when writers remember how physics work",
    description: "Doreen Green, the Unbeatable Squirrel Girl — a computer science student who has beaten the most powerful beings in the universe using squirrels and optimism. Wins off-panel. Wins anyway.",
  },
  {
    name: "Forbush Man",
    universe: "Marvel",
    strength: 40, speed: 44, intelligence: 55, durability: 50,
    specialAbility: "Iron cooking pot helmet provides mysterious immunity to reality-warping powers; psychic attacks bounce off because there's nothing useful inside to target; presence confuses opponents",
    weaknesses: "Everything else. Every single other thing.",
    description: "Irving Forbush — Marvel's designated worst superhero, whose iron cooking pot helmet has somehow outlasted entire story arcs through sheer inexplicability.",
  },
  {
    name: "Spider-Ham",
    universe: "Marvel",
    strength: 72, speed: 80, intelligence: 80, durability: 70,
    specialAbility: "All of Spider-Man's abilities but he's a cartoon pig; produces mallets, anvils, and oversized rubber bands from nowhere; toon physics immunity; spider-sense works fine despite the snout",
    weaknesses: "Being a pig in a world that takes itself seriously; 'With great power comes great responsibility and also a snout'",
    description: "Peter Porker, the Spectacular Spider-Ham — a spider bitten by a radioactive pig, now wall-crawling through the multiverse with the dignity of neither.",
  },
  {
    name: "Slapstick",
    universe: "Marvel",
    strength: 88, speed: 90, intelligence: 62, durability: 99,
    specialAbility: "Full cartoon physics — immune to physical harm; pulls mallets, bombs, and dimensional weapons from nowhere; stretches, flattens, and reforms; pain optional",
    weaknesses: "Reverting to human form makes him entirely mortal; his own chaotic nature undermines tactics",
    description: "Steve Harmon — a teenager who fell through a dimensional portal and became a living cartoon. Bullets flatten against him. Logic does not apply.",
  },
  {
    name: "Maggott",
    universe: "Marvel",
    strength: 80, speed: 56, intelligence: 68, durability: 92,
    specialAbility: "Two sentient stomach maggots (Eany and Meany) emerge and devour literally anything; when they return, grants superhuman strength and durability; can eat through any barrier",
    weaknesses: "Without the maggots, extremely vulnerable; slow on foot; the maggots have their own opinions",
    description: "Japheth — an X-Man with two enormous sentient maggots that live in his digestive system and will eat through anything pointed at them.",
  },
  {
    name: "Stilt-Man",
    universe: "Marvel",
    strength: 72, speed: 66, intelligence: 76, durability: 80,
    specialAbility: "Hydraulic stilts extending up to 290 feet; titanium-alloy armor; shoulder-mounted blasters; surprisingly hard to fight at ceiling height if you're normal-sized",
    weaknesses: "Balance; staircases; anyone who can fly; the fundamental premise of his suit",
    description: "Wilbur Day — who built the most impractical supervillain suit in history and keeps showing up anyway. Points for persistence.",
  },
  {
    name: "Throg",
    universe: "Marvel",
    strength: 88, speed: 74, intelligence: 65, durability: 86,
    specialAbility: "Frogjolnir — a sliver of Mjolnir that fell into Frog World; actual lightning control; frog physiology; hops with devastating force; fully worthy; member of the Pet Avengers",
    weaknesses: "He's a frog. Some situations are just structurally difficult.",
    description: "Simon Walterson — a man cursed into frog form who found a piece of Mjolnir, became worthy, and now controls thunder as Throg. This is official Marvel canon.",
  },
  {
    name: "Gwenpool",
    universe: "Marvel",
    strength: 72, speed: 80, intelligence: 94, durability: 78,
    specialAbility: "Knows she's in a comic book; navigates panel gutters; retroactively writes backstory mid-fight; ignores narrative physics when plot demands; impossible aim because she can see hit probabilities",
    weaknesses: "Forgetting she's the protagonist; emotional investment in other characters' fates",
    description: "Gwen Poole — a Marvel fan from the real world who figured out she's inside a comic and has been exploiting narrative structure ruthlessly ever since.",
  },
  {
    name: "Frog-Man",
    universe: "Marvel",
    strength: 62, speed: 65, intelligence: 60, durability: 66,
    specialAbility: "Spring-loaded coil boots for erratic leaping; acid spit helmet; has accidentally captured actual supervillains by bouncing into them at high speed",
    weaknesses: "No actual powers; no control over trajectory; accidentally heroic at best",
    description: "Eugene Patilio — wearing his failed supervillain father's frog suit with no powers, no plan, and a surprisingly consistent record of stumbling into victories.",
  },

  // ── OBSCURE DC ──────────────────────────────────────────────────────────────
  {
    name: "Condiment Man",
    universe: "DC",
    strength: 44, speed: 54, intelligence: 62, durability: 52,
    specialAbility: "Mustard ray (stings eyes); ketchup jets (slippery floor creation); relish grenades; has actually caused Batman to slip on a condiment-coated floor — documented",
    weaknesses: "Everything about fighting. Also, most people can just step around the condiments.",
    description: "Mitchell Mayo — a Gotham villain whose condiment-based arsenal is dismissed by every hero and yet he keeps showing up with new sauces.",
  },
  {
    name: "Arm-Fall-Off-Boy",
    universe: "DC",
    strength: 68, speed: 55, intelligence: 58, durability: 72,
    specialAbility: "Detaches his own arms and uses them as bludgeons; infinite arm regeneration; surprising range; rejected by the Legion of Super-Heroes and immediately used his power on the rejection committee",
    weaknesses: "Bludgeoning someone with your own arm is the only move; arms can be stolen mid-fight",
    description: "Floyd Belkin — rejected by the Legion of Super-Heroes for having the most impractical superpower, and then demonstrated it on the examiner. The arms grow back.",
  },
  {
    name: "Matter-Eater Lad",
    universe: "DC",
    strength: 70, speed: 72, intelligence: 74, durability: 80,
    specialAbility: "Can eat any matter at any rate — metal, energy, force fields, atoms, conceptual barriers; jaw generates sufficient force to consume anything; his entire planet eats like this",
    weaknesses: "Eating the Miracle Machine drove him temporarily insane; no combat abilities beyond eating",
    description: "Tenzil Kem — a Bismollian senator whose entire species can eat anything. He can eat his way out of every physical problem and has.",
  },
  {
    name: "Kite Man",
    universe: "DC",
    strength: 62, speed: 76, intelligence: 68, durability: 65,
    specialAbility: "Razor-edged hang-glider kite with gas pellets; thermal updraft mastery; air superiority in any wind; 'Kite Man. Hell yeah.'; genuinely difficult to catch in open sky",
    weaknesses: "Indoors. Any enclosed space. Rain. Shame (suppressed).",
    description: "Charles Brown — a kite-themed villain who says 'Kite Man. Hell yeah.' with complete sincerity and has become beloved for it. A tragic origin. A perfect attitude.",
  },
  {
    name: "Polka-Dot Man",
    universe: "DC",
    strength: 70, speed: 68, intelligence: 72, durability: 74,
    specialAbility: "Polka-dot discs with dimensional portal storage; explosive dots; teleportation via dot; interdimensional parasite that requires him to use his powers daily or be consumed — heroism as survival",
    weaknesses: "Infected with a parasite that will kill him if he stops; sees his mother's face on every enemy",
    description: "Abner Krill — a villain whose ridiculous suit hides dimensional weapons, who recently became a reluctant hero and helped destroy a cosmic starfish.",
  },
  {
    name: "Calendar Man",
    universe: "DC",
    strength: 65, speed: 62, intelligence: 90, durability: 68,
    specialAbility: "Holiday-themed murder with matching weapon sets; on his actual birthday achieves functional unkillability; long-term psychological warfare; has gotten inside Batman's head across decades",
    weaknesses: "Easily ignored outside of his themed dates; requires the calendar to be on his side",
    description: "Julian Day — a Gotham villain whose holiday-themed crimes are laughed at until you realize he's been playing a 40-year psychological game with Batman.",
  },
  {
    name: "Dogwelder",
    universe: "DC",
    strength: 76, speed: 65, intelligence: 55, durability: 80,
    specialAbility: "Welds deceased dogs to the faces of criminals using supernaturally hot hands; never speaks; cannot be discouraged; dogs are always available; has divine protection through sheer inexplicability",
    weaknesses: "Only has one move; never speaks, which limits coordination; no one can explain this",
    description: "A member of Section 8 who welds dead dogs to the faces of criminals. He has never explained himself. He never will. His legacy lives on.",
  },
  {
    name: "Crazy Quilt",
    universe: "DC",
    strength: 62, speed: 58, intelligence: 74, durability: 66,
    specialAbility: "Helmet projects blinding multicolor light beams; can scramble visual cortex of anyone looking at him; hypnotic color patterns; genuinely disorienting to face in person",
    weaknesses: "Blind himself without the helmet; obsession with restoring his sight leads to terrible decisions",
    description: "A criminal artist who lost his sight and built a helmet that weaponizes color — a genuinely disorienting threat wrapped in the most visually chaotic costume in DC.",
  },

  // ── VIDEO GAME CHARACTERS ───────────────────────────────────────────────────
  {
    name: "Samus Aran",
    universe: "Metroid",
    strength: 88, speed: 86, intelligence: 92, durability: 94,
    specialAbility: "Power Suit with Arm Cannon; Morph Ball; Screw Attack; Phase Drift; has solo-cleared Space Pirate fleets and multiple planet-level threats; Phazon corruption resistance",
    weaknesses: "Suit can be removed; PTSD response to Ridley; has made catastrophically emotional decisions involving Baby Metroid",
    description: "The galaxy's most feared bounty hunter — raised by Chozo aliens, armored in their technology, and personally responsible for the near-extinction of the Metroid species. Twice.",
  },
  {
    name: "Solid Snake",
    universe: "Metal Gear",
    strength: 82, speed: 80, intelligence: 97, durability: 84,
    specialAbility: "Shadow Moses veteran; CQC master; FOXHOUND training; has stopped two separate nuclear wars; will smoke the entire fight; cardboard box escape routes; stealth kills from the blind spots of gods",
    weaknesses: "Accelerated aging from FOXDIE; emotional attachment to Big Boss; refuses to use nuclear weapons even when offered",
    description: "David — the soldier who stopped nuclear war twice, crawls through air vents, outdoes entire armies alone, and has a voice like gravel being poured into gravel.",
  },
  {
    name: "Sonic the Hedgehog",
    universe: "Sega",
    strength: 74, speed: 100, intelligence: 78, durability: 80,
    specialAbility: "Faster than light at full power; Super Sonic form via Chaos Emeralds; Chaos Control; spin dash; runs on water; treats supersonic speed as a mild inconvenience",
    weaknesses: "Overconfidence; cannot swim; slows slightly when not moving at full speed",
    description: "The fastest thing alive — a hedgehog who treats Mach infinity the way most people treat walking, and has defeated planet-destroying robots while complaining about slowness.",
  },
  {
    name: "Mario",
    universe: "Nintendo",
    strength: 80, speed: 78, intelligence: 76, durability: 84,
    specialAbility: "Power-up transformation (Fire, Ice, Tanooki, Cape, Cat, Metal Mario); Galaxy-level platforming; casually lifts and throws Bowser; has punched through entire fortresses; invincibility star",
    weaknesses: "Power-ups can be lost; two-hit mortality without mushroom; consistent inability to find the right castle",
    description: "An Italian plumber who has saved multiple kingdoms, commands fire and ice, rides dinosaurs, and has been to space — all to rescue someone who is frequently fine on her own.",
  },
  {
    name: "Kirby",
    universe: "Nintendo",
    strength: 78, speed: 74, intelligence: 74, durability: 99,
    specialAbility: "Copy Ability — inhales any opponent and gains their complete power set; Hypernova; Ultra Sword; Final Cutter; has casually saved the universe from existence-level threats while remaining cheerful",
    weaknesses: "Copy abilities can be lost; small size sometimes a disadvantage; does not take anything seriously",
    description: "A small pink puffball from Dream Land who has defeated reality-destroying entities by copying their powers, defeated universe-ending dark gods, and smiled the entire time.",
  },
  {
    name: "Bowser",
    universe: "Nintendo",
    strength: 97, speed: 68, intelligence: 72, durability: 96,
    specialAbility: "Blue fire breath; Bowser's shell spike rampage; Ground Pound crater creation; commands Koopa Army of millions; has broken apart entire castles with his hands; Giga Bowser form",
    weaknesses: "Repeatedly loses to a plumber; overconfidence in own superiority; cannot stop kidnapping someone despite evidence it never works",
    description: "King of the Koopas — a tyrant of terrifying power who consistently underestimates Mario, consistently loses, and consistently comes back with a larger castle and the same plan.",
  },
  {
    name: "Ganondorf",
    universe: "Nintendo",
    strength: 96, speed: 74, intelligence: 96, durability: 94,
    specialAbility: "Triforce of Power; Ganon boar transformation; dark magic energy blasts; sword combat mastery; repeatedly reincarnated across centuries; sealed by the gods and keeps escaping",
    weaknesses: "Repeatedly sealed by the same family across multiple timelines; overconfidence in his own destiny",
    description: "The Gerudo King of Evil — the mortal vessel of Demise's hatred, carrying the Triforce of Power across reincarnations in a cycle he refuses to accept is a cycle.",
  },
  {
    name: "Mega Man",
    universe: "Capcom",
    strength: 80, speed: 84, intelligence: 86, durability: 86,
    specialAbility: "Mega Buster; copies any defeated Robot Master's weapon (Metal Blade, Bubble Lead, Air Shooter, all of them); Rush support adaptations; 50+ available weapons simultaneously in late game",
    weaknesses: "Emotionally conflicted about fighting other robots; takes considerable damage before certain weapon weaknesses are exploited",
    description: "The Blue Bomber — a robot boy who defeats every enemy by absorbing their weapon and immediately making it everyone else's problem.",
  },
  {
    name: "Sephiroth",
    universe: "Final Fantasy",
    strength: 97, speed: 90, intelligence: 94, durability: 92,
    specialAbility: "One-Winged Angel; Supernova (attacks the solar system); Masamune blade extending infinite reach; Jenova cells; meteor summoning; 'I will never be a memory'",
    weaknesses: "Obsession with Cloud; Planet's will actively opposes him; the Lifestream can neutralize his power",
    description: "SOLDIER's greatest warrior before his destruction — a silver-haired demigod who can summon supernovas, extend a blade through multiple rooms, and refuse to stay dead.",
  },
  {
    name: "Commander Shepard",
    universe: "Mass Effect",
    strength: 82, speed: 80, intelligence: 98, durability: 86,
    specialAbility: "N7 implants; biotic charge; tech power combos; united the entire galaxy under one banner; has paragon/renegade solutions for every situation; headbutt has 100% success rate",
    weaknesses: "Relies on squad; galaxy-saving is emotionally exhausting; the endings are controversial",
    description: "Commander Shepard — the first human Spectre, who stopped three galactic extinction events, recruited the most dangerous individuals alive, and has a legendary headbutt.",
  },
  {
    name: "Ryu",
    universe: "Street Fighter",
    strength: 88, speed: 82, intelligence: 80, durability: 88,
    specialAbility: "Hadouken; Shoryuken; Tatsumaki Senpukyaku; Satsui no Hado dark power; Power of Nothingness mastery; 40+ years of World Warrior competition; SF6 Prime build",
    weaknesses: "Emotional connection to the Satsui no Hado; no home, no money, no fixed strategy",
    description: "The World Warrior — a wandering martial artist with no address, no possessions, and a disciplined fist that has leveled every challenger who has come for it.",
  },
  {
    name: "2B",
    universe: "NieR: Automata",
    strength: 92, speed: 96, intelligence: 88, durability: 88,
    specialAbility: "YoRHa No.2 Type B combat protocols; Pod 042 support fire; Virtuous Contract katana; self-destruct as area denial; emotion suppression (unreliable but trying); synchronized with 9S",
    weaknesses: "Emotional vulnerability beneath the stoic exterior; logic virus susceptibility; cannot fully stop caring",
    description: "YoRHa No.2 Type B — an android built for war who wears a blindfold, fights with inhuman grace, and is not supposed to feel anything. She does.",
  },
  {
    name: "Pikachu",
    universe: "Pokémon",
    strength: 68, speed: 86, intelligence: 76, durability: 72,
    specialAbility: "10,000,000 Volt Thunderbolt Z-Move; Thunder; Volt Tackle; Lightning Rod; thunderstorm generation; Ash's unconditional belief (statistically OP in practice); iron tail",
    weaknesses: "Ground types nullify electric attacks completely; small physical stature",
    description: "The most famous Pokémon alive — a small electric mouse who has defeated legendary Pokémon, space aliens, time travelers, and dimensional entities through friendship and ten million volts.",
  },
  {
    name: "Gordon Freeman",
    universe: "Half-Life",
    strength: 76, speed: 72, intelligence: 100, durability: 80,
    specialAbility: "HEV Suit; Gravity Gun (launches anything as a projectile at lethal velocity); crowbar; never speaks; the universe itself appears to be protecting him; has never once explained what he's doing",
    weaknesses: "Fully human inside the suit; cannot drive; communicates exclusively by looking at things",
    description: "A theoretical physicist armed with a crowbar and the most versatile weapon in fiction — who stopped two alien invasions, said nothing, and is apparently the Messiah. He hasn't confirmed this.",
  },
  {
    name: "Duke Nukem",
    universe: "3D Realms",
    strength: 92, speed: 78, intelligence: 56, durability: 90,
    specialAbility: "Shrink ray; freeze ray; Devastator; jetpack; ego impervious to all damage types; 'It's time to kick ass and chew bubble gum — and I'm all outta gum'; has defeated multiple alien invasions alone",
    weaknesses: "Ego prevents tactical retreat; development time exceeds human lifespan; taken hostage by own mythology",
    description: "Earth's self-appointed mightiest action hero — a one-liner machine who fights alien invasions on his own schedule, in his own way, and charges them for it.",
  },
  {
    name: "Lara Croft",
    universe: "Tomb Raider",
    strength: 80, speed: 85, intelligence: 96, durability: 84,
    specialAbility: "Dual pistols; explosive arrows; rope ascender; ancient artifact expertise; divine object combat knowledge; has survived events that should have killed her eight times over and found the artifact anyway",
    weaknesses: "Fully human; supernatural artifacts can destabilize her plans; increasingly specific PTSD",
    description: "The Tomb Raider — an Oxford archaeologist who treats ancient death traps as parkour courses, supernatural entities as research subjects, and mortal danger as a Tuesday.",
  },
  {
    name: "Ezio Auditore da Firenze",
    universe: "Assassin's Creed",
    strength: 82, speed: 88, intelligence: 92, durability: 82,
    specialAbility: "Hidden Blade; Assassin Brotherhood commander; Apple of Eden (mind control); counter-kill from any angle; Eagle Vision; Leap of Faith from any height",
    weaknesses: "Age eventually caught up with him; never quite stopped for himself",
    description: "Master Assassin of Renaissance Italy — a Florentine noble who became history's deadliest operative, found an alien mind-control orb, and died peacefully on a bench.",
  },
  {
    name: "Kratos",
    universe: "God of War",
    strength: 99, speed: 80, intelligence: 82, durability: 98,
    specialAbility: "Blades of Chaos; Leviathan Axe (recall); Spartan Rage; has killed the entire Greek pantheon; currently reforming through therapy and fatherhood; Guardian Shield parry",
    weaknesses: "Rage clouds judgment; the weight of what he's done follows him everywhere; trying to be better",
    description: "The Ghost of Sparta — who killed Ares, killed Zeus, killed every Olympian god, and is now raising a son in Norse mythology while trying not to do it again.",
  },
  {
    name: "Master Chief",
    universe: "Halo",
    strength: 92, speed: 88, intelligence: 90, durability: 96,
    specialAbility: "MJOLNIR powered armor; energy shield regeneration; superhuman Spartan augmentations; single-handedly destroyed Halo rings; Cortana tactical AI (formerly); finisher energy sword flip",
    weaknesses: "Tactically relies on Cortana who is no longer reliably available; occasionally too stubborn for strategy",
    description: "Master Chief Petty Officer John-117 — a Spartan supersoldier who has saved humanity from alien genocide, parasitic extinction, and ancient gods, and done it in silence.",
  },
  {
    name: "Nathan Drake",
    universe: "Uncharted",
    strength: 78, speed: 84, intelligence: 90, durability: 82,
    specialAbility: "Treasure hunter's improvisation; handgun mastery; acrobatic traversal of any environment; descendant of Sir Francis Drake (somehow relevant); has survived supernatural events by refusing to take them seriously",
    weaknesses: "Fully human; supernatural forces are usually genuinely trying to kill him; every single adventure ends with him losing the treasure",
    description: "Nathan Drake — an adventurer who has found El Dorado, Shambhala, Iram of the Pillars, and Libertalia, lost every treasure, survived every betrayal, and done it all with a wisecrack.",
  },

  // ── MORE DC ─────────────────────────────────────────────────────────────────
  {
    name: "Booster Gold",
    universe: "DC",
    strength: 75, speed: 84, intelligence: 82, durability: 80,
    specialAbility: "Time travel from the 25th century; force field generation; energy blasts via suit; Skeets AI partner; has secretly saved history more times than any hero knows and received zero credit",
    weaknesses: "Requires suit to use powers; ego desperately needs validation; arrives from a timeline that probably shouldn't have sent him",
    description: "Michael Jon Carter — a football player who stole a time machine, traveled to the present, and secretly became one of history's most important heroes while everyone assumed he was a joke.",
  },
  {
    name: "Blue Beetle (Ted Kord)",
    universe: "DC",
    strength: 72, speed: 80, intelligence: 96, durability: 74,
    specialAbility: "BB Gun non-lethal disruptor; Beetle-Ship airship; peak human martial arts; genius-level inventor; solved multiple crises through intelligence alone; the greatest detective in the room when Batman isn't",
    weaknesses: "No actual superpowers; died being taken seriously for the first time",
    description: "Ted Kord — the Blue Beetle who had no powers, a genius intellect, a best friend in Booster Gold, and died alone to protect the world from something nobody believed.",
  },
  {
    name: "The Question",
    universe: "DC",
    strength: 74, speed: 72, intelligence: 98, durability: 76,
    specialAbility: "Faceless appearance causes psychological unease; master martial artist trained by Richard Dragon; investigative genius; conspiracy detection; presses buttons on anyone with something to hide",
    weaknesses: "Paranoia occasionally compromises operations; extremely particular about the true nature of things",
    description: "Vic Sage — a journalist with a featureless face, a black trenchcoat, and an unshakeable need to know what's really going on, no matter how far that takes him.",
  },
  {
    name: "Harley Quinn",
    universe: "DC",
    strength: 80, speed: 82, intelligence: 88, durability: 84,
    specialAbility: "Joker venom immunity; superhuman acrobatics; oversized mallet; hyenas; pop psychology weaponized as manipulation; certified psychiatrist who uses it offensively",
    weaknesses: "History of dangerous emotional attachment; impulsive; still occasionally vulnerable to Joker influence",
    description: "Dr. Harleen Quinzel — a Gotham psychiatrist who became a villain, survived it, left, and became her own chaotic antihero with better relationships and a bigger mallet.",
  },
  {
    name: "Zatanna",
    universe: "DC",
    strength: 62, speed: 70, intelligence: 92, durability: 68,
    specialAbility: "Backwards-speech sorcery — anything she says backwards happens immediately; can rewrite reality, teleport, transmute matter, erase minds; has retroactively erased events",
    weaknesses: "Gagged or silenced: fully powerless; Backwards speech can be exploited if she panics",
    description: "Zatanna Zatara — a stage magician who does real magic by speaking backwards, and has retroactively undone events, rewritten minds, and bent reality while doing it in fishnets.",
  },
];

const run = async () => {
  console.log(`Seeding ${characters.length} characters...`);
  let inserted = 0;
  let skipped = 0;

  for (const char of characters) {
    try {
      await db
        .insert(charactersTable)
        .values(char)
        .onConflictDoNothing();
      inserted++;
    } catch (err) {
      console.error(`Failed to insert ${char.name}:`, err);
      skipped++;
    }
  }

  console.log(`Done. Inserted: ${inserted}, skipped/errored: ${skipped}`);
  process.exit(0);
};

run();
