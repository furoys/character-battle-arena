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
];

// Deterministic day index → matchup. Uses UTC days since epoch so everyone
// in the world sees the same daily matchup at the same moment (midnight UTC
// rollover). If you need a region-specific rollover later, swap the date
// source — the rest of the pipeline keys off the date STRING, not this fn.
export function getDailyDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function getDailyMatchupForDate(dateStr: string): DailyPoolEntry {
  // Days since epoch from the date string — stable per date, independent of
  // timezone of the server process.
  const epochDays = Math.floor(Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
  ) / 86400000);
  const idx = ((epochDays % DAILY_POOL.length) + DAILY_POOL.length) % DAILY_POOL.length;
  return DAILY_POOL[idx]!;
}
