// ── Daily Matchup Pool ────────────────────────────────────────────────────────
// Curated set of matchups that get rotated through the "Daily Matchup" feature.
// Each day's pick is deterministic: index = (daysSinceEpoch) % pool.length.
// Keep entries here in sync with their Debate Room counterparts (titles can
// diverge — these are the prompt the user sees on the daily card).
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
];

// Deterministic day index → matchup. The "daily" period rolls over at
// 8:00 PM America/New_York (Eastern Time), so 10 fresh matchups drop every
// evening at 8pm ET regardless of DST.
//
// DST-safe algorithm: read the current ET wall-clock date AND hour directly
// via Intl. If hour >= 20, the key is today's ET calendar date; otherwise
// it's yesterday's ET date. This avoids the off-by-an-hour bug you get from
// "subtract 20h in UTC then format in ET" on spring-forward / fall-back days.
//
// Example (any time of year):
//   - 7:59pm ET Tue → hour=19 → key = Mon's ET date  (Mon's lineup still up)
//   - 8:00pm ET Tue → hour=20 → key = Tue's ET date  (Tue's lineup drops)
//   - 11:59pm ET Tue → hour=23 → key = Tue's ET date
//   -  3:00am ET Wed → hour=3  → key = Tue's ET date (yesterday in ET terms)
//
// The rest of the pipeline keys off the returned date STRING, so changing
// the rollover policy here automatically changes when /api/me/daily starts
// returning a new lineup.
const DAILY_ROLLOVER_HOUR_ET = 20; // 8pm Eastern
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
export const DAILY_LINEUP_SIZE = 10;

// Pick point economy. Each daily pick costs 1 point. Users get DAILY_PICK_POINTS_BASE
// free per day; once those are spent they can watch an ad to earn +1 point, up
// to DAILY_AD_BONUS_CAP extra (so max picks/day = BASE + CAP = full lineup).
export const DAILY_PICK_POINTS_BASE = 3;
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

// Deterministic, unbiased seeded shuffle keyed by the day index. Same date
// everywhere in the world → same N matchups in the same order. Uses a
// Fisher–Yates shuffle driven by mulberry32 seeded from epoch days so each
// entry has equal long-run probability of appearing on any given day (unlike
// the previous hash-and-sort approach, which biased some entries 2x).
export function getDailyMatchupsForDate(
  dateStr: string,
  count: number = DAILY_LINEUP_SIZE,
): DailyPoolEntry[] {
  const day = epochDaysFromDate(dateStr);
  // Mix the day with a large odd constant so neighbouring days produce very
  // different PRNG streams (avoids near-identical lineups on consecutive days).
  const rng = mulberry32(Math.imul(day + 1, 2654435761));
  const arr = DAILY_POOL.slice();
  // Fisher–Yates from the end. Swap each i with a random j in [0, i].
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr.slice(0, Math.min(count, arr.length));
}

// Single-matchup helper kept for backwards compatibility with any callers
// that still expect today's "featured" pick — returns the first of the daily
// lineup (deterministic per date).
export function getDailyMatchupForDate(dateStr: string): DailyPoolEntry {
  return getDailyMatchupsForDate(dateStr, 1)[0]!;
}
