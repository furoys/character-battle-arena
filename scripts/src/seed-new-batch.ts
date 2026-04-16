import { db, charactersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const characters = [
  // ── MORTAL KOMBAT ──────────────────────────────────────────────────────────
  {
    name: "Scorpion",
    universe: "Mortal Kombat",
    strength: 88, speed: 85, intelligence: 72, durability: 84,
    specialAbility: "Hellfire spear 'GET OVER HERE'; teleport punch; hellfire inferno; undead resurrection",
    weaknesses: "Rage blinds judgment; vulnerability to ice-based attacks; bound to the Netherrealm",
    description: "Hanzo Hasashi, a murdered ninja warrior resurrected as a hellfire specter to hunt his killer across realms.",
  },
  {
    name: "Sub-Zero",
    universe: "Mortal Kombat",
    strength: 85, speed: 82, intelligence: 78, durability: 86,
    specialAbility: "Cryomancer ice manipulation; ice clone; frozen ground; spine-rip fatality",
    weaknesses: "Fire and heat significantly reduce cryomancy power; emotional attachment to his clan",
    description: "Kuai Liang, grandmaster of the Lin Kuei clan and master of deadly cryomancy — ice made murder.",
  },
  {
    name: "Shao Kahn",
    universe: "Mortal Kombat",
    strength: 97, speed: 70, intelligence: 80, durability: 96,
    specialAbility: "Wrath Hammer obliteration; soul stealing; reality-bending power; 'You will die mortal!'",
    weaknesses: "Overconfidence; bound by Outworld tournament rules when they suit him; arrogance in victory",
    description: "Emperor of Outworld — a conquering tyrant of godlike strength who crushes worlds beneath his boot.",
  },
  {
    name: "Raiden",
    universe: "Mortal Kombat",
    strength: 90, speed: 88, intelligence: 85, durability: 90,
    specialAbility: "Thunder god lightning projection; teleportation; electrocution; Flying Thunder God tackle",
    weaknesses: "Bound by Mortal Kombat rules; has made catastrophically wrong decisions under pressure",
    description: "The immortal protector of Earthrealm — thunder god, champion-maker, and occasional catastrophic failure.",
  },
  {
    name: "Liu Kang",
    universe: "Mortal Kombat",
    strength: 87, speed: 90, intelligence: 82, durability: 85,
    specialAbility: "Flying Dragon Kick; fireball bicycle kick; chosen champion of Mortal Kombat; dragon transformation",
    weaknesses: "Overreliance on honor and rules in a universe with none; too trusting of his allies",
    description: "Earthrealm's greatest champion and Mortal Kombat's perennial winner — a Shaolin warrior of divine fire.",
  },
  {
    name: "Kitana",
    universe: "Mortal Kombat",
    strength: 80, speed: 88, intelligence: 84, durability: 78,
    specialAbility: "Fan Toss razor blades; Fan Lift air suspension; Kiss of Death fatality; 10,000 years of combat training",
    weaknesses: "Loyalty to Sindel and Liu Kang creates hesitation; lighter build vs. brutes",
    description: "Princess of Edenia and assassin-turned-queen — 10,000 years old and still the deadliest blade in the realm.",
  },
  {
    name: "Shang Tsung",
    universe: "Mortal Kombat",
    strength: 78, speed: 80, intelligence: 96, durability: 80,
    specialAbility: "Soul stealing; shapeshifting into any fighter; sorcery and flaming skulls; 'Your soul is mine!'",
    weaknesses: "Requires soul energy to maintain strength; overthinking — too clever for his own good",
    description: "A centuries-old sorcerer who steals souls to remain young and can become any warrior he has consumed.",
  },
  {
    name: "Goro",
    universe: "Mortal Kombat",
    strength: 98, speed: 60, intelligence: 68, durability: 96,
    specialAbility: "Four-armed devastating ground stomp; shokan fireball; multi-limb simultaneous strikes; near-invulnerability",
    weaknesses: "Slow speed; arrogance; four arms make him a large target; defeated repeatedly by humans half his size",
    description: "Half-dragon, half-human prince of the Shokan — nine-time Mortal Kombat champion and absolute unit.",
  },
  {
    name: "Johnny Cage",
    universe: "Mortal Kombat",
    strength: 78, speed: 84, intelligence: 76, durability: 77,
    specialAbility: "Shadow powers; nut punch fatality; Nut Kracker; celebrity presence that somehow works in combat",
    weaknesses: "Ego makes him underestimate opponents; distracted by cameras and own reflection",
    description: "A Hollywood action star whose moves are real and whose sunglasses have survived more apocalypses than most gods.",
  },
  {
    name: "Mileena",
    universe: "Mortal Kombat",
    strength: 84, speed: 89, intelligence: 70, durability: 82,
    specialAbility: "Tele-kick; Sai throw; man-eating Tarkatan jaw maw; clone of Kitana with zero impulse control",
    weaknesses: "Unstable psychologically; Tarkatan nature can override tactics; obsession with Kitana",
    description: "A magically-engineered clone of Kitana with Tarkatan DNA, an insatiable appetite, and zero restraint.",
  },

  // ── DISNEY / ANIMATION ─────────────────────────────────────────────────────
  {
    name: "Mulan",
    universe: "Disney",
    strength: 76, speed: 83, intelligence: 88, durability: 74,
    specialAbility: "Tactical genius; uses opponent's strength against them; rocket-launched fireworks warfare; never gives up",
    weaknesses: "Fully human; relies heavily on creativity in place of raw power; doubted by everyone initially",
    description: "A Chinese soldier who disguised herself as a man, defeated an army with an avalanche, and saved all of China.",
  },
  {
    name: "Maleficent",
    universe: "Disney",
    strength: 82, speed: 84, intelligence: 92, durability: 85,
    specialAbility: "Powerful dark sorcery; dragon transformation; sleeping curse; wings; commands armies of shadow creatures",
    weaknesses: "Emotional vulnerability — betrayal by those she loves is her true weakness",
    description: "The Mistress of All Evil — a faerie queen of terrifying power who cursed a kingdom over a party snub.",
  },
  {
    name: "Hades",
    universe: "Disney",
    strength: 85, speed: 80, intelligence: 90, durability: 88,
    specialAbility: "God of the Underworld; flame hair inferno; soul manipulation; commands all dead; deal-making that always wins",
    weaknesses: "Temper ruins his plans every single time; can be banished by heroic selflessness",
    description: "Lord of the Underworld and the most underpaid god on Olympus — scheming, fast-talking, and genuinely dangerous.",
  },
  {
    name: "Elsa",
    universe: "Disney",
    strength: 80, speed: 82, intelligence: 84, durability: 83,
    specialAbility: "Unlimited ice and snow creation; blizzard generation; ice palace construction in seconds; ice giant summoning",
    weaknesses: "Fear and negative emotion destabilize her power and can make her catastrophically dangerous to allies",
    description: "The Snow Queen of Arendelle — a woman of immense cryomantic power who once flash-froze an entire kingdom.",
  },
  {
    name: "Maui",
    universe: "Disney",
    strength: 93, speed: 78, intelligence: 76, durability: 90,
    specialAbility: "Shape-shifting via magical fish hook; demigod strength; slowed a sun; pulled up islands from the ocean floor",
    weaknesses: "Without his hook he loses transformation; insecurity and need for human praise",
    description: "The demigod of the wind and sea — a massive, tattooed legend who shaped the world and will tell you about it.",
  },
  {
    name: "Shan Yu",
    universe: "Disney",
    strength: 92, speed: 80, intelligence: 82, durability: 88,
    specialAbility: "Superhuman strength and endurance; expert sword combat; commands the Hun army; survived an avalanche instantly",
    weaknesses: "Pride; underestimates opponents; stopped by fireworks (twice)",
    description: "Leader of the Hun invasion of China — a mountain of a man who walked through an avalanche and shook it off.",
  },
  {
    name: "Simba",
    universe: "Disney",
    strength: 86, speed: 84, intelligence: 74, durability: 82,
    specialAbility: "Lion king battle roar; pride rock combat mastery; calls upon ancestor spirits; never stays dead narratively",
    weaknesses: "Trauma and guilt can paralyze him; took decades to confront his problems",
    description: "The Lion King — royalty, literally. Survived assassination as a cub, conquered grief, and reclaimed a kingdom.",
  },
  {
    name: "Jack Sparrow",
    universe: "Disney",
    strength: 68, speed: 72, intelligence: 96, durability: 70,
    specialAbility: "Absolute unpredictability; drunken sword style that is actually deadly; cursed undead; cannot be cornered",
    weaknesses: "Cowardice when the odds are honest; rum is always gone; no plan survives contact with him",
    description: "Captain of the Black Pearl — the worst pirate you've ever heard of, or so people keep saying.",
  },

  // ── KAIJU & GIANT MONSTERS ─────────────────────────────────────────────────
  {
    name: "Godzilla",
    universe: "Kaiju",
    strength: 100, speed: 50, intelligence: 75, durability: 100,
    specialAbility: "Atomic breath; nuclear pulse; near-indestructibility; regeneration; grows more powerful from nuclear energy",
    weaknesses: "Slow speed; arrogance; the Oxygen Destroyer; other alpha kaiju can challenge him",
    description: "The King of the Monsters — a living nuclear weapon 300 meters tall who ended the atomic age by becoming it.",
  },
  {
    name: "King Kong",
    universe: "Kaiju",
    strength: 98, speed: 65, intelligence: 82, durability: 95,
    specialAbility: "Skull Island combat instinct; bioelectric axe; extraordinary intelligence for his size; surprisingly fast learner",
    weaknesses: "Smaller than Godzilla; emotional vulnerability to humans; lightning is double-edged",
    description: "The last of his kind and protector of Skull Island — 300 feet of raw intelligence, fury, and loyalty.",
  },
  {
    name: "King Ghidorah",
    universe: "Kaiju",
    strength: 99, speed: 72, intelligence: 70, durability: 98,
    specialAbility: "Triple gravity beam from three heads; each head thinks independently; flight at Mach 3; rapid regeneration",
    weaknesses: "Heads argue with each other; Godzilla can sever heads; electromagnetic vulnerability",
    description: "A three-headed golden dragon from space who has destroyed entire planets and makes Godzilla fight hard.",
  },
  {
    name: "Mechagodzilla",
    universe: "Kaiju",
    strength: 97, speed: 68, intelligence: 90, durability: 99,
    specialAbility: "Proton Scream; titanium armor; missiles from every surface; can simulate Godzilla's atomic breath perfectly",
    weaknesses: "Requires massive power source; vulnerable to EMP; controlled by whoever built it this time",
    description: "A mechanical titan built to kill Godzilla — a robotic monster that matches the original and adds missiles.",
  },

  // ── HORROR ICONS ───────────────────────────────────────────────────────────
  {
    name: "Freddy Krueger",
    universe: "Horror",
    strength: 80, speed: 78, intelligence: 88, durability: 85,
    specialAbility: "Dream manipulation; kills in dreams cause real death; reality warping inside nightmares; finger knives",
    weaknesses: "Powerless when awake if no one fears him; can be pulled into the real world and made vulnerable",
    description: "The burned child murderer of Elm Street — infinitely powerful inside your dreams, and you will dream.",
  },
  {
    name: "Jason Voorhees",
    universe: "Horror",
    strength: 96, speed: 70, intelligence: 62, durability: 100,
    specialAbility: "True immortality — cannot be killed; superhuman strength; tracking instinct; machete mastery; back from everything",
    weaknesses: "Slow; can't swim (originally); water; his mother's voice can stop him",
    description: "The unkillable masked killer of Camp Crystal Lake — murdered, drowned, hanged, electrocuted, and always back.",
  },
  {
    name: "Michael Myers",
    universe: "Horror",
    strength: 88, speed: 68, intelligence: 72, durability: 98,
    specialAbility: "The Shape; near-invulnerability; supernatural patience; kills across decades; no motivation, no stopping",
    weaknesses: "Fire; decapitation (sometimes); seems to have a thing about his sister that might theoretically pause him",
    description: "Pure evil in a mask — a six-year-old who killed his sister and has spent 40 years improving at it.",
  },
  {
    name: "Pennywise",
    universe: "Horror",
    strength: 88, speed: 85, intelligence: 92, durability: 90,
    specialAbility: "Shape-shifting into deepest fears; deadlights that paralyze; feeding on fear; 27-year hibernation cycle",
    weaknesses: "Can be weakened if its targets stop being afraid; belief and unity can actually hurt it",
    description: "An ancient cosmic horror that lives in Derry's sewers and wears a clown suit to eat children every 27 years.",
  },
  {
    name: "Pinhead",
    universe: "Horror",
    strength: 86, speed: 72, intelligence: 95, durability: 92,
    specialAbility: "Chains of pain from nowhere; dimensional summoning; 'no tears please — it's a waste of good suffering'",
    weaknesses: "Bound by the rules of the Lament Configuration; can be sent back to hell by the puzzle box",
    description: "The Lead Cenobite — a former war hero who solved the Lament Configuration and became an angel of absolute pain.",
  },
  {
    name: "Ash Williams",
    universe: "Horror",
    strength: 80, speed: 76, intelligence: 78, durability: 84,
    specialAbility: "Boomstick; chainsaw hand; Evil Dead knowledge; Necronomicon expertise; S-Mart hardware improvisation",
    weaknesses: "Ego; his own possessed hand; time travel keeps complicating everything",
    description: "The Chosen One against the Deadites — a sporting goods clerk who fights demons with a shotgun and a chainsaw.",
  },

  // ── FILM ICONS ─────────────────────────────────────────────────────────────
  {
    name: "RoboCop",
    universe: "Sci-Fi Films",
    strength: 92, speed: 72, intelligence: 85, durability: 97,
    specialAbility: "Titanium chassis; Auto-9 with near-perfect accuracy; Prime Directives that override all else; never tires",
    weaknesses: "Directive 4 (hidden) can shut him down; still has Murphy's memories creating emotional conflicts",
    description: "Alex Murphy — murdered Detroit cop rebuilt as a cyborg law enforcer. Part man. Part machine. All cop.",
  },
  {
    name: "Blade",
    universe: "Marvel Films",
    strength: 88, speed: 90, intelligence: 84, durability: 87,
    specialAbility: "Dhampir — all vampire strengths, none of the weaknesses; titanium sword; UV rounds; vampire daywalker",
    weaknesses: "The Thirst — blood hunger that must be managed; serum dependency",
    description: "The Daywalker — born from a dying vampire's bite, Eric Brooks hunts what made him with silver and fury.",
  },
  {
    name: "The Mask",
    universe: "Films",
    strength: 95, speed: 99, intelligence: 85, durability: 99,
    specialAbility: "Cartoon physics reality bending; infinite weapon production; impossible speed; Loki's mask empowerment",
    weaknesses: "The mask can be removed; the wearer's personality shapes its use — chaos sometimes backfires",
    description: "Stanley Ipkiss wearing a Norse god's mask — a meek nobody transformed into an unstoppable cartoon god of chaos.",
  },
  {
    name: "Beetlejuice",
    universe: "Films",
    strength: 82, speed: 86, intelligence: 88, durability: 88,
    specialAbility: "Reality warping; transformation; summons sand worms; ghost powers; 'Say my name three times'",
    weaknesses: "Saying his name three times summons AND banishes him; can't cross into the real world unaided",
    description: "The ghost with the most — a bio-exorcist who haunts with style, transforms without limit, and never shuts up.",
  },
  {
    name: "Neo",
    universe: "The Matrix",
    strength: 92, speed: 96, intelligence: 92, durability: 90,
    specialAbility: "Bullet time; code-level reality perception; martial arts mastery of all styles; can stop bullets with his mind",
    weaknesses: "Outside the Matrix, significantly reduced powers; emotional attachment to Trinity",
    description: "The One — Thomas Anderson reborn as a messiah who bends the Matrix's reality and eventually transcends it.",
  },
  {
    name: "T'Challa / Black Panther",
    universe: "Marvel",
    strength: 88, speed: 87, intelligence: 92, durability: 88,
    specialAbility: "Vibranium suit absorbs kinetic energy; heart-shaped herb enhanced senses and strength; Panther God blessing",
    weaknesses: "Vibranium can be countered by sufficiently advanced tech; his people's safety is his true weakness",
    description: "King of Wakanda and the Black Panther — humanity's greatest warrior-king wrapped in the world's most advanced metal.",
  },
  {
    name: "V",
    universe: "Films",
    strength: 82, speed: 88, intelligence: 97, durability: 84,
    specialAbility: "Ideological warfare; can be shot and keep fighting on will alone; knife mastery; theatrical precision",
    weaknesses: "Works alone by design; vulnerability in his obsession with the date and his revenge plan",
    description: "Remember, remember — a masked anarchist philosopher who dismantled a fascist government with ideas and knives.",
  },
  {
    name: "Ellen Ripley (Power Loader)",
    universe: "Alien",
    strength: 90, speed: 60, intelligence: 94, durability: 85,
    specialAbility: "Weyland-Yutani power loader; tactical genius against xenomorphs; gets children out alive; airlock mastery",
    weaknesses: "Human inside the machine — the loader can fail; maternal instinct creates exploitable vulnerability",
    description: "The woman who went toe-to-toe with the Alien Queen in a mechanical exosuit and told it to get away from her girl.",
  },
  {
    name: "The Bride of Frankenstein",
    universe: "Horror",
    strength: 82, speed: 72, intelligence: 65, durability: 80,
    specialAbility: "Undead resilience; electric reanimation; terrifying screech; impossible to control or predict",
    weaknesses: "Limited intelligence; rejected the monster she was built to love; emotionally volatile",
    description: "Created to be a companion and chose death instead — the original woman who wouldn't settle.",
  },

  // ── MORE ANIME ────────────────────────────────────────────────────────────
  {
    name: "Tanjiro Kamado",
    universe: "Demon Slayer",
    strength: 86, speed: 90, intelligence: 82, durability: 85,
    specialAbility: "Water Breathing and Sun Breathing techniques; Demon Slayer Mark awakening; supernatural smell sense",
    weaknesses: "Human limits without the mark; the mark shortens lifespan; cannot kill demons using normal means",
    description: "A kind-hearted demon slayer who carries his demon sister on his back and perfected the lost Sun Breathing form.",
  },
  {
    name: "Muzan Kibutsuji",
    universe: "Demon Slayer",
    strength: 97, speed: 98, intelligence: 95, durability: 99,
    specialAbility: "Demon King; transforms body into any weapon; instantly kills any demon via blood control; sun immunity evolved",
    weaknesses: "Sunlight (original weakness); the blue spider lily; the Demon Slayer Corps can theoretically end him",
    description: "The Demon King — 1000 years old, shaped like a businessman, and the source of every demon in existence.",
  },
  {
    name: "Zenitsu Agatsuma",
    universe: "Demon Slayer",
    strength: 84, speed: 99, intelligence: 72, durability: 80,
    specialAbility: "Thunderclap and Flash — Godspeed; only functional while unconscious or asleep; lightning speed beyond perception",
    weaknesses: "Terrified of his own power; must be unconscious to reach full potential; constant crying",
    description: "A coward whose sleeping body becomes the fastest swordsman alive — Thunderclap and Flash, seven times.",
  },
  {
    name: "Sukuna",
    universe: "Jujutsu Kaisen",
    strength: 99, speed: 97, intelligence: 98, durability: 99,
    specialAbility: "Dismantle and Cleave cursed techniques; Domain Expansion: Malevolent Shrine; 20-finger full power",
    weaknesses: "Requires a host body to act freely; bound by binding vows when he makes them",
    description: "The King of Curses — an ancient sorcerer so powerful he was dismembered and his fingers became cursed objects.",
  },
  {
    name: "Yuta Okkotsu",
    universe: "Jujutsu Kaisen",
    strength: 94, speed: 92, intelligence: 86, durability: 90,
    specialAbility: "Rika the Queen of Curses (unlimited cursed energy); Copy technique; Special Grade sorcerer; infinite cursed energy",
    weaknesses: "Emotional attachment to Rika creates unpredictability; reserves power beyond its optimal release point",
    description: "A Special Grade sorcerer haunted by his childhood love turned monstrous cursed spirit — and that's a compliment.",
  },
  {
    name: "Nagato (Pain)",
    universe: "Naruto",
    strength: 88, speed: 80, intelligence: 95, durability: 86,
    specialAbility: "Six Paths of Pain — six bodies each with a unique power; Shinra Tensei; Chibaku Tensei; Rinnegan mastery",
    weaknesses: "The real Nagato is frail and far from battle; destroying the paths can end him; ideology exploitable",
    description: "The man who destroyed Konoha in an afternoon with six corpse puppets — God of Pain and the Rinnegan's vessel.",
  },
  {
    name: "Ainz Ooal Gown",
    universe: "Overlord",
    strength: 92, speed: 85, intelligence: 99, durability: 98,
    specialAbility: "Supreme Overlord; YGGDRASIL's greatest player; instant death magic; undead army of 100 levels; World Items",
    weaknesses: "Emotion-suppressing undead nature removes his human judgment; genuinely improvising and pretending not to be",
    description: "An office worker turned into his own skeleton avatar — now a world-ruling Overlord who is making it up as he goes.",
  },
  {
    name: "Anos Voldigoad",
    universe: "Misfit of Demon King Academy",
    strength: 100, speed: 100, intelligence: 100, durability: 100,
    specialAbility: "Literally unkillable; can destroy concepts; turns any attack into advantage; erased and recreated multiple times",
    weaknesses: "None established — plays by his own rules at all times and wins regardless of the rules",
    description: "The reincarnated Demon King of Tyranny — so powerful he destroyed the world's logic by existing, and it worked out.",
  },
  {
    name: "Shinra Kusakabe",
    universe: "Fire Force",
    strength: 88, speed: 99, intelligence: 80, durability: 85,
    specialAbility: "Adolla Burst; Hysterical Strength; Rapid — ignites feet for jet propulsion at Mach speed; devil's footprints",
    weaknesses: "Nervous grin makes people distrust him; emotional investment in saving his brother clouds judgment",
    description: "A third-generation pyrokinetic who lights his feet on fire to travel faster than the eye can follow.",
  },

  // ── MORE SUPERHEROES & VILLAINS ────────────────────────────────────────────
  {
    name: "Venom",
    universe: "Marvel",
    strength: 94, speed: 85, intelligence: 80, durability: 92,
    specialAbility: "Alien symbiote; can copy Spider-Man's powers; invisibility; tendrils; immune to Spider-sense; 'We are Venom'",
    weaknesses: "Sonic attacks; fire; can be separated from host",
    description: "Eddie Brock and his alien symbiote partner — two minds in one body who have decided: We are Venom.",
  },
  {
    name: "Carnage",
    universe: "Marvel",
    strength: 96, speed: 88, intelligence: 74, durability: 93,
    specialAbility: "Red symbiote permanently bonded; weapons from own body; mass murder as a hobby; cannot be fully killed",
    weaknesses: "Fire and sonic attacks; anti-symbiote weapons; his own chaos occasionally undermines tactics",
    description: "Cletus Kasady merged with a symbiote that is stronger than Venom — and he just wants to watch everything burn.",
  },
  {
    name: "Doctor Doom",
    universe: "Marvel",
    strength: 88, speed: 75, intelligence: 100, durability: 92,
    specialAbility: "Doom Armor; sorcery; time travel; God-level intellect; sovereign immunity; has defeated Beyonder",
    weaknesses: "Pride — cannot acknowledge anyone as truly equal or superior; obsession with Richards",
    description: "Victor Von Doom — ruler of Latveria, master sorcerer, and the smartest man alive who will tell you so himself.",
  },
  {
    name: "Galactus",
    universe: "Marvel",
    strength: 100, speed: 90, intelligence: 100, durability: 100,
    specialAbility: "The Power Cosmic; eats planets to survive; can recreate the universe; existence-level threat; god among gods",
    weaknesses: "Requires constant planet consumption; the Ultimate Nullifier; Infinity Gauntlet level power required",
    description: "The Devourer of Worlds — an entity older than the current universe who eats planets the way we eat lunch.",
  },
  {
    name: "Juggernaut",
    universe: "Marvel",
    strength: 99, speed: 72, intelligence: 68, durability: 100,
    specialAbility: "Nothing stops the Juggernaut; Cyttorak gem grants unstoppable momentum; invulnerable helmet; immovable object",
    weaknesses: "Helmet must be removed to affect his mind; sufficiently large obstacles can slow momentum",
    description: "Cain Marko, empowered by the Crimson Gem of Cyttorak — once in motion, nothing in the universe stops him.",
  },
  {
    name: "Green Goblin",
    universe: "Marvel",
    strength: 86, speed: 84, intelligence: 94, durability: 84,
    specialAbility: "Goblin Formula superhuman enhancement; pumpkin bombs; razor bats; glider; knows Spider-Man's identity",
    weaknesses: "Oscillating madness; obsession with Spider-Man as his 'true' nemesis above all else",
    description: "Norman Osborn unhinged — a genius industrialist who drank his own serum and became Peter Parker's worst nightmare.",
  },
  {
    name: "Sinestro",
    universe: "DC Comics",
    strength: 88, speed: 87, intelligence: 92, durability: 88,
    specialAbility: "Yellow Fear Ring — can manifest anything; emotion of fear amplified into constructs; former greatest Green Lantern",
    weaknesses: "The ring requires fear to power; can be matched by a willpower ring in the hands of the determined",
    description: "Thaal Sinestro — once the greatest Green Lantern, now the greatest fear-powered one. His logic is impeccable.",
  },
  {
    name: "Reverse Flash",
    universe: "DC Comics",
    strength: 88, speed: 99, intelligence: 90, durability: 86,
    specialAbility: "Negative Speed Force; vibration through matter; time travel; creates temporal paradoxes; obsessed with Barry Allen",
    weaknesses: "The obsession with the Flash makes him predictable; Negative Speed Force is more volatile than the real thing",
    description: "Eobard Thawne — a man from the 25th century who hated his hero so much he became the villain of history itself.",
  },
  {
    name: "Vision",
    universe: "Marvel",
    strength: 90, speed: 85, intelligence: 96, durability: 94,
    specialAbility: "Density manipulation; phasing through matter; solar beam from forehead gem; android processing speed",
    weaknesses: "Existential crises at critical moments; can be hacked or depowered; the Mind Stone dependency",
    description: "An android built from hate who chose to be human — Vision processes reality faster than thought and phases through walls.",
  },
  {
    name: "Namor",
    universe: "Marvel",
    strength: 96, speed: 88, intelligence: 84, durability: 94,
    specialAbility: "Underwater king; flight via ankle wings; superhuman aquatic speed; Vibranium trident; Talokan empowerment",
    weaknesses: "Dehydration weakens him significantly; arrogance creates tactical blind spots; hates being called a mutant",
    description: "The Sub-Mariner — the first mutant, king of Atlantis/Talokan, and the most imperious man in any ocean.",
  },
  {
    name: "Loki",
    universe: "Marvel",
    strength: 86, speed: 82, intelligence: 97, durability: 86,
    specialAbility: "Illusion mastery; Frost Giant sorcery; God of Mischief scheming; Variant time-travel; shape-shifting",
    weaknesses: "Cannot resist a scheme even when he's winning; betrayal is instinct even against his own interests",
    description: "The God of Mischief and Stories — he's betrayed every ally he has, usually twice, and somehow we still root for him.",
  },
  {
    name: "Black Widow",
    universe: "Marvel",
    strength: 80, speed: 85, intelligence: 92, durability: 78,
    specialAbility: "Red Room training; Widow's Bite electric discharges; master of every martial art; world-class spy and assassin",
    weaknesses: "Fully human despite exceptional conditioning; no powers in a world of gods",
    description: "Natasha Romanoff — forged in the Red Room into the world's greatest spy, who can outfox gods and gods know it.",
  },
];

async function main() {
  console.log("Seeding new batch of characters...");
  const existing = await db.select({ name: charactersTable.name }).from(charactersTable);
  const existingNames = new Set(existing.map(c => c.name.toLowerCase()));

  let added = 0;
  let skipped = 0;

  for (const char of characters) {
    if (existingNames.has(char.name.toLowerCase())) {
      console.log(`  Skipping (exists): ${char.name}`);
      skipped++;
      continue;
    }
    await db.insert(charactersTable).values({ ...char, imageUrl: null });
    console.log(`  Added: ${char.name}`);
    added++;
  }

  console.log(`\nDone — Added: ${added}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
