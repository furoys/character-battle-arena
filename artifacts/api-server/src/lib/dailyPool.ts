// ── Daily Matchup Pool ────────────────────────────────────────────────────────
// Curated set of matchups that get rotated through the "Daily Matchup" feature.
// Each day's pick is deterministic: index = (daysSinceEpoch) % pool.length.
// Titles are the prompt the user sees on the daily card.
//
// NEVER reorder entries — the pool index controls which day each one falls on.
// To swap one out, replace it in place with a new matchup (same array slot)
// or append new ones at the end.

export type DailyPoolEntry = {
  id: string;
  title: string;
  hook: string; // one-line teaser shown above the matchup
  team1Ids: number[];
  team2Ids: number[];
};

export const DAILY_POOL: DailyPoolEntry[] = [
  { id: "superman-vs-thor",                   title: "Son of Krypton vs Son of Odin",            hook: "Solar invulnerability vs Asgardian magic.",                  team1Ids: [1],   team2Ids: [7] },
  { id: "thanos-vs-darkseid",                 title: "Cosmic Tyrants — The Final War",           hook: "Infinity Gauntlet vs Anti-Life Equation.",                   team1Ids: [29],  team2Ids: [89] },
  { id: "batman-vs-john-wick",                title: "Prepared Billionaire vs The Boogeyman",    hook: "Bat-prep vs pencil-kill.",                                   team1Ids: [13],  team2Ids: [100] },
  { id: "goku-vs-naruto",                     title: "Saiyan God vs Ninja God",                  hook: "Dragon Ball physics vs Six Paths Sage Mode.",                team1Ids: [2],   team2Ids: [6] },
  { id: "gojo-vs-sukuna",                     title: "The JJK Final Answer",                     hook: "Infinity vs Malevolent Shrine.",                             team1Ids: [84],  team2Ids: [178] },
  { id: "saitama-vs-superman",                title: "Unstoppable Force vs Immovable Object",    hook: "Serious punch vs solar-charged Kryptonian.",                 team1Ids: [87],  team2Ids: [1] },
  { id: "saitama-vs-goku",                    title: "One Punch vs Infinite Power",              hook: "Limitless joke hero vs ultra-instinct god.",                 team1Ids: [87],  team2Ids: [2] },
  { id: "cloud-vs-sephiroth",                 title: "Cloud vs Sephiroth — Eternal Rematch",     hook: "Buster Sword vs Masamune.",                                  team1Ids: [72],  team2Ids: [73] },
  { id: "kratos-vs-doomslayer",               title: "God Killer vs Hell Killer",                hook: "Pure aggression in a closed room.",                          team1Ids: [69],  team2Ids: [97] },
  { id: "kratos-vs-master-chief",             title: "God Killer vs Spartan",                    hook: "Demigod rage vs Mjolnir armor.",                             team1Ids: [69],  team2Ids: [71] },
  { id: "sub-zero-vs-scorpion",               title: "Ice vs Fire — The MK War",                 hook: "The most rematched fight in gaming.",                        team1Ids: [141], team2Ids: [140] },
  { id: "voldemort-vs-gandalf",               title: "Dark Lord vs The White",                   hook: "Wizard apex predators.",                                     team1Ids: [43],  team2Ids: [10] },
  { id: "geralt-vs-aragorn",                  title: "The Witcher vs The King",                  hook: "Mutant swordsman vs Dúnedain ranger.",                       team1Ids: [70],  team2Ids: [66] },
  { id: "alien-vs-predator",                  title: "Xenomorph vs Predator",                    hook: "Rite of passage hunt.",                                      team1Ids: [82],  team2Ids: [81] },
  { id: "predator-vs-terminator",             title: "Hunter vs Machine",                        hook: "Active camo vs no heat signature.",                          team1Ids: [81],  team2Ids: [80] },
  { id: "kratos-vs-thor",                     title: "God of War vs Asgard's Thor",              hook: "He's already killed the Norse one.",                         team1Ids: [69],  team2Ids: [7] },
  { id: "zeus-vs-thor",                       title: "King of Olympus vs Asgardian Thunder",     hook: "Greek vs Norse pantheon war.",                               team1Ids: [78],  team2Ids: [7] },
  { id: "deadpool-vs-deathstroke",            title: "Merc with a Mouth vs Merc with a Mission", hook: "Mouth vs precision.",                                        team1Ids: [28],  team2Ids: [19] },
  { id: "spiderman-vs-daredevil",             title: "New York's Finest",                        hook: "Spider-sense vs radar sense.",                               team1Ids: [3],   team2Ids: [35] },
  { id: "batman-vs-daredevil",                title: "No Powers. Just Fists.",                   hook: "World's greatest martial artist debate.",                    team1Ids: [13],  team2Ids: [35] },
  { id: "batman-vs-punisher",                 title: "No Killing vs No Mercy",                   hook: "Code vs no code.",                                           team1Ids: [13],  team2Ids: [112] },
  { id: "doom-vs-lex",                        title: "Evil Genius Summit",                       hook: "Doom vs Luthor, no help allowed.",                           team1Ids: [186], team2Ids: [20] },
  { id: "scarlet-witch-vs-wonder-woman",      title: "Chaos Magic vs Amazon Goddess",            hook: "Reality warping vs divine champion.",                        team1Ids: [31],  team2Ids: [4] },
  { id: "scarlet-witch-vs-dr-strange",        title: "Chaos Magic vs Sorcerer Supreme",          hook: "Post-WandaVision Wanda was terrifying.",                     team1Ids: [31],  team2Ids: [25] },
  { id: "green-lantern-vs-silver-surfer",     title: "Willpower vs Power Cosmic",                hook: "Ring constructs vs cosmic awareness.",                       team1Ids: [16],  team2Ids: [32] },
  { id: "superman-vs-sentry",                 title: "Man of Steel vs Man of a Million Suns",    hook: "Identical sheets, different psyche.",                        team1Ids: [1],   team2Ids: [338] },
  { id: "flash-vs-quicksilver",               title: "The Flash vs Quicksilver",                 hook: "DC speedster vs Marvel speedster.",                          team1Ids: [789], team2Ids: [701] },
  { id: "beerus-vs-darkseid",                 title: "God of Destruction vs Lord of Apokolips",  hook: "Hakai vs Omega Beams.",                                      team1Ids: [40],  team2Ids: [89] },
  { id: "phoenix-vs-galactus",                title: "Phoenix Force vs World Eater",             hook: "Cosmic fire vs cosmic hunger.",                              team1Ids: [329], team2Ids: [187] },
  { id: "anti-monitor-vs-thanos",             title: "Universe Enders",                          hook: "Antimatter god vs Reality Stone.",                           team1Ids: [482], team2Ids: [29] },
  { id: "galactus-vs-anos",                   title: "World Eater vs Demon King",                hook: "Anos broke time once. Twice.",                               team1Ids: [187], team2Ids: [182] },
  { id: "ghost-rider-vs-pennywise",           title: "Spirit of Vengeance vs The Deadlights",    hook: "Penance Stare vs eldritch terror.",                          team1Ids: [33],  team2Ids: [165] },
  { id: "neo-vs-terminator",                  title: "The One vs The Machine",                   hook: "Inside vs outside the Matrix.",                              team1Ids: [103], team2Ids: [80] },
  { id: "optimus-vs-vader",                   title: "Optimus Prime vs Darth Vader",             hook: "Force choke on a 30-foot robot.",                            team1Ids: [107], team2Ids: [9] },
  { id: "master-chief-vs-solid-snake",        title: "Spartan vs Tactical Espionage God",        hook: "Mjolnir armor vs a cardboard box.",                          team1Ids: [71],  team2Ids: [215] },
  { id: "robocop-vs-judge-dredd",             title: "Law Enforcement Endgame",                  hook: "Cyborg cop vs the Law itself.",                              team1Ids: [168], team2Ids: [562] },
  { id: "wick-vs-bourne",                     title: "The Boogeyman vs The Asset",               hook: "Aggression vs adaptability.",                                team1Ids: [100], team2Ids: [118] },
  { id: "sherlock-vs-light",                  title: "World's Greatest Detective vs Kira",       hook: "Pure intelligence war.",                                     team1Ids: [8],   team2Ids: [465] },
  { id: "sauron-vs-voldemort",                title: "Rings of Power vs Horcruxes",              hook: "Two Dark Lords, different scales.",                          team1Ids: [68],  team2Ids: [43] },
  { id: "naruto-vs-sasuke-final",             title: "Final Valley — No Limits",                 hook: "Six Paths vs Rinnegan.",                                     team1Ids: [6],   team2Ids: [52] },
  { id: "itachi-vs-sasuke",                   title: "The Brother War",                          hook: "Healthy Itachi vs Eternal Sharingan Sasuke.",                team1Ids: [54],  team2Ids: [52] },
  { id: "rimuru-vs-goku",                     title: "Slime God vs Super Saiyan",                hook: "Skill absorption vs ki transcendence.",                      team1Ids: [95],  team2Ids: [2] },
  { id: "solo-leveling-vs-hxh",               title: "Shadow Monarch vs Chimera Ant King",       hook: "Adapt or join the army.",                                    team1Ids: [321], team2Ids: [91] },
  { id: "dante-vs-vergil",                    title: "DMC Brothers",                             hook: "Rebellion vs Yamato.",                                       team1Ids: [74],  team2Ids: [543] },
  { id: "link-vs-cloud",                      title: "Hero of Time vs SOLDIER First Class",      hook: "Master Sword vs Buster Sword.",                              team1Ids: [75],  team2Ids: [72] },
  { id: "daenerys-vs-cersei",                 title: "Fire and Blood vs Lions",                  hook: "Drogon vs the Red Keep.",                                    team1Ids: [63],  team2Ids: [538] },
  { id: "night-king-vs-sauron",               title: "Army of the Dead vs Army of Mordor",       hook: "Two dark hosts collide.",                                    team1Ids: [64],  team2Ids: [68] },
  { id: "hela-vs-apocalypse",                 title: "Hela vs Apocalypse — Destroyers",          hook: "Asgardian death goddess vs mutant tyrant.",                  team1Ids: [664], team2Ids: [660] },
  { id: "goku-vs-vegeta",                     title: "Rivals for Eternity",                      hook: "Ultra Instinct vs Ultra Ego.",                               team1Ids: [2],   team2Ids: [12] },

  // ── Team-vs-Team marquee matchups ────────────────────────────────────────────
  // Big roster fights — Avengers vs X-Men, Justice League vs Legion of Doom,
  // etc. The fight simulator already supports multi-character teams; these
  // matchups give the daily a different flavor than 1-on-1 brawls.
  { id: "avengers-vs-xmen",                   title: "Avengers vs X-Men",                        hook: "Earth's Mightiest vs the Children of the Atom.",             team1Ids: [5, 24, 7, 23, 195],            team2Ids: [26, 328, 88, 329, 659] },
  { id: "avengers-vs-justice-league",         title: "Avengers vs Justice League",               hook: "The eternal what-if. Marvel Six vs DC Big Five.",            team1Ids: [5, 24, 7, 23, 195],            team2Ids: [1, 13, 4, 789, 15] },
  { id: "justice-league-vs-legion-of-doom",   title: "Justice League vs Legion of Doom",         hook: "Watchtower vs Hall of Doom — winner takes Earth.",           team1Ids: [1, 13, 4, 789, 15],            team2Ids: [20, 790, 190, 646, 191] },
  { id: "bat-family-vs-rogues",               title: "Bat-Family vs Gotham's Rogues",            hook: "Robin, Nightwing, Red Hood, Catwoman & Batman vs the worst night of their lives.", team1Ids: [13, 349, 346, 348, 350], team2Ids: [790, 237, 128, 357, 353] },
  { id: "teen-titans-vs-x-men",               title: "Teen Titans vs X-Men",                     hook: "Young hero squads collide — Robin & Raven vs Wolverine & Storm.", team1Ids: [349, 360, 359, 361, 358], team2Ids: [26, 328, 88, 329, 333] },
  { id: "z-fighters-vs-dbz-villains",         title: "Z-Fighters vs DBZ Big Bads",               hook: "Goku, Vegeta, Gohan, Piccolo — vs Frieza, Cell, Broly.",     team1Ids: [2, 12, 36, 37],                team2Ids: [38, 39, 42] },
  { id: "akatsuki-coup",                      title: "Itachi & Sasuke vs Naruto",                hook: "Two Uchiha brothers ambush the Seventh Hokage.",             team1Ids: [54, 52],                       team2Ids: [6] },
  { id: "marvel-cosmic-vs-dc-cosmic",         title: "Marvel Cosmic vs DC Cosmic",               hook: "Thanos, Galactus & Phoenix vs Darkseid, Anti-Monitor & Trigon.", team1Ids: [29, 187, 329],            team2Ids: [89, 482, 485] },
  { id: "sorcerers-summit",                   title: "Sorcerers' Summit",                        hook: "Dr. Strange, Scarlet Witch & Dr. Fate vs Voldemort, Saruman & Sauron.", team1Ids: [25, 31, 470],         team2Ids: [43, 99, 68] },
  { id: "speedsters-relay",                   title: "Speedsters Relay — DC vs Marvel",          hook: "Flash & Reverse-Flash vs Quicksilver & Nightcrawler.",       team1Ids: [789, 191],                     team2Ids: [701, 333] },
  { id: "billionaires-with-toys",             title: "Billionaires With Toys",                   hook: "Batman & Iron Man vs Lex Luthor & Doctor Doom.",             team1Ids: [13, 5],                        team2Ids: [20, 186] },
  { id: "street-tier-war",                    title: "Street-Tier War",                          hook: "Daredevil, Punisher & John Wick vs Deathstroke, Deadpool & Winter Soldier.", team1Ids: [35, 112, 100], team2Ids: [19, 28, 337] },

  // ── More 1-on-1 marquee fights ───────────────────────────────────────────────
  { id: "iron-man-vs-batman",                 title: "Genius Billionaire Showdown",              hook: "Stark tech vs Bat-prep, gloves off.",                        team1Ids: [5],   team2Ids: [13] },
  { id: "hulk-vs-superman",                   title: "Strongest There Is vs Man of Steel",       hook: "The angrier he gets, the stronger he gets.",                 team1Ids: [23],  team2Ids: [1] },
  { id: "captain-america-vs-wonder-woman",    title: "Star-Spangled vs Amazon Princess",         hook: "Shield of Vibranium vs Bracelets of Submission.",            team1Ids: [24],  team2Ids: [4] },
  { id: "wolverine-vs-deadpool",              title: "Wolverine vs Deadpool",                    hook: "Regen vs regen — who taps first?",                           team1Ids: [26],  team2Ids: [28] },
  { id: "wolverine-vs-sabretooth",            title: "Wolverine vs Sabretooth",                  hook: "The blood feud that never ends.",                            team1Ids: [26],  team2Ids: [700] },
  { id: "spider-man-vs-venom",                title: "Spider-Man vs Venom",                      hook: "Symbiote rejection match.",                                  team1Ids: [3],   team2Ids: [184] },
  { id: "spider-man-vs-miles",                title: "Across the Spider-Verse",                  hook: "Peter Parker vs Miles Morales.",                             team1Ids: [3],   team2Ids: [665] },
  { id: "magneto-vs-professor-x",             title: "Magneto vs Professor X",                   hook: "Magnetic dominion vs mental dominion.",                      team1Ids: [27],  team2Ids: [659] },
  { id: "thor-vs-loki",                       title: "Brothers of Asgard",                       hook: "Mjolnir vs trickster magic.",                                team1Ids: [7],   team2Ids: [194] },
  { id: "doctor-doom-vs-doctor-strange",      title: "Doom vs Strange",                          hook: "Latverian sorcerer-king vs the Sorcerer Supreme.",            team1Ids: [186], team2Ids: [25] },
  { id: "goku-vs-jiren",                      title: "Goku vs Jiren",                            hook: "Ultra Instinct vs Pride Trooper.",                           team1Ids: [2],   team2Ids: [41] },
  { id: "vegeta-vs-frieza",                   title: "Vegeta vs Frieza",                         hook: "The Saiyan prince finally settles it.",                      team1Ids: [12],  team2Ids: [38] },
  { id: "gohan-vs-cell",                      title: "Cell Games Encore",                        hook: "Teen Gohan vs Perfect Cell, no holding back.",                team1Ids: [36],  team2Ids: [39] },
  { id: "saitama-vs-garou",                   title: "One Punch vs Cosmic Garou",                hook: "Hero hunter ascended — vs the gag that ends all gags.",       team1Ids: [87],  team2Ids: [1255] },
  { id: "all-might-vs-goku",                  title: "Symbol of Peace vs Saiyan",                hook: "United States of Smash vs Kamehameha.",                       team1Ids: [86],  team2Ids: [2] },
  { id: "mob-vs-saitama",                     title: "Mob vs Saitama",                           hook: "Suppressed psychic vs unkillable punch.",                    team1Ids: [85],  team2Ids: [87] },
  { id: "edward-vs-roy",                      title: "Fullmetal vs Flame",                       hook: "Alchemic genius vs colonel snap.",                           team1Ids: [96],  team2Ids: [533] },
  { id: "mario-vs-bowser",                    title: "Mario vs Bowser",                          hook: "Fire flower vs Koopa King.",                                 team1Ids: [217], team2Ids: [219] },
  { id: "link-vs-ganondorf",                  title: "Link vs Ganondorf",                        hook: "Master Sword vs Triforce of Power.",                         team1Ids: [75],  team2Ids: [220] },
  { id: "pikachu-vs-mewtwo",                  title: "Pikachu vs Mewtwo",                        hook: "The series mascot vs the original final boss.",              team1Ids: [226], team2Ids: [240] },
  { id: "charizard-vs-mewtwo",                title: "Charizard vs Mewtwo",                      hook: "Fire blast vs psychic devastation.",                         team1Ids: [241], team2Ids: [240] },
  { id: "godzilla-vs-king-kong",              title: "Godzilla vs King Kong",                    hook: "The kaiju title fight.",                                     team1Ids: [158], team2Ids: [159] },
  { id: "godzilla-vs-mechagodzilla",          title: "Godzilla vs Mechagodzilla",                hook: "Atomic breath vs anti-Godzilla weapon platform.",            team1Ids: [158], team2Ids: [161] },
  { id: "optimus-vs-megatron",                title: "Optimus Prime vs Megatron",                hook: "Autobot leader vs Decepticon warlord — winner keeps Cybertron.", team1Ids: [107], team2Ids: [268] },
  { id: "harry-vs-voldemort",                 title: "Harry Potter vs Voldemort",                hook: "Expelliarmus vs Avada Kedavra.",                             team1Ids: [590], team2Ids: [43] },
  { id: "gandalf-vs-saruman",                 title: "Gandalf vs Saruman",                       hook: "White vs Many-Coloured — wizard duel.",                      team1Ids: [10],  team2Ids: [99] },
  { id: "darth-vader-vs-yoda",                title: "Darth Vader vs Yoda",                      hook: "Apprentice vs Grandmaster, all dark side rules off.",        team1Ids: [9],   team2Ids: [46] },
  { id: "luke-vs-kylo",                       title: "Luke Skywalker vs Kylo Ren",               hook: "Jedi Master vs Knight of Ren.",                              team1Ids: [45],  team2Ids: [608] },
  { id: "mace-vs-palpatine",                  title: "Mace Windu vs Palpatine",                  hook: "Vaapad vs Sith Lightning. Unlimited power.",                 team1Ids: [49],  team2Ids: [48] },
  { id: "sub-zero-vs-raiden",                 title: "Sub-Zero vs Raiden",                       hook: "Ice fatality vs God of Thunder.",                            team1Ids: [141], team2Ids: [143] },
  { id: "ryu-vs-akuma",                       title: "Ryu vs Akuma",                             hook: "Ansatsuken brothers — Hadoken vs Shun Goku Satsu.",          team1Ids: [224], team2Ids: [265] },
  { id: "akuma-vs-bison",                     title: "Akuma vs M. Bison",                        hook: "Satsui no Hado vs Psycho Power.",                            team1Ids: [265], team2Ids: [266] },
  { id: "wick-vs-bond",                       title: "John Wick vs James Bond",                  hook: "The Boogeyman vs 00-Agent.",                                 team1Ids: [100], team2Ids: [111] },
  { id: "rambo-vs-predator",                  title: "Rambo vs Predator",                        hook: "Jungle vs Hunter — winner walks out.",                       team1Ids: [108], team2Ids: [81] },
  { id: "bane-vs-hulk",                       title: "Bane vs Hulk",                             hook: "Venom serum vs gamma rage.",                                 team1Ids: [128], team2Ids: [23] },
  { id: "hawkeye-vs-green-arrow",             title: "Hawkeye vs Green Arrow",                   hook: "Marvel's archer vs DC's archer — trick arrows only.",        team1Ids: [327], team2Ids: [362] },
  { id: "black-panther-vs-batman",            title: "Black Panther vs Batman",                  hook: "Vibranium suit vs Bat-tech.",                                team1Ids: [782], team2Ids: [13] },
  { id: "scarlet-witch-vs-raven",             title: "Scarlet Witch vs Raven",                   hook: "Reality warping vs daughter of Trigon.",                     team1Ids: [31],  team2Ids: [359] },
  { id: "strange-vs-dr-fate",                 title: "Sorcerer Supreme vs Lord of Order",        hook: "Eye of Agamotto vs Helmet of Fate.",                         team1Ids: [25],  team2Ids: [470] },
  { id: "boba-fett-vs-predator",              title: "Boba Fett vs Predator",                    hook: "Mandalorian bounty hunter vs Yautja hunter.",                team1Ids: [614], team2Ids: [81] },

  // ── Pool expansion v2 (kills the ~13-day repeat cycle) ───────────────────────
  // 100+ new fights spanning Marvel/DC deep cuts, anime rivalries, video-game
  // duels, horror icons, and big team battles. Combined with the existing pool
  // this pushes lineup variety past the ~3-week mark before a matchup repeats.
  { id: "punisher-vs-deathstroke", title: "Punisher vs Deathstroke", hook: "Frank Castle vs Slade Wilson — no quarter.", team1Ids: [783], team2Ids: [19] },
  { id: "moon-knight-vs-daredevil", title: "Moon Knight vs Daredevil", hook: "Fist of Khonshu vs Man Without Fear.", team1Ids: [339], team2Ids: [35] },
  { id: "iron-fist-vs-shang-chi", title: "Iron Fist vs Wolverine", hook: "The Immortal Weapon vs the Best There Is.", team1Ids: [342], team2Ids: [26] },
  { id: "luke-cage-vs-colossus", title: "Unbreakable Skin Showdown", hook: "Sweet Christmas vs the Russian steel man.", team1Ids: [341], team2Ids: [332] },
  { id: "she-hulk-vs-wonder-woman", title: "She-Hulk vs Wonder Woman", hook: "Gamma lawyer vs Amazon princess.", team1Ids: [666], team2Ids: [4] },
  { id: "wolverine-vs-cyclops", title: "Wolverine vs Cyclops", hook: "Schism — claws vs optic blasts.", team1Ids: [26], team2Ids: [328] },
  { id: "storm-vs-magneto", title: "Storm vs Magneto", hook: "Omega weather goddess vs master of magnetism.", team1Ids: [88], team2Ids: [27] },
  { id: "jean-vs-scarlet-witch", title: "Phoenix Jean vs Scarlet Witch", hook: "Cosmic fire vs chaos magic.", team1Ids: [329], team2Ids: [31] },
  { id: "sentry-vs-hyperion", title: "Sentry vs Hyperion", hook: "Million-suns madman vs Marvel's Superman analog.", team1Ids: [472], team2Ids: [477] },
  { id: "beta-ray-bill-vs-thor", title: "Beta Ray Bill vs Thor", hook: "Stormbreaker vs Mjolnir, the worthy duel.", team1Ids: [479], team2Ids: [7] },
  { id: "adam-warlock-vs-thanos", title: "Adam Warlock vs Thanos", hook: "Soul Gem vs Infinity Gauntlet.", team1Ids: [338], team2Ids: [29] },
  { id: "carnage-vs-venom", title: "Carnage vs Venom", hook: "Cletus vs Eddie — symbiote civil war.", team1Ids: [185], team2Ids: [184] },
  { id: "knull-vs-thor", title: "Knull vs Thor", hook: "King in Black vs God of Thunder.", team1Ids: [656], team2Ids: [7] },
  { id: "dormammu-vs-galactus", title: "Dormammu vs Galactus", hook: "Dark Dimension vs Devourer of Worlds.", team1Ids: [473], team2Ids: [187] },
  { id: "mephisto-vs-trigon", title: "Mephisto vs Trigon", hook: "Marvel devil vs DC devil — claim a soul.", team1Ids: [475], team2Ids: [485] },
  { id: "onslaught-vs-sentry", title: "Onslaught vs Sentry", hook: "Psychic Armageddon vs Void.", team1Ids: [685], team2Ids: [472] },
  { id: "apocalypse-vs-magneto", title: "Apocalypse vs Magneto", hook: "Survival of the fittest — mutants only.", team1Ids: [660], team2Ids: [27] },
  { id: "bishop-vs-cable", title: "Bishop vs Cable", hook: "Two soldiers from the bad future.", team1Ids: [796], team2Ids: [795] },
  { id: "emma-frost-vs-professor-x", title: "Emma Frost vs Professor X", hook: "Diamond mind vs Cerebro brain.", team1Ids: [785], team2Ids: [659] },
  { id: "psylocke-vs-storm", title: "Psylocke vs Storm", hook: "Psychic katana vs weather wrath.", team1Ids: [797], team2Ids: [88] },
  { id: "living-tribunal-vs-anti-monitor", title: "Living Tribunal vs Anti-Monitor", hook: "Cosmic judge vs antimatter god.", team1Ids: [792], team2Ids: [482] },
  { id: "doctor-manhattan-vs-superman", title: "Doctor Manhattan vs Superman", hook: "Quantum awareness vs solar god.", team1Ids: [1028], team2Ids: [1] },
  { id: "doctor-manhattan-vs-strange", title: "Doctor Manhattan vs Dr. Strange", hook: "Watchmaker of reality vs Sorcerer Supreme.", team1Ids: [1028], team2Ids: [25] },
  { id: "nightwing-vs-red-hood", title: "Nightwing vs Red Hood", hook: "Two ex-Robins, two philosophies.", team1Ids: [346], team2Ids: [348] },
  { id: "doomsday-vs-hulk", title: "Doomsday vs Hulk", hook: "Kryptonian killer vs World-Breaker.", team1Ids: [484], team2Ids: [23] },
  { id: "brainiac-vs-lex-luthor", title: "Brainiac vs Lex Luthor", hook: "12th-level intellect vs Earth's greatest mind.", team1Ids: [487], team2Ids: [20] },
  { id: "general-zod-vs-superman", title: "General Zod vs Superman", hook: "Kneel before Zod — Phantom Zone exile vs Kal-El.", team1Ids: [643], team2Ids: [1] },
  { id: "wally-vs-barry", title: "Wally West vs Barry Allen", hook: "Mentor vs successor — fastest man alive crown.", team1Ids: [648], team2Ids: [789] },
  { id: "sinestro-vs-green-lantern", title: "Sinestro vs Green Lantern", hook: "Yellow ring vs willpower constructs.", team1Ids: [190], team2Ids: [16] },
  { id: "atrocitus-vs-sinestro", title: "Atrocitus vs Sinestro", hook: "Red rage vs yellow fear.", team1Ids: [711], team2Ids: [190] },
  { id: "larfleeze-vs-sinestro", title: "Larfleeze vs Sinestro", hook: "Orange greed vs yellow fear.", team1Ids: [710], team2Ids: [190] },
  { id: "mongul-vs-superman", title: "Mongul vs Superman", hook: "Warworld tyrant vs Man of Steel.", team1Ids: [491], team2Ids: [1] },
  { id: "bane-vs-batman", title: "Bane vs Batman", hook: "The man who broke the Bat — round two.", team1Ids: [128], team2Ids: [13] },
  { id: "riddler-vs-sherlock", title: "Riddler vs Sherlock Holmes", hook: "Puzzle vs deduction — pure intellect war.", team1Ids: [357], team2Ids: [8] },
  { id: "ras-al-ghul-vs-batman", title: "Ra's al Ghul vs Batman", hook: "League of Assassins vs the prodigal heir.", team1Ids: [355], team2Ids: [13] },
  { id: "ichigo-vs-yhwach", title: "Ichigo vs Yhwach", hook: "Final Getsuga vs The Almighty.", team1Ids: [83], team2Ids: [550] },
  { id: "hitsugaya-vs-sub-zero", title: "Hitsugaya vs Sub-Zero", hook: "Bankai ice vs Lin Kuei ice.", team1Ids: [553], team2Ids: [141] },
  { id: "kaido-vs-whitebeard", title: "Kaido vs Whitebeard", hook: "Strongest creature vs strongest man.", team1Ids: [492], team2Ids: [60] },
  { id: "akaza-vs-kokushibo", title: "Akaza vs Kokushibo", hook: "Upper Three vs Upper One.", team1Ids: [501], team2Ids: [500] },
  { id: "doma-vs-akaza", title: "Doma vs Akaza", hook: "Upper Two vs Upper Three — the rematch.", team1Ids: [502], team2Ids: [501] },
  { id: "father-vs-aizen", title: "Father vs All For One", hook: "Two ultimate manipulators clash.", team1Ids: [531], team2Ids: [311] },
  { id: "yusuke-vs-saitama", title: "Yusuke Urameshi vs Saitama", hook: "Spirit Gun vs Serious Punch.", team1Ids: [776], team2Ids: [87] },
  { id: "meruem-vs-goku", title: "Meruem vs Goku", hook: "Chimera Ant King vs Saiyan god.", team1Ids: [91], team2Ids: [2] },
  { id: "all-for-one-vs-all-might", title: "All For One vs All Might", hook: "United States of Smash — final form.", team1Ids: [311], team2Ids: [86] },
  { id: "endeavor-vs-all-might", title: "Endeavor vs All Might", hook: "Plus Ultra vs the Hellflame second.", team1Ids: [310], team2Ids: [86] },
  { id: "asta-vs-yuno", title: "Asta vs Yuno", hook: "Anti-magic sword vs four-element wind.", team1Ids: [727], team2Ids: [728] },
  { id: "light-vs-l", title: "Light Yagami vs L", hook: "Kira vs the world's greatest detective.", team1Ids: [465], team2Ids: [466] },
  { id: "denji-vs-power", title: "Denji vs Power", hook: "Chainsaw devil vs Blood devil.", team1Ids: [506], team2Ids: [507] },
  { id: "makima-vs-light", title: "Makima vs Light Yagami", hook: "Control devil vs Kira — manipulator showdown.", team1Ids: [505], team2Ids: [465] },
  { id: "alucard-vs-dracula", title: "Alucard vs Voldemort", hook: "No-Life King vs Dark Lord.", team1Ids: [94], team2Ids: [43] },
  { id: "kenshiro-vs-jotaro", title: "Kenshiro vs Saitama", hook: "Hokuto Shinken vs the One Punch.", team1Ids: [732], team2Ids: [87] },
  { id: "chief-vs-samus", title: "Master Chief vs Samus Aran", hook: "Spartan-II vs the bounty hunter.", team1Ids: [71], team2Ids: [214] },
  { id: "geralt-vs-aloy", title: "Geralt vs Aloy", hook: "Witcher silver vs machine hunter.", team1Ids: [70], team2Ids: [584] },
  { id: "ellie-vs-aloy", title: "Ellie vs Aloy", hook: "Post-apocalypse survivors face off.", team1Ids: [585], team2Ids: [584] },
  { id: "lara-vs-nathan", title: "Lara Croft vs Nathan Drake", hook: "Two tomb raiders, one artifact.", team1Ids: [229], team2Ids: [233] },
  { id: "lara-vs-indy", title: "Lara Croft vs Indiana Jones", hook: "Classic adventurer vs modern raider.", team1Ids: [229], team2Ids: [119] },
  { id: "knuckles-vs-wolverine", title: "Knuckles vs Wolverine", hook: "Echidna fists vs adamantium claws.", team1Ids: [1253], team2Ids: [26] },
  { id: "arceus-vs-mewtwo", title: "Arceus vs Mewtwo", hook: "The original one vs the genetic apex.", team1Ids: [246], team2Ids: [240] },
  { id: "rayquaza-vs-charizard", title: "Rayquaza vs Charizard", hook: "Sky-high Dragon Ascent vs Mega Charizard.", team1Ids: [245], team2Ids: [241] },
  { id: "bayonetta-vs-dante", title: "Bayonetta vs Dante", hook: "Umbra Witch vs Son of Sparda.", team1Ids: [98], team2Ids: [74] },
  { id: "vergil-vs-sephiroth", title: "Vergil vs Sephiroth", hook: "Yamato vs Masamune — long blades, no mercy.", team1Ids: [543], team2Ids: [73] },
  { id: "jin-vs-aragorn", title: "Jin Sakai vs Aragorn", hook: "Ghost of Tsushima vs King of Gondor.", team1Ids: [751], team2Ids: [66] },
  { id: "doom-slayer-vs-kratos", title: "Doom Slayer vs Kratos", hook: "Hell ripper vs God killer.", team1Ids: [97], team2Ids: [69] },
  { id: "pinhead-vs-pennywise", title: "Pinhead vs Pennywise", hook: "Cenobite hooks vs Deadlights.", team1Ids: [166], team2Ids: [165] },
  { id: "freddy-vs-jason", title: "Freddy vs Jason", hook: "Dream stalker vs Crystal Lake butcher.", team1Ids: [162], team2Ids: [163] },
  { id: "michael-vs-jason", title: "Michael Myers vs Jason Voorhees", hook: "Two unkillable slashers, one survivor.", team1Ids: [164], team2Ids: [163] },
  { id: "hannibal-vs-light", title: "Hannibal Lecter vs Light Yagami", hook: "Two minds, two methods. Whoever blinks dies.", team1Ids: [126], team2Ids: [465] },
  { id: "ash-vs-pinhead", title: "Ash vs Pinhead", hook: "Boomstick vs Lament Configuration.", team1Ids: [167], team2Ids: [166] },
  { id: "aang-vs-azula", title: "Aang vs Azula", hook: "Avatar vs blue-fire prodigy.", team1Ids: [291], team2Ids: [296] },
  { id: "zuko-vs-azula", title: "Zuko vs Azula", hook: "Agni Kai — sibling rivalry.", team1Ids: [292], team2Ids: [296] },
  { id: "john-mcclane-vs-john-wick", title: "John McClane vs John Wick", hook: "Yippee-ki-yay vs the Boogeyman.", team1Ids: [109], team2Ids: [100] },
  { id: "t1000-vs-t800", title: "T-1000 vs T-800", hook: "Liquid metal vs endoskeleton.", team1Ids: [129], team2Ids: [80] },
  { id: "robocop-vs-t1000", title: "Robocop vs T-1000", hook: "Cybernetic cop vs shapeshifting assassin.", team1Ids: [168], team2Ids: [129] },
  { id: "frozone-vs-iceman", title: "Frozone vs Iceman", hook: "Two ice projectors, one ice rink.", team1Ids: [847], team2Ids: [784] },
  { id: "mr-incredible-vs-hulk", title: "Mr. Incredible vs Hulk", hook: "Super strength dad vs gamma rage.", team1Ids: [393], team2Ids: [23] },
  { id: "syndrome-vs-lex", title: "Syndrome vs Lex Luthor", hook: "Two tech billionaires who hate heroes.", team1Ids: [392], team2Ids: [20] },
  { id: "thanos-vs-darkseid-cosmic", title: "Cosmic Tyrants — Round 2", hook: "Black Order vs Apokoliptan war machine.", team1Ids: [29], team2Ids: [89] },
  { id: "goku-vs-superman", title: "Goku vs Superman", hook: "The eternal forum war, settled.", team1Ids: [2], team2Ids: [1] },
  { id: "broly-vs-hulk", title: "Broly vs Hulk", hook: "Legendary Super Saiyan vs the angrier he gets.", team1Ids: [42], team2Ids: [23] },
  { id: "jiren-vs-saitama", title: "Jiren vs Saitama", hook: "Unbreakable Pride vs One Punch.", team1Ids: [41], team2Ids: [87] },
  { id: "beerus-vs-thor", title: "Beerus vs Thor", hook: "God of Destruction vs God of Thunder.", team1Ids: [40], team2Ids: [7] },
  { id: "beerus-vs-superman", title: "Beerus vs Superman", hook: "Hakai vs solar invulnerability.", team1Ids: [40], team2Ids: [1] },
  { id: "frieza-vs-cell", title: "Frieza vs Cell", hook: "Final Form vs Perfect Cell.", team1Ids: [38], team2Ids: [39] },
  { id: "broly-vs-goku", title: "Broly vs Goku", hook: "Legendary vs Ultra Instinct.", team1Ids: [42], team2Ids: [2] },
  { id: "all-might-vs-saitama", title: "All Might vs Saitama", hook: "Symbol of Peace vs Caped Baldy.", team1Ids: [86], team2Ids: [87] },
  { id: "gojo-vs-aizen", title: "Gojo vs All For One", hook: "Infinity vs the ultimate quirk thief.", team1Ids: [84], team2Ids: [311] },
  { id: "sukuna-vs-yhwach", title: "Sukuna vs Yhwach", hook: "King of Curses vs The Almighty.", team1Ids: [178], team2Ids: [550] },
  { id: "sukuna-vs-aizen", title: "Sukuna vs Father", hook: "Two ultimate manipulators of body and law.", team1Ids: [178], team2Ids: [531] },
  { id: "luffy-vs-naruto", title: "Luffy vs Naruto", hook: "Gear 5 vs Six Paths Sage Mode.", team1Ids: [6], team2Ids: [6] },
  { id: "zoro-vs-mihawk", title: "Zoro vs Sanji", hook: "Pirate Hunter vs Black Leg — Strawhat duel.", team1Ids: [6], team2Ids: [6] },
  { id: "fantastic-four-vs-x-men", title: "Fantastic Four vs X-Men", hook: "Marvel's first family vs the mutants.", team1Ids: [668, 669, 670, 193], team2Ids: [26, 328, 88, 329] },
  { id: "bat-family-vs-batman", title: "Bat-Family Mutiny", hook: "Nightwing, Red Hood, Batgirl & Robin vs Batman himself.", team1Ids: [346, 348, 347, 349], team2Ids: [13] },
  { id: "four-horsemen-vs-x-men", title: "Apocalypse + Horsemen vs X-Men", hook: "Apocalypse, Mr. Sinister and Mystique vs the X-Men.", team1Ids: [660, 786], team2Ids: [26, 328, 88, 329, 659] },
  { id: "devils-vs-angels", title: "Devils vs Angels", hook: "Mephisto, Dormammu & Trigon vs Dr. Strange, Dr. Fate & Scarlet Witch.", team1Ids: [475, 473, 485], team2Ids: [25, 470, 31] },
  { id: "green-lantern-corps-vs-sinestro-corps", title: "GL Corps vs Sinestro Corps", hook: "Hal Jordan, Kyle Rayner & John Stewart vs Sinestro, Atrocitus & Larfleeze.", team1Ids: [16, 714, 836], team2Ids: [190, 711, 710] },
  { id: "bleach-vs-naruto", title: "Bleach Squad vs Naruto Squad", hook: "Ichigo & Hitsugaya vs Naruto & Sasuke.", team1Ids: [83, 553], team2Ids: [6, 52] },
  { id: "mha-vs-jjk", title: "Heroes vs Sorcerers", hook: "Deku, Bakugo & Endeavor vs Gojo, Sukuna & Itadori.", team1Ids: [86, 310], team2Ids: [84, 178] },
  { id: "horror-icons-vs-slashers", title: "Horror Icons Assemble", hook: "Freddy, Jason & Michael vs Pinhead, Pennywise & Chucky.", team1Ids: [162, 163, 164], team2Ids: [166, 165, 1145] },
  { id: "devil-summit", title: "Demon Princes Summit", hook: "Sukuna, Akaza & Doma vs Father, Pride & All For One.", team1Ids: [178, 501, 502], team2Ids: [531, 532, 311] },
  { id: "dc-women-vs-marvel-women", title: "DC Women vs Marvel Women", hook: "Wonder Woman, Scarlet Witch alt — DC trinity vs Marvel.", team1Ids: [4, 21], team2Ids: [31, 30, 668] },
  { id: "chainsaw-vs-jjk", title: "Chainsaw Man vs JJK", hook: "Denji, Power & Makima vs Gojo, Sukuna & Megumi.", team1Ids: [506, 507, 505], team2Ids: [84, 178, 84] },
  // ── Expanded matchups (added to grow themed buckets) ─────────────────
  { id: "tyson-vs-ali", title: "Tyson vs Ali", hook: "Iron Mike haymaker vs the Greatest. The ultimate ring debate.", team1Ids: [522], team2Ids: [521] },
  { id: "bruce-lee-vs-tyson", title: "Bruce Lee vs Mike Tyson", hook: "One-inch punch vs world champion power.", team1Ids: [520], team2Ids: [522] },
  { id: "bruce-lee-vs-ip-man", title: "Bruce Lee vs Ip Man", hook: "Jeet Kune Do prodigy vs his Wing Chun master.", team1Ids: [520], team2Ids: [468] },
  { id: "ip-man-vs-tyson", title: "Ip Man vs Mike Tyson", hook: "Wing Chun precision vs boxing brutality.", team1Ids: [468], team2Ids: [522] },
  { id: "rocky-vs-tyson", title: "Rocky Marciano vs Mike Tyson", hook: "Undefeated heavyweight vs prime Iron Mike.", team1Ids: [1267], team2Ids: [522] },
  { id: "fury-vs-tyson", title: "Tyson Fury vs Mike Tyson", hook: "Modern Gypsy King vs young Iron Mike.", team1Ids: [1268], team2Ids: [522] },
  { id: "ali-vs-fury", title: "Muhammad Ali vs Tyson Fury", hook: "Two generations of giant heavyweights.", team1Ids: [521], team2Ids: [1268] },
  { id: "ryu-vs-ken", title: "Ryu vs Ken Masters", hook: "Shoryuken vs Shoryuken. The eternal best-friend duel.", team1Ids: [224], team2Ids: [262] },
  { id: "liu-kang-vs-ryu", title: "Liu Kang vs Ryu", hook: "MK champion vs SF champion.", team1Ids: [144], team2Ids: [224] },
  { id: "liu-kang-vs-johnny", title: "Liu Kang vs Johnny Cage", hook: "Shaolin monk vs Hollywood action star.", team1Ids: [144], team2Ids: [148] },
  { id: "kitana-vs-mileena", title: "Kitana vs Mileena", hook: "Edenian sisters. Fans vs sai. Only one survives.", team1Ids: [145], team2Ids: [149] },
  { id: "chun-li-vs-cammy", title: "Chun-Li vs Cammy", hook: "Interpol vs Delta Red. Spinning bird vs Cannon Spike.", team1Ids: [263], team2Ids: [267] },
  { id: "akuma-vs-shao-kahn", title: "Akuma vs Shao Kahn", hook: "Satsui no Hado vs Outworld emperor.", team1Ids: [265], team2Ids: [142] },
  { id: "goro-vs-sagat-style", title: "Goro vs Akuma", hook: "Four-armed Shokan prince vs the Master of Fists.", team1Ids: [147], team2Ids: [265] },
  { id: "raiden-vs-shao-kahn", title: "Raiden vs Shao Kahn", hook: "Thunder god vs Outworld tyrant. Earthrealm hangs in the balance.", team1Ids: [143], team2Ids: [142] },
  { id: "daredevil-vs-punisher", title: "Daredevil vs Punisher", hook: "Catholic mercy vs the only justice that sticks.", team1Ids: [35], team2Ids: [783] },
  { id: "daredevil-vs-batman", title: "Daredevil vs Batman", hook: "Hell's Kitchen vs Gotham. Radar sense vs Bat-prep.", team1Ids: [35], team2Ids: [13] },
  { id: "red-hood-vs-punisher", title: "Red Hood vs Punisher", hook: "Two men who decided the law wasn't enough.", team1Ids: [348], team2Ids: [783] },
  { id: "black-widow-vs-catwoman", title: "Black Widow vs Catwoman", hook: "Red Room spy vs Gotham's greatest thief.", team1Ids: [195], team2Ids: [350] },
  { id: "elektra-vs-catwoman", title: "Elektra vs Catwoman", hook: "Sai assassin vs cat burglar.", team1Ids: [340], team2Ids: [350] },
  { id: "black-canary-vs-widow", title: "Black Canary vs Black Widow", hook: "Sonic scream vs Widow's Bite.", team1Ids: [363], team2Ids: [195] },
  { id: "nightwing-vs-daredevil", title: "Nightwing vs Daredevil", hook: "Acrobat vs the man without fear.", team1Ids: [346], team2Ids: [35] },
  { id: "cap-vs-batman", title: "Captain America vs Batman", hook: "Super-soldier vs the world's greatest tactician. No shield. No cape.", team1Ids: [24], team2Ids: [13] },
  { id: "snake-vs-john-wick", title: "Solid Snake vs John Wick", hook: "Tactical legend vs Baba Yaga. CQC meets gun-fu.", team1Ids: [215], team2Ids: [100] },
  { id: "snake-vs-batman", title: "Solid Snake vs Batman", hook: "FOXHOUND infiltrator vs Dark Knight detective.", team1Ids: [215], team2Ids: [13] },
  { id: "lara-vs-ripley", title: "Lara Croft vs Ellen Ripley", hook: "Tomb raider vs xenomorph slayer. Survival royalty.", team1Ids: [229], team2Ids: [113] },
  { id: "ripley-vs-sarah", title: "Ellen Ripley vs Sarah Connor", hook: "Final girls. Aliens vs Terminators forged them. Now they fight.", team1Ids: [113], team2Ids: [116] },
  { id: "bond-vs-bourne", title: "James Bond vs Jason Bourne", hook: "MI6 vs the CIA's ghost. Two eras of super-spy.", team1Ids: [111], team2Ids: [118] },
  { id: "leonidas-vs-wallace", title: "Leonidas vs William Wallace", hook: "Spartan king vs Scottish king. Spear vs claymore.", team1Ids: [566], team2Ids: [564] },
  { id: "x-men-vs-brotherhood", title: "X-Men vs Brotherhood", hook: "Xavier's dream vs Magneto's revolution.", team1Ids: [26, 328, 88, 329], team2Ids: [27, 786, 700, 660] },
  { id: "sannin-vs-akatsuki", title: "Naruto Legends vs Akatsuki", hook: "Hashirama, Minato & Kakashi vs Madara, Itachi & Obito.", team1Ids: [524, 56, 53], team2Ids: [55, 54, 527] },
  { id: "z-fighters-vs-akatsuki", title: "Z-Fighters vs Akatsuki", hook: "DBZ heroes vs Naruto's most wanted. Ki vs jutsu.", team1Ids: [2, 12, 36, 37], team2Ids: [55, 54, 527] },
  { id: "straw-hats-vs-z", title: "Straw Hats vs Z-Fighters", hook: "Pirate king crew vs Saiyan warriors. One Piece vs Dragon Ball.", team1Ids: [57, 58], team2Ids: [2, 12] },
  { id: "avengers-vs-brotherhood", title: "Avengers vs Brotherhood", hook: "Earth's mightiest vs mutant supremacy.", team1Ids: [5, 24, 7], team2Ids: [27, 786, 700] },
  { id: "marvel-knights-vs-bat-fam", title: "Marvel Knights vs Bat Family", hook: "Daredevil/Punisher/Moon Knight vs Batman/Nightwing/Red Hood.", team1Ids: [35, 783, 339], team2Ids: [13, 346, 348] },
  { id: "demons-vs-hashira", title: "Demon Slayers vs Upper Moons", hook: "Tanjiro, Rengoku & Inosuke vs Muzan's elite.", team1Ids: [175, 1036, 504], team2Ids: [176, 178] },
  { id: "avatar-vs-konoha", title: "Team Avatar vs Konoha", hook: "Aang, Zuko & Toph vs Naruto, Sasuke & Kakashi.", team1Ids: [291, 292, 294], team2Ids: [6, 52, 53] },
  { id: "hashira-vs-espada", title: "Hashira vs Espada", hook: "Demon hunters vs Hueco Mundo elite. Crossover swords.", team1Ids: [175, 1036], team2Ids: [309, 306] },
  { id: "bleach-captains-vs-akatsuki", title: "Bleach Captains vs Akatsuki", hook: "Soul Society elite vs Naruto's rogue ninjas.", team1Ids: [83, 307, 308], team2Ids: [55, 54, 926] },
  { id: "mha-vs-bleach", title: "MHA Heroes vs Soul Reapers", hook: "All Might & Endeavor vs Ichigo & Kenpachi.", team1Ids: [86, 310], team2Ids: [83, 307] },
  { id: "mha-vs-villains", title: "Class 1-A vs Villain Alliance", hook: "Pro heroes-in-training vs Shigaraki, Dabi, AFO.", team1Ids: [86, 310], team2Ids: [312, 530] },
  { id: "aot-vs-akatsuki", title: "Scouts vs Akatsuki", hook: "Levi & Mikasa vs Itachi & Obito. ODM vs Sharingan.", team1Ids: [61, 1250], team2Ids: [54, 527] },
  { id: "fairy-tail-vs-naruto", title: "Fairy Tail vs Konoha", hook: "Natsu & Erza vs Naruto & Sasuke. Magic vs jutsu.", team1Ids: [323, 324], team2Ids: [6, 52] },
  { id: "sins-vs-akatsuki", title: "Seven Sins vs Akatsuki", hook: "Meliodas, Escanor & Ban vs the rogue ninjas.", team1Ids: [573, 574, 729], team2Ids: [55, 54, 527] },
  { id: "horror-vs-slashers", title: "Horror Icons vs Slasher Kings", hook: "Pennywise & Pinhead vs Freddy, Jason & Michael.", team1Ids: [165, 166], team2Ids: [162, 163, 164] },
  { id: "new-gods-vs-asgard", title: "New Gods vs Asgard", hook: "Darkseid, Steppenwolf & Desaad vs Thor, Loki & Hela.", team1Ids: [89, 838, 1183], team2Ids: [7, 194, 664] },
  { id: "fantastic-four-vs-titans", title: "Fantastic Four vs Teen Titans", hook: "Marvel's first family vs DC's young guns.", team1Ids: [787, 788, 784], team2Ids: [358, 361, 359] },
  { id: "storm-vs-black-lightning", title: "Storm vs Black Lightning", hook: "Goddess of weather vs the man who is electricity.", team1Ids: [88], team2Ids: [378] },
  { id: "beast-vs-beast-boy", title: "Beast vs Beast Boy", hook: "McCoy intellect vs Logan's shape-shifting zoo.", team1Ids: [334], team2Ids: [361] },
  { id: "cyclops-vs-cyborg", title: "Cyclops vs Cyborg", hook: "Optic blast vs sonic cannon.", team1Ids: [328], team2Ids: [358] },
  { id: "iron-man-vs-cyborg", title: "Iron Man vs Cyborg", hook: "Stark tech vs Apokoliptic tech.", team1Ids: [5], team2Ids: [358] },
  { id: "magneto-vs-black-adam", title: "Magneto vs Black Adam", hook: "Master of magnetism vs the power of Shazam (the dark one).", team1Ids: [27], team2Ids: [18] },
  { id: "apocalypse-vs-darkseid", title: "Apocalypse vs Darkseid", hook: "En Sabah Nur vs the Lord of Apokolips. Ancient evil summit.", team1Ids: [660], team2Ids: [89] },
  { id: "galactus-vs-anti-mon", title: "Galactus vs Anti-Monitor", hook: "The devourer of worlds vs the destroyer of universes.", team1Ids: [187], team2Ids: [482] },
  { id: "thor-vs-shazam", title: "Thor vs Shazam", hook: "Mjolnir vs the magic word. Two gods of thunder.", team1Ids: [7], team2Ids: [17] },
  { id: "loki-vs-joker", title: "Loki vs Joker", hook: "God of mischief vs Clown Prince of Chaos.", team1Ids: [194], team2Ids: [790] },
  { id: "thanos-vs-mongul", title: "Thanos vs Mongul", hook: "Mad Titan vs Warworld emperor.", team1Ids: [29], team2Ids: [491] },
  { id: "mystique-vs-catwoman", title: "Mystique vs Catwoman", hook: "Shape-shifter vs cat burglar. Two women you can't hold.", team1Ids: [786], team2Ids: [350] },
  { id: "rogue-vs-raven", title: "Rogue vs Raven", hook: "Power-thief vs Trigon's daughter.", team1Ids: [330], team2Ids: [359] },
  { id: "ghost-rider-vs-spectre", title: "Ghost Rider vs Spectre", hook: "Spirit of Vengeance vs the Wrath of God.", team1Ids: [33], team2Ids: [486] },
  { id: "black-bolt-vs-manhattan", title: "Black Bolt vs Doctor Manhattan", hook: "A whisper that ends worlds vs a man who is everywhere.", team1Ids: [671], team2Ids: [1028] },
  { id: "silver-surfer-vs-flash", title: "Silver Surfer vs Flash", hook: "Power Cosmic vs Speed Force. Universe-wide chase.", team1Ids: [32], team2Ids: [789] },
  { id: "sabretooth-vs-deathstroke", title: "Sabretooth vs Deathstroke", hook: "Adamantium claws vs Terminator tactics.", team1Ids: [700], team2Ids: [19] },
  { id: "colossus-vs-doomsday", title: "Colossus vs Doomsday", hook: "Organic steel vs unstoppable Kryptonian fury.", team1Ids: [332], team2Ids: [484] },
  { id: "hela-vs-trigon", title: "Hela vs Trigon", hook: "Goddess of death vs lord of the seven hells.", team1Ids: [664], team2Ids: [485] },
  { id: "joker-vs-sukuna", title: "Joker vs Sukuna", hook: "Clown Prince of Chaos vs the King of Curses.", team1Ids: [790], team2Ids: [178] },
  { id: "joker-vs-carnage", title: "Joker vs Carnage", hook: "Two laughs you will never unhear.", team1Ids: [790], team2Ids: [185] },
  { id: "pennywise-vs-voldemort", title: "Pennywise vs Voldemort", hook: "Eldritch clown vs the Dark Lord.", team1Ids: [165], team2Ids: [43] },
  { id: "aizen-vs-madara", title: "Aizen vs Madara", hook: "Illusion god vs Uchiha apex. Final form vs Six Paths.", team1Ids: [306], team2Ids: [55] },
  { id: "all-for-one-vs-shigaraki", title: "All for One vs Shigaraki", hook: "Master vs successor. Quirk theft vs decay.", team1Ids: [312], team2Ids: [530] },
  { id: "apocalypse-vs-doomsday", title: "Apocalypse vs Doomsday", hook: "The First Mutant vs the Death of Superman.", team1Ids: [660], team2Ids: [484] },
  { id: "knull-vs-carnage", title: "Knull vs Carnage", hook: "Symbiote god vs his most insane creation.", team1Ids: [656], team2Ids: [185] },
  { id: "pinhead-vs-hannibal", title: "Pinhead vs Hannibal Lecter", hook: "Cenobite vs the gentleman cannibal. Pure cerebral evil.", team1Ids: [166], team2Ids: [126] },
  { id: "t1000-vs-predator", title: "T-1000 vs Predator", hook: "Liquid metal infiltrator vs Yautja hunter.", team1Ids: [129], team2Ids: [81] },
  { id: "bellatrix-vs-azula", title: "Bellatrix vs Azula", hook: "Death Eater vs Fire Princess. Two queens of cruelty.", team1Ids: [592], team2Ids: [296] },
  { id: "vegeta-vs-vader", title: "Vegeta vs Darth Vader", hook: "Saiyan prince vs Sith Lord. Pride vs hate.", team1Ids: [12], team2Ids: [9] },
  { id: "itachi-vs-loki", title: "Itachi vs Loki", hook: "Sharingan illusions vs Asgardian trickster magic.", team1Ids: [54], team2Ids: [194] },
  { id: "sasuke-vs-sephiroth", title: "Sasuke vs Sephiroth", hook: "Edgelord summit. Chidori vs Masamune.", team1Ids: [52], team2Ids: [73] },
  { id: "madara-vs-sauron", title: "Madara vs Sauron", hook: "Six Paths vs the Eye. Two architects of darkness.", team1Ids: [55], team2Ids: [68] },
  { id: "ichigo-vs-kratos", title: "Ichigo vs Kratos", hook: "Soul reaper vs the Ghost of Sparta.", team1Ids: [83], team2Ids: [69] },
  { id: "vader-vs-voldemort", title: "Darth Vader vs Voldemort", hook: "Choke from afar vs killing curse.", team1Ids: [9], team2Ids: [43] },
  { id: "vader-vs-sauron", title: "Darth Vader vs Sauron", hook: "Lightsaber vs flaming mace. Two dark lords meet at last.", team1Ids: [9], team2Ids: [68] },
  { id: "aizen-vs-voldemort", title: "Aizen vs Voldemort", hook: "Final-form Aizen vs noseless wizard. Two men who would be gods.", team1Ids: [306], team2Ids: [43] },
  { id: "doom-slayer-vs-hulk", title: "Doom Slayer vs Hulk", hook: "Rip and tear vs the angriest there is.", team1Ids: [97], team2Ids: [23] },
  { id: "doom-slayer-vs-doomsday", title: "Doom Slayer vs Doomsday", hook: "The Slayer of demons vs the Killer of Superman.", team1Ids: [97], team2Ids: [484] },
  { id: "naruto-vs-ichigo", title: "Naruto vs Ichigo", hook: "Nine-tails chakra vs Hollow soul reaper.", team1Ids: [6], team2Ids: [83] },
  { id: "goku-vs-broly-final", title: "Goku vs Broly", hook: "Ultra Instinct vs Legendary Saiyan. No rules.", team1Ids: [2], team2Ids: [42] },
  { id: "naruto-vs-pain", title: "Naruto vs Pain", hook: "Sage Mode vs Six Paths of Pain. Konoha hangs in the balance.", team1Ids: [6], team2Ids: [926] },
  { id: "madara-vs-hashirama", title: "Madara vs Hashirama", hook: "Reincarnation rematch. Susano'o vs Wood Release.", team1Ids: [55], team2Ids: [524] },
  { id: "aizen-vs-ichigo", title: "Aizen vs Ichigo", hook: "Hougyoku transcendence vs Final Getsuga Tensho.", team1Ids: [306], team2Ids: [83] },
  { id: "eren-vs-levi", title: "Eren vs Levi", hook: "Attack Titan vs humanity's strongest soldier.", team1Ids: [62], team2Ids: [61] },
  { id: "mikasa-vs-annie", title: "Mikasa vs Annie", hook: "Ackerman blood vs Female Titan.", team1Ids: [1250], team2Ids: [1072] },
  { id: "tanjiro-vs-muzan", title: "Tanjiro vs Muzan", hook: "Sun Breathing vs the King of Demons.", team1Ids: [175], team2Ids: [176] },
  { id: "rengoku-vs-akuma-sf", title: "Rengoku vs Akuma", hook: "Flame Hashira vs the Master of Fists. Two finishing moves you can't survive.", team1Ids: [1036], team2Ids: [265] },
  { id: "erza-vs-mikasa", title: "Erza vs Mikasa", hook: "Fairy Tail's Titania vs the last Ackerman.", team1Ids: [324], team2Ids: [1250] },
  { id: "meliodas-vs-escanor", title: "Meliodas vs Escanor", hook: "Demon king vs the Lion's Pride at high noon.", team1Ids: [573], team2Ids: [574] },
  { id: "goku-vs-beerus", title: "Goku vs Beerus", hook: "Ultra Instinct student vs his god of destruction master.", team1Ids: [2], team2Ids: [40] },
  { id: "vegeta-vs-jiren", title: "Vegeta vs Jiren", hook: "Saiyan pride vs Pride Trooper. Final Flash vs concentrated will.", team1Ids: [12], team2Ids: [41] },

  // ── Fun matchups (mascots, monster-tamers, toons, gaming icons) ──────────────
  // Lighter, instantly-recognizable "obvious but fun" fights — the kind people
  // tag a friend about. Mascot wars, Pokémon vs Digimon, cartoon chaos, etc.
  { id: "mario-vs-sonic", title: "Mario vs Sonic", hook: "Plumber vs hedgehog. The console war made flesh.", team1Ids: [217], team2Ids: [216] },
  { id: "pokemon-vs-digimon", title: "Charizard vs WarGreymon", hook: "Pokémon vs Digimon — the monster-tamer war, settled.", team1Ids: [241], team2Ids: [247] },
  { id: "pikachu-vs-kirby", title: "Pikachu vs Kirby", hook: "Electric mouse vs the pink puffball that eats anything.", team1Ids: [226], team2Ids: [218] },
  { id: "mega-man-vs-samus", title: "Mega Man vs Samus Aran", hook: "Blue Bomber vs the bounty hunter. Arm-cannon duel.", team1Ids: [221], team2Ids: [214] },
  { id: "sonic-vs-flash", title: "Sonic vs The Flash", hook: "Fastest hedgehog vs fastest man alive.", team1Ids: [216], team2Ids: [789] },
  { id: "spongebob-vs-kirby", title: "SpongeBob vs Kirby", hook: "Two of the most unkillable cuties ever drawn.", team1Ids: [757], team2Ids: [218] },
  { id: "bugs-vs-popeye", title: "Bugs Bunny vs Popeye", hook: "Toon trickster vs spinach-powered sailor.", team1Ids: [471], team2Ids: [756] },
  { id: "shrek-vs-bowser", title: "Shrek vs Bowser", hook: "Big green ogre vs the Koopa King. Swamp vs castle.", team1Ids: [563], team2Ids: [219] },
  { id: "goku-vs-sonic", title: "Goku vs Sonic", hook: "Saiyan speed vs supersonic hedgehog.", team1Ids: [2], team2Ids: [216] },
  { id: "kirby-vs-bowser", title: "Kirby vs Bowser", hook: "The little pink hero vs the big spiky villain.", team1Ids: [218], team2Ids: [219] },
  { id: "pokemon-vs-digimon-team", title: "Pokémon vs Digimon", hook: "Mewtwo, Charizard & Lucario vs Omnimon, WarGreymon & Beelzemon.", team1Ids: [240, 241, 244], team2Ids: [249, 247, 251] },
  { id: "mario-vs-luigi", title: "Mario vs Luigi", hook: "Super Mario Bros. The Year of Luigi, finally settled.", team1Ids: [217], team2Ids: [1254] },
  { id: "sonic-vs-shadow", title: "Sonic vs Shadow", hook: "Blue blur vs the ultimate life form.", team1Ids: [216], team2Ids: [1252] },
  { id: "samus-vs-dark-samus", title: "Samus vs Dark Samus", hook: "The hunter vs her Phazon doppelgänger.", team1Ids: [214], team2Ids: [1160] },
  { id: "samurai-jack-vs-aku", title: "Samurai Jack vs Aku", hook: "The samurai vs the shape-shifting master of darkness.", team1Ids: [761], team2Ids: [762] },
  { id: "mask-vs-beetlejuice", title: "The Mask vs Beetlejuice", hook: "Two reality-bending agents of pure chaos.", team1Ids: [170], team2Ids: [171] },
  { id: "pacquiao-vs-tyson", title: "Manny Pacquiao vs Mike Tyson", hook: "Pac-Man's speed vs Iron Mike's power.", team1Ids: [1264], team2Ids: [522] },
  { id: "pacquiao-vs-ali", title: "Manny Pacquiao vs Muhammad Ali", hook: "Eight-division king vs The Greatest.", team1Ids: [1264], team2Ids: [521] },
];

// Deterministic day index → matchup. The "daily" period rolls over at
// MIDNIGHT America/New_York (Eastern Time), so a fresh lineup drops at the
// start of each ET calendar day regardless of DST.
//
// DST-safe algorithm: read the current ET wall-clock date directly via Intl.
// With a midnight rollover the daily key is simply today's ET calendar date
// (the hour is always >= 0). Reading the ET date via Intl avoids the
// off-by-an-hour bugs you get from UTC math on spring-forward / fall-back days.
//
// Example (any time of year):
//   - 12:00am ET Tue → key = Tue's ET date  (Tue's lineup drops)
//   - 11:59pm ET Tue → key = Tue's ET date
//   - 12:00am ET Wed → key = Wed's ET date  (Wed's lineup drops)
//
// The rest of the pipeline keys off the returned date STRING, so changing
// the rollover policy here automatically changes when /api/me/daily starts
// returning a new lineup.
const DAILY_ROLLOVER_HOUR_ET = 0; // midnight Eastern
const DAILY_TIMEZONE = "America/New_York";
const ET_DATETIME_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAILY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
});

export function getDailyDateString(now: Date = new Date()): string {
  const parts = ET_DATETIME_PARTS.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  // Intl with hour12:false sometimes returns "24" for midnight; normalize.
  const hourRaw = Number(get("hour"));
  const hour = hourRaw === 24 ? 0 : hourRaw;
  // Before the rollover hour → previous ET calendar date.
  const baseUtc = Date.UTC(year, month - 1, day);
  const targetUtc = hour >= DAILY_ROLLOVER_HOUR_ET ? baseUtc : baseUtc - 86400000;
  return new Date(targetUtc).toISOString().slice(0, 10);
}

// How many matchups appear in the daily lineup. Players see this many fresh
// fights every day to pick from.
export const DAILY_LINEUP_SIZE = 20;

// Pick point economy. Each daily pick costs 1 point. Users get DAILY_PICK_POINTS_BASE
// free per day; once those are spent they can watch an ad to earn +1 point, up
// to DAILY_AD_BONUS_CAP extra (so max picks/day = BASE + CAP = full lineup).
// Current tuning: 10 free picks, then watch an ad for each of the remaining 10.
export const DAILY_PICK_POINTS_BASE = 10;
export const DAILY_AD_BONUS_CAP = DAILY_LINEUP_SIZE - DAILY_PICK_POINTS_BASE;

function epochDaysFromDate(dateStr: string): number {
  return Math.floor(Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
  ) / 86400000);
}

// mulberry32 — a small, fast, well-distributed 32-bit PRNG. Identical seed
// always produces an identical sequence, which is what makes the daily shuffle
// reproducible across servers and clients.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Themed daily selection. Each day of the week has a theme (Marvel Monday,
// Anime Friday, etc.) and the lineup is drawn from a pre-shuffled theme
// bucket using a week-index offset. Within a theme, every matchup in the
// bucket appears exactly once before any repeat — a hard no-repeat guarantee
// across the bucket's theme cycle (much stronger than the old pure-random
// Fisher–Yates that statistically averaged ~20 days between repeats but
// could cluster the same matchup in adjacent weeks).
//
// See dailyThemes.ts for the day-of-week → theme mapping and the bucket
// building / rotation algorithm. We import lazily inside the function to
// avoid a circular import (dailyThemes imports DAILY_POOL from here).
//
// Old PRNG / Fisher–Yates kept around in `mulberry32` above (still used by
// dailyThemes for its per-day display reshuffle).
export function getDailyMatchupsForDate(
  dateStr: string,
  count: number = DAILY_LINEUP_SIZE,
): DailyPoolEntry[] {
  // Lazy require to keep the module graph acyclic at evaluation time.
  // (dailyThemes imports DAILY_POOL from this module at top level.)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getThemedDailyMatchupsForDate } = require("./dailyThemes") as typeof import("./dailyThemes");
  return getThemedDailyMatchupsForDate(dateStr, count).entries;
}

// Single-matchup helper kept for backwards compatibility with any callers
// that still expect today's "featured" pick — returns the first of the daily
// lineup (deterministic per date).
export function getDailyMatchupForDate(dateStr: string): DailyPoolEntry {
  return getDailyMatchupsForDate(dateStr, 1)[0]!;
}
