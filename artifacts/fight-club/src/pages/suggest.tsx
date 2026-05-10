import { useState, useMemo } from "react";
import { useListCharacters } from "@workspace/api-client-react";
import { Character } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Flame, Swords, MessageSquare, Zap } from "lucide-react";
import { useUser } from "@clerk/react";
import { CharacterAvatar } from "@/components/character-avatar";

// ─── Matchup database ─────────────────────────────────────────────────────────
// Each matchup uses real character IDs from the database
type Matchup = {
  id: string;
  title: string;
  theory: string;
  team1Ids: number[];
  team2Ids: number[];
  mode: "fun" | "debate";
  category: string;
  hot?: boolean;
};

const MATCHUPS: Matchup[] = [
  // ── DC vs Marvel ──────────────────────────────────────────────────────────────
  {
    id: "superman-vs-thor",
    title: "Son of Krypton vs Son of Odin",
    theory: "The eternal comic book war. Superman's solar-powered invulnerability vs Thor's magical lightning — and magic bypasses Kryptonian immunity. Most theorists give it to Superman on raw power, but Thor's Odin Force changes everything.",
    team1Ids: [1],
    team2Ids: [7],
    mode: "debate",
    category: "Legacy vs Multiverse",
    hot: true,
  },
  {
    id: "thanos-vs-darkseid",
    title: "Cosmic Tyrants — The Final War",
    theory: "Thanos with the Infinity Gauntlet vs Darkseid wielding the Anti-Life Equation. The consensus: naked Darkseid beats naked Thanos. But one snap of the Gauntlet ends universes. The real debate: does Omega Force resist Infinity?",
    team1Ids: [29],
    team2Ids: [89],
    mode: "debate",
    category: "Legacy vs Multiverse",
    hot: true,
  },
  {
    id: "justice-league-vs-avengers",
    title: "Justice League vs The Avengers",
    theory: "The biggest crossover debate in comic history. JL fans say Superman alone closes it. Avengers fans counter with Scarlet Witch reality-warping + Hulk's limitless rage. Most analysts give JL the edge, but it's never clean.",
    team1Ids: [1, 13, 4, 14, 15],
    team2Ids: [5, 7, 23, 24, 3],
    mode: "debate",
    category: "Legacy vs Multiverse",
    hot: true,
  },
  {
    id: "batman-vs-punisher",
    title: "No Killing Rule vs No Mercy Rule",
    theory: "Batman and Punisher are both peak-human vigilantes without powers — but their philosophies are violently opposed. Batman won't kill. Punisher can't stop. In a straight fight without gadgets, most analysts give it to Castle's military training, brutality, and willingness to shoot.",
    team1Ids: [13],
    team2Ids: [112],
    mode: "debate",
    category: "Legacy vs Multiverse",
    hot: true,
  },
  {
    id: "superman-vs-sentry",
    title: "Man of Steel vs Man of a Million Suns",
    theory: "Both have identical power sets on paper. The difference: Sentry's Void is his dark half — a destructive force that killed Ares by tearing him apart at the molecular level. Superman has no counter to a psychically unstable god. Most theorists call it a coin flip.",
    team1Ids: [1],
    team2Ids: [338],
    mode: "debate",
    category: "Legacy vs Multiverse",
  },
  {
    id: "flash-vs-quicksilver",
    title: "The Flash vs the Speed Elite",
    theory: "Wally West's Flash has outrun death itself and exceeded the speed of thought. Silver Surfer can travel at the speed of light. The debate: does raw Speed Force trump Power Cosmic, and where does Reverse-Flash's time-speed fit into this?",
    team1Ids: [648, 14],
    team2Ids: [32, 191],
    mode: "debate",
    category: "Legacy vs Multiverse",
  },
  {
    id: "scarlet-witch-vs-wonder-woman",
    title: "Chaos Magic vs Amazon Goddess",
    theory: "Wanda can rewrite reality — she depowered nearly every mutant with three words. Diana is a demigod blessed by the Olympians. The debate: can physical godhood withstand probability manipulation?",
    team1Ids: [31],
    team2Ids: [4],
    mode: "debate",
    category: "Legacy vs Multiverse",
  },
  {
    id: "green-lantern-vs-silver-surfer",
    title: "Willpower vs Power Cosmic",
    theory: "Hal Jordan's ring constructs are limited only by imagination and willpower. Silver Surfer's Power Cosmic makes him one of Multiverse's fastest and strongest. Fan theory: Surfer's raw power wins short-term, but Jordan's will is literally infinite.",
    team1Ids: [16],
    team2Ids: [32],
    mode: "debate",
    category: "Legacy vs Multiverse",
  },
  {
    id: "doom-vs-lex",
    title: "Evil Genius Summit — Doom vs Luthor",
    theory: "Both are the smartest villains in their universe. Lex Luthor beat a Superman without kryptonite using only intelligence. Doom absorbed the Beyonder's power. Who wins without anyone else's help? The community says Doom — but Lex would have a plan for Doom too.",
    team1Ids: [186],
    team2Ids: [20],
    mode: "debate",
    category: "Legacy vs Multiverse",
  },
  {
    id: "x-men-vs-jsa",
    title: "X-Men vs The Justice Society",
    theory: "Magneto + Jean Grey + Storm + Wolverine + Cyclops vs Wonder Woman + Flash + Hawkman + Power Girl + Dr. Fate. The debate: Phoenix-level Jean Grey ends it instantly. But Dr. Fate's magic might be the answer. This is the most genuinely unpredictable team matchup in comics.",
    team1Ids: [27, 329, 88, 26, 328],
    team2Ids: [4, 14, 16, 17, 25],
    mode: "debate",
    category: "Legacy vs Multiverse",
  },

  // ── Anime Debates ─────────────────────────────────────────────────────────────
  {
    id: "goku-vs-naruto",
    title: "Saiyan God vs Ninja God",
    theory: "The most debated anime matchup ever. Goku can destroy planets. Naruto's Kurama chakra is planetary-level too, but Dragon Ball physics are orders of magnitude beyond Naruto's. 9 out of 10 power scalers say Goku — but Naruto fans never accept it.",
    team1Ids: [2],
    team2Ids: [6],
    mode: "debate",
    category: "Anime Debates",
    hot: true,
  },
  {
    id: "gojo-vs-sukuna",
    title: "The JJK Final Answer",
    theory: "Gojo's Infinity makes him untouchable. Sukuna's Malevolent Shrine + Reverse Cursed Technique makes him unkillable. The manga answered it — but fans still argue whether Gojo was nerfed by the sealing, and whether it counts.",
    team1Ids: [84],
    team2Ids: [178],
    mode: "debate",
    category: "Anime Debates",
    hot: true,
  },
  {
    id: "saitama-vs-goku",
    title: "One Punch vs Infinite Power",
    theory: "The ultimate power scaling paradox. Saitama's power is canonically limitless — he's never found an upper bound. Goku constantly breaks through power ceilings. Most theorists say Saitama's 'one punch' is always enough, by definition.",
    team1Ids: [87],
    team2Ids: [2],
    mode: "debate",
    category: "Anime Debates",
    hot: true,
  },
  {
    id: "saitama-vs-superman",
    title: "The Unstoppable Force vs The Immovable Object",
    theory: "Saitama's power is limitless — he's literally never exerted himself. Superman's power is near-infinite under a yellow sun. The community has debated this for years: 'Serious Punch' vs 'heat vision from orbit.' Logically: both hit at the exact same time, nobody knows what happens.",
    team1Ids: [87],
    team2Ids: [1],
    mode: "debate",
    category: "Anime Debates",
    hot: true,
  },
  {
    id: "naruto-vs-sasuke-final",
    title: "Final Valley — No Limits",
    theory: "They went to the Final Valley and fought to a draw with one arm each. Full power, no restrictions — who actually wins? Naruto has Six Paths Sage Mode + Kurama. Sasuke has the Rinnegan + Indra's arrow. Most fans call it 50/50 but Sasuke has more utility.",
    team1Ids: [6],
    team2Ids: [52],
    mode: "debate",
    category: "Anime Debates",
  },
  {
    id: "goku-vs-vegeta",
    title: "Rivals for Eternity",
    theory: "The rivalry that defined Dragon Ball. Goku always edges Vegeta when it matters — but Vegeta's pride and raw intelligence make him the better tactician. Ultra Ego vs Ultra Instinct: one uses anger, one transcends it.",
    team1Ids: [2],
    team2Ids: [12],
    mode: "fun",
    category: "Anime Debates",
  },
  {
    id: "luffy-vs-naruto-vs-goku",
    title: "The Shonen Big Three (Plus One)",
    theory: "Luffy vs Naruto vs Goku — the biggest shonen debate ever. Power scaling puts Goku miles ahead, Naruto second, Luffy third. But Luffy's Conqueror's Haki can knock out weaker-willed opponents instantly. The fun here isn't the answer — it's the argument.",
    team1Ids: [57, 58],
    team2Ids: [6, 52],
    mode: "fun",
    category: "Anime Debates",
    hot: true,
  },
  {
    id: "dragon-ball-gauntlet",
    title: "Dragon Ball's Strongest — Both Sides",
    theory: "The top of Dragon Ball vs itself. Goku + Vegeta + Gogeta vs Jiren + Beerus + Frieza. This is a power scaling nightmare even within the same franchise. Beerus alone might end all of them — but Gogeta Blue vs Jiren is the fight fans actually want.",
    team1Ids: [2, 12, 575],
    team2Ids: [41, 40, 38],
    mode: "fun",
    category: "Anime Debates",
  },
  {
    id: "naruto-bleach-one-piece",
    title: "Big Three Captains — Team War",
    theory: "Naruto + Sasuke + Madara vs Ichigo + Aizen + Kenpachi. The Naruto side has Infinite Tsukuyomi. The Bleach side has Aizen's Kyoka Suigetsu — which means nobody can trust what they're seeing. This matchup comes down to who processes sensory deception better.",
    team1Ids: [6, 52, 55],
    team2Ids: [83, 306, 307],
    mode: "debate",
    category: "Anime Debates",
  },
  {
    id: "itachi-vs-sasuke",
    title: "The Brother War — Final Form",
    theory: "Itachi threw the fight. In a real no-holds-barred duel, who wins? Itachi's Amaterasu and Tsukuyomi vs Sasuke's Rinnegan and perfect Susanoo. Itachi was already sick — but healthy Itachi with Edo Tensei? Community is split 50/50.",
    team1Ids: [54],
    team2Ids: [52],
    mode: "debate",
    category: "Anime Debates",
  },
  {
    id: "rimuru-vs-goku",
    title: "Slime God vs Super Saiyan",
    theory: "Rimuru Tempest absorbed so many monsters he became a True Demon Lord and then a godlike being. His Unlimited Imprisonment can cage anyone. Can Dragon Ball physics beat a being who can observe, absorb, and replicate any power he's seen?",
    team1Ids: [95],
    team2Ids: [2],
    mode: "debate",
    category: "Anime Debates",
  },
  {
    id: "solo-leveling-vs-hxh",
    title: "Shadow Monarch vs Chimera Ant King",
    theory: "Sung Jin-Woo commands an army of the dead and has become a Monarch of shadows. Meruem is the most perfect living weapon — Nen that evolves with every opponent he kills. The real debate: can Meruem adapt fast enough before Jin-Woo adds him to his army?",
    team1Ids: [321],
    team2Ids: [91],
    mode: "debate",
    category: "Anime Debates",
  },

  // ── Street Level ──────────────────────────────────────────────────────────────
  {
    id: "batman-vs-john-wick",
    title: "Prepared Billionaire vs The Boogeyman",
    theory: "Batman's prep-time is legendary — he has contingencies for gods. John Wick killed 3 men with a pencil. The community debate: pure CQC, no gadgets — Wick wins. With prep and gadgets — Batman wins. The real question is: does Batman count as street level?",
    team1Ids: [13],
    team2Ids: [100],
    mode: "debate",
    category: "Street Level",
    hot: true,
  },
  {
    id: "wick-vs-bourne",
    title: "The Boogeyman vs The Asset",
    theory: "John Wick is a killing machine with emotional drive. Jason Bourne is a military-programmed spy who can analyze and adapt mid-fight. Neither has powers. Neither stops. Most martial arts analysts give it to Bourne's adaptability — but Wick's aggression doesn't give him time to think.",
    team1Ids: [100],
    team2Ids: [118],
    mode: "fun",
    category: "Street Level",
    hot: true,
  },
  {
    id: "deadpool-vs-deathstroke",
    title: "Merc with a Mouth vs Merc with a Mission",
    theory: "Both are enhanced mercenaries with regeneration and peak-human combat skills. Deathstroke uses 90% of his brain and is tactically flawless. Deadpool can't die. The community debate: Deathstroke wins every fight — except the last one, which never ends.",
    team1Ids: [28],
    team2Ids: [19],
    mode: "fun",
    category: "Street Level",
    hot: true,
  },
  {
    id: "spy-showdown",
    title: "World's Greatest Spy — Bond vs Bourne vs Hunt",
    theory: "Bond is suave and gadget-reliant. Bourne is a human weapon with amnesia. Ethan Hunt has done things that shouldn't be physically possible. Fan consensus: Bourne in a straight fight, Hunt in a mission, Bond in a tuxedo.",
    team1Ids: [111, 118],
    team2Ids: [110, 100],
    mode: "fun",
    category: "Street Level",
  },
  {
    id: "spiderman-vs-daredevil",
    title: "New York's Finest",
    theory: "Spider-Man has the proportional strength of a spider plus spider-sense that predicts attacks before they happen. Daredevil's radar sense is nearly identical — he can 'see' Spidey coming too. The debate: does spider-sense cancel against radar sense? And can Matt survive getting hit once?",
    team1Ids: [3],
    team2Ids: [35],
    mode: "debate",
    category: "Street Level",
  },
  {
    id: "batman-vs-daredevil",
    title: "No Powers. Just Fists.",
    theory: "The ultimate martial arts debate: Batman has trained in every combat style on earth. Daredevil trained under Stick and Elektra and fights crime in Hell's Kitchen every night. Without gadgets — pure fighting — this is legitimately contested. Matt's radar sense makes Batman's detective tricks useless.",
    team1Ids: [13],
    team2Ids: [35],
    mode: "debate",
    category: "Street Level",
  },
  {
    id: "sherlock-vs-light",
    title: "The World's Greatest Detective vs God of the New World",
    theory: "Sherlock Holmes can deduce your life story in 4 seconds. Light Yagami killed people with a notebook and manipulated entire governments. No powers, no physical fight — this is a pure intelligence war. L came close. Sherlock might actually win.",
    team1Ids: [8],
    team2Ids: [465],
    mode: "debate",
    category: "Street Level",
  },

  // ── Video Game Legends ─────────────────────────────────────────────────────────
  {
    id: "cloud-vs-sephiroth",
    title: "Cloud vs Sephiroth — The Eternal Rematch",
    theory: "The most iconic video game rivalry. Sephiroth is a demigod who survived Aerith's death magic and came back from the Lifestream multiple times. Cloud beat him. Then beat him again. Then again. The theory: Sephiroth always comes back stronger, but Cloud always finds one more limit break.",
    team1Ids: [72],
    team2Ids: [73],
    mode: "fun",
    category: "Video Game Legends",
    hot: true,
  },
  {
    id: "kratos-vs-master-chief",
    title: "God Killer vs Spartan Supersoldier",
    theory: "Kratos has killed literal Greek and Norse gods. Master Chief is the greatest human supersoldier — Mjolnir armor, neural interface, Cortana (RIP). The power gap is enormous, but the community still debates: could Chief's tactical intelligence and firepower matter against a demigod?",
    team1Ids: [69],
    team2Ids: [71],
    mode: "fun",
    category: "Video Game Legends",
    hot: true,
  },
  {
    id: "sub-zero-vs-scorpion",
    title: "Ice vs Fire — The MK War",
    theory: "The most iconic Mortal Kombat rivalry. Sub-Zero can freeze the blood inside your body. Scorpion's 'Get over here!' spear attack has killed gods in the MK lore. They've fought hundreds of times in canon. The answer changes with every storyline — that's why it's still the best MK debate.",
    team1Ids: [141],
    team2Ids: [140],
    mode: "fun",
    category: "Video Game Legends",
    hot: true,
  },
  {
    id: "dante-vs-vergil",
    title: "DMC Brothers — Power of Rebellion vs Yamato",
    theory: "Dante uses the Rebellion and fights with style and improvisation. Vergil uses Yamato and fights with precision and power. They're the same person, split down the middle. The manga and game canon give Vergil the edge at max power — but Dante keeps winning anyway.",
    team1Ids: [74],
    team2Ids: [543],
    mode: "fun",
    category: "Video Game Legends",
  },
  {
    id: "doomslayer-vs-master-chief",
    title: "Doom Marine vs Spartan — The One-Man Army Debate",
    theory: "Doomslayer has solo'd Hell. Twice. On foot. Master Chief leads armies. In a 1v1, the community strongly favors Doomslayer — his speed, aggression, and damage output are all superhuman. Chief's tactical edge might not matter when the enemy is literally too fast to plan around.",
    team1Ids: [97],
    team2Ids: [71],
    mode: "fun",
    category: "Video Game Legends",
  },
  {
    id: "link-vs-cloud",
    title: "Hero of Time vs SOLDIER First Class",
    theory: "Link has weapons of legend and divine protection — the Triforce of Courage, Master Sword, and Hyrulean magic. Cloud has superhuman strength from Jenova cells, limit breaks, and a seven-foot sword. The debate: can Cloud handle divine weapons? Can Link handle someone who bench presses a house?",
    team1Ids: [75],
    team2Ids: [72],
    mode: "fun",
    category: "Video Game Legends",
  },
  {
    id: "kratos-vs-doomslayer",
    title: "God Killer vs Hell Killer",
    theory: "The community has been screaming for this fight. Kratos kills gods. Doomslayer kills demons. Put them in a room together: pure physical output, pure aggression, zero mercy. Kratos has divine physiology. Slayer has Divinity shards and a hammer that hits like a nuke. This is THE video game debate right now.",
    team1Ids: [69],
    team2Ids: [97],
    mode: "fun",
    category: "Video Game Legends",
    hot: true,
  },

  // ── Gods & Myths ──────────────────────────────────────────────────────────────
  {
    id: "kratos-vs-thor",
    title: "The God of War vs Multiverse's Thor",
    theory: "Kratos has killed Ares, Zeus, Kronos, Odin, and Thor (Norse). Multiverse's Thor has fought Galactus and Celestials. The debate: is GoW's power scaling comparable to Multiverse cosmic? Most agree in-lore Kratos scales higher than people think.",
    team1Ids: [69],
    team2Ids: [7],
    mode: "debate",
    category: "Gods & Myths",
    hot: true,
  },
  {
    id: "zeus-vs-thor",
    title: "King of Olympus vs Asgardian Thunder",
    theory: "Greek pantheon vs Norse pantheon — the original mythology war. Zeus rules all gods and can throw lightning that leveled Typhon. Thor is mighty but not the king of his pantheon. Most mythology scholars give it to Zeus, but Multiverse Thor fans disagree.",
    team1Ids: [78],
    team2Ids: [7],
    mode: "debate",
    category: "Gods & Myths",
  },
  {
    id: "olympus-vs-asgard",
    title: "Olympus vs Asgard — Full Pantheon",
    theory: "Full mythology war: Achilles + Hercules + Zeus vs Thor + Loki + Odin. Greek myth is generally stronger in fiction rankings, but Norse gods have Odin's All-Father power. The team match makes this genuinely unpredictable.",
    team1Ids: [76, 77, 78],
    team2Ids: [7, 194, 474],
    mode: "fun",
    category: "Gods & Myths",
  },
  {
    id: "hela-vs-death",
    title: "Hela vs Apocalypse — The Destroyers",
    theory: "Hela crushed Thor's hammer with one hand and killed the entire Asgardian army in moments. Apocalypse has rewritten the genetic code of the mutant species. Both are extinction-level threats. The community debate: does Hela's Asgardian magic beat Apocalypse's adaptive mutation?",
    team1Ids: [664],
    team2Ids: [660],
    mode: "debate",
    category: "Gods & Myths",
  },

  // ── Cosmic Tier ───────────────────────────────────────────────────────────────
  {
    id: "galactus-vs-anos",
    title: "World Eater vs Demon King",
    theory: "Galactus eats planets as snacks. Anos Voldigoad can destroy all of reality — he ended a thousand-year war by dying and resurrecting to do it again. Community debate: Anos is one of few anime characters who could genuinely fight a Multiverse Cosmic.",
    team1Ids: [187],
    team2Ids: [182],
    mode: "debate",
    category: "Cosmic Tier",
    hot: true,
  },
  {
    id: "anti-monitor-vs-thanos",
    title: "Anti-Monitor vs Thanos — Universe Enders",
    theory: "Anti-Monitor destroyed the entire Legacy multiverse. Thanos with the Gauntlet deleted half of all life in the universe with a snap. The debate: does the Gauntlet's reality stone beat a being literally made of antimatter? Most think Anti-Monitor at full power makes the Gauntlet irrelevant.",
    team1Ids: [482],
    team2Ids: [29],
    mode: "debate",
    category: "Cosmic Tier",
    hot: true,
  },
  {
    id: "scarlet-witch-vs-dr-strange",
    title: "Chaos Magic vs Sorcerer Supreme",
    theory: "Post-WandaVision Wanda depowered an entire species with 3 words. Doctor Strange has the Eye of Agamotto and mastery of every arcane art. MoM answer: Wanda wins — Strange needed the Darkhold to compete. Fans still argue the MCU downplayed Strange.",
    team1Ids: [31],
    team2Ids: [25],
    mode: "debate",
    category: "Cosmic Tier",
  },
  {
    id: "beerus-vs-darkseid",
    title: "God of Destruction vs Lord of Apokolips",
    theory: "Beerus destroyed half a planet with a finger flick and can erase things from existence with Hakai. Darkseid has the Omega Beams that can erase time. Most Dragon Ball fans say Beerus ends Darkseid instantly. Legacy fans argue Omega Force is reality-level. This is the cross-IP cosmic debate.",
    team1Ids: [40],
    team2Ids: [89],
    mode: "debate",
    category: "Cosmic Tier",
  },
  {
    id: "phoenix-vs-galactus",
    title: "Phoenix Force vs World Eater",
    theory: "The Phoenix Force is the sum of all life, death, and rebirth in the universe. Galactus feeds on planets as a fundamental cosmic function. When Jean Grey (White Phoenix) fought Galactus in the comics, she held her own. Can cosmic fire match the embodiment of consumption?",
    team1Ids: [329],
    team2Ids: [187],
    mode: "debate",
    category: "Cosmic Tier",
  },

  // ── Horror Showdown ───────────────────────────────────────────────────────────
  {
    id: "slasher-royale",
    title: "The Slasher Royale",
    theory: "Freddy kills in dreams, Jason kills physically and can't die, Michael Myers just won't stop. Put them in two teams: community theory is Jason + Pennywise (fear + brute force) vs Freddy + Michael (dreams + persistence). It's chaos — that's the point.",
    team1Ids: [162, 164],
    team2Ids: [163, 165],
    mode: "fun",
    category: "Horror Showdown",
    hot: true,
  },
  {
    id: "ghost-rider-vs-pennywise",
    title: "Spirit of Vengeance vs The Deadlights",
    theory: "Ghost Rider's Penance Stare makes you feel every sin you've ever caused — feeding off fear is Pennywise's power, but is having fed on fear the same as sinning? Community theory: Penance Stare might be the only thing in fiction that works on Pennywise, because IT has caused infinite fear.",
    team1Ids: [33],
    team2Ids: [165],
    mode: "fun",
    category: "Horror Showdown",
  },
  {
    id: "predator-vs-terminator",
    title: "Hunter vs Machine — No Rules",
    theory: "Predator hunts for sport with plasma cannons, active camo, and a self-destruct nuke. The Terminator is an unstoppable machine that does not feel pain, fear, or mercy. The Predator can see in thermal — but the T-800 has no heat signature. The debate hinges entirely on whether cloaking beats infrared.",
    team1Ids: [81],
    team2Ids: [80],
    mode: "fun",
    category: "Horror Showdown",
  },

  // ── Sci-Fi Clash ──────────────────────────────────────────────────────────────
  {
    id: "alien-vs-predator",
    title: "Xenomorph vs Predator",
    theory: "Predators hunt Xenomorphs as a rite of passage. But Alien Queens command entire hives. 1v1: Predator wins with tech advantage. 1v10: Aliens overwhelm. The lore canon actually showed both sides win in different scenarios — neither has a clear edge.",
    team1Ids: [82],
    team2Ids: [81],
    mode: "fun",
    category: "Sci-Fi Clash",
    hot: true,
  },
  {
    id: "empire-vs-republic",
    title: "The Dark Side's Best vs The Light's Best",
    theory: "Darth Vader + Palpatine + Anakin (pre-suit) vs Luke Skywalker + Yoda + Obi-Wan Kenobi. The Sith team has raw power and no mercy. The Jedi team has wisdom and the Force of balance behind them. Legends-era Luke matches Palpatine in the Force. But Palpatine + Vader together... that's different.",
    team1Ids: [9, 48, 607],
    team2Ids: [45, 46, 47],
    mode: "debate",
    category: "Sci-Fi Clash",
    hot: true,
  },
  {
    id: "neo-vs-terminator",
    title: "The One vs The Machine",
    theory: "Neo can see code and manipulate reality inside the Matrix. The Terminator exists outside the Matrix — it's a physical threat in the real world. In the Matrix: Neo wins easily. In the real world: T-800 wins. The debate is which environment they fight in, and whether Neo's powers work on machines.",
    team1Ids: [103],
    team2Ids: [80],
    mode: "fun",
    category: "Sci-Fi Clash",
  },
  {
    id: "robocop-vs-judge-dredd",
    title: "Law Enforcement Endgame",
    theory: "RoboCop is a cyborg cop who cannot be stopped by conventional weapons. Judge Dredd is the law itself — genetically bred, trained from birth, with no concept of fear. The debate: does RoboCop's durability beat Dredd's tactical intelligence? Dredd has fought gods. Murphy has fought crime.",
    team1Ids: [168],
    team2Ids: [562],
    mode: "fun",
    category: "Sci-Fi Clash",
  },
  {
    id: "master-chief-vs-solid-snake",
    title: "Spartan vs Tactical Espionage God",
    theory: "Master Chief is a supersoldier with Mjolnir armor. Solid Snake has infiltrated nuclear facilities alone with a cardboard box and won. The debate: does raw Spartan power beat Snake's tactical genius? Most agree Chief wins a direct fight. Most agree Snake would never let it be a direct fight.",
    team1Ids: [71],
    team2Ids: [215],
    mode: "debate",
    category: "Sci-Fi Clash",
  },
  {
    id: "optimus-vs-vader",
    title: "Optimus Prime vs Darth Vader",
    theory: "Optimus Prime is a 30-foot war robot who has faced planet-destroying Decepticons. Darth Vader commands the Force and survived being burned alive. The debate: does the Force reach inside a Cybertronian alloy chassis? Most agree Vader is outmatched physically but the Force chokehold changes things.",
    team1Ids: [107],
    team2Ids: [9],
    mode: "fun",
    category: "Sci-Fi Clash",
  },

  // ── Fantasy Clash ─────────────────────────────────────────────────────────────
  {
    id: "voldemort-vs-gandalf",
    title: "Dark Lord vs The White",
    theory: "Gandalf is literally a Maia — an angelic being who chose to limit his power. Voldemort is the most powerful dark wizard in centuries but still mortal. Most fantasy theorists say Gandalf's true power, unconstrained, would end Voldemort instantly.",
    team1Ids: [43],
    team2Ids: [10],
    mode: "debate",
    category: "Fantasy Clash",
    hot: true,
  },
  {
    id: "geralt-vs-aragorn",
    title: "The Witcher vs The King",
    theory: "Geralt of Rivia is a mutant monster hunter with magic Signs, superhuman reflexes, and decades of combat experience against things that would kill anyone else. Aragorn is a Dúnedain ranger, a legendary swordsman, and the rightful King of Gondor. Both fight monsters professionally. The debate: mutations vs lineage.",
    team1Ids: [70],
    team2Ids: [66],
    mode: "fun",
    category: "Fantasy Clash",
    hot: true,
  },
  {
    id: "sauron-vs-voldemort",
    title: "Rings of Power vs Horcruxes",
    theory: "Sauron forged One Ring to rule them all — his power corrupted armies and gods. Voldemort split his soul 7 times to achieve immortality. Both are Dark Lords of different scales. Sauron was a Maia-level being. Voldemort was the most powerful human wizard. The scale difference is enormous — but Voldemort's methods are precise.",
    team1Ids: [68],
    team2Ids: [43],
    mode: "debate",
    category: "Fantasy Clash",
  },
  {
    id: "daenerys-vs-cersei",
    title: "Fire and Blood vs Lions — The Iron Throne War",
    theory: "Daenerys with Drogon vs Cersei with King's Landing's armies. The show's final answer was controversial. The book debate is different: Cersei is a political mastermind; Daenerys is a conqueror. Without dragons, Cersei wins. With dragons, Cersei burns.",
    team1Ids: [63],
    team2Ids: [538],
    mode: "fun",
    category: "Fantasy Clash",
  },
  {
    id: "night-king-vs-sauron",
    title: "Army of the Dead vs Army of Mordor",
    theory: "The Night King commands unlimited undead and can raise anything he kills. Sauron has Nazgûl, Uruk-Hai, and is himself a divine being of Morgoth's making. Both armies are undead/dark forces. The debate: can Night King raise Sauron's army? And can Sauron's Rings break White Walker magic?",
    team1Ids: [64],
    team2Ids: [68],
    mode: "fun",
    category: "Fantasy Clash",
  },
];

const CATEGORIES = ["All", "Developer Legends", "Legacy vs Multiverse", "Anime Debates", "Street Level", "Video Game Legends", "Sci-Fi Clash", "Cosmic Tier", "Gods & Myths", "Horror Showdown", "Fantasy Clash"];

// ─── Matchup card ─────────────────────────────────────────────────────────────
function FighterMini({ character, side }: { character: Character | undefined; side: "left" | "right" }) {
  const color = side === "left" ? "#00f0ff" : "#ff3b30";
  const initials = character ? character.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: 52 }}>
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          width: 52, height: 64,
          border: `1.5px solid ${color}50`,
          boxShadow: `0 0 12px ${color}20`,
        }}
      >
        {character?.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display font-bold text-sm" style={{ background: `${color}10`, color }}>
            {initials}
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)" }} />
      </div>
      {character && (
        <span className="text-center leading-none font-bold" style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", maxWidth: 52 }}>
          {character.name.split(" ").slice(0, 2).join(" ")}
        </span>
      )}
    </div>
  );
}

function MatchupCard({
  matchup,
  characterMap,
  onLoad,
}: {
  matchup: Matchup;
  characterMap: Map<number, Character>;
  onLoad: (m: Matchup) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const team1 = (Array.isArray(matchup.team1Ids) ? matchup.team1Ids : []).map(id => characterMap.get(id));
  const team2 = (Array.isArray(matchup.team2Ids) ? matchup.team2Ids : []).map(id => characterMap.get(id));
  const loaded = team1.every(Boolean) && team2.every(Boolean);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft: `3px solid ${matchup.mode === "debate" ? "#c084fc" : "#ff0055"}`,
      }}
    >
      {/* Hot badge */}
      {matchup.hot && (
        <div
          className="absolute top-2 right-2 flex items-center gap-0.5"
          style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: "#ff6b35" }}
        >
          <Flame className="w-3 h-3" />
          HOT
        </div>
      )}

      {/* Mode badge */}
      <div
        className="absolute top-2 left-3"
        style={{
          fontSize: 7,
          fontWeight: 800,
          letterSpacing: "0.15em",
          color: matchup.mode === "debate" ? "#c084fc" : "#ff0055",
          opacity: 0.8,
        }}
      >
        {matchup.mode === "debate" ? "⚖ DEBATE" : "⚡ FUN"}
      </div>

      <div className="pt-6 pb-3 px-3">
        {/* Title */}
        <h3 className="font-display uppercase tracking-wider mb-2" style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", lineHeight: 1.2 }}>
          {matchup.title}
        </h3>

        {/* Team display */}
        <div className="flex items-center gap-2 mb-3">
          {/* Team 1 */}
          <div className="flex gap-1.5 flex-1 justify-end">
            {team1.map((c, i) => (
              <FighterMini key={i} character={c} side="left" />
            ))}
          </div>

          {/* VS */}
          <div
            className="flex-shrink-0 font-display font-black italic"
            style={{ fontSize: 18, color: "rgba(255,255,255,0.2)", lineHeight: 1 }}
          >
            VS
          </div>

          {/* Team 2 */}
          <div className="flex gap-1.5 flex-1 justify-start">
            {team2.map((c, i) => (
              <FighterMini key={i} character={c} side="right" />
            ))}
          </div>
        </div>

        {/* Theory toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full text-left mb-2 transition-all"
          style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", lineHeight: 1.5 }}
        >
          {expanded ? matchup.theory : matchup.theory.slice(0, 90) + (matchup.theory.length > 90 ? "…" : "")}
          {matchup.theory.length > 90 && (
            <span style={{ color: "#c084fc", marginLeft: 4 }}>{expanded ? " ↑ Less" : " ↓ The Theory"}</span>
          )}
        </button>

        {/* Load button */}
        <button
          onClick={() => loaded && onLoad(matchup)}
          disabled={!loaded}
          className="w-full flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95"
          style={{
            padding: "7px 0",
            background: loaded
              ? matchup.mode === "debate"
                ? "linear-gradient(135deg, rgba(192,132,252,0.15), rgba(192,132,252,0.08))"
                : "linear-gradient(135deg, rgba(255,0,85,0.15), rgba(255,0,85,0.08))"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${loaded ? (matchup.mode === "debate" ? "rgba(192,132,252,0.4)" : "rgba(255,0,85,0.4)") : "rgba(255,255,255,0.08)"}`,
            color: loaded ? (matchup.mode === "debate" ? "#c084fc" : "#ff0055") : "rgba(255,255,255,0.2)",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.18em",
            cursor: loaded ? "pointer" : "default",
          }}
        >
          {matchup.mode === "debate"
            ? <MessageSquare className="w-3 h-3" />
            : <Swords className="w-3 h-3" />
          }
          {loaded ? `FIGHT THIS — ${matchup.mode.toUpperCase()} MODE` : "LOADING FIGHTERS…"}
        </button>
      </div>
    </div>
  );
}

// ─── Developer Legends special card ───────────────────────────────────────────
function DevLegendsCard({
  chris,
  troy,
  onLoad,
}: {
  chris: Character | undefined;
  troy: Character | undefined;
  onLoad: (team1: Character[], team2: Character[], mode: string) => void;
}) {
  const loaded = !!(chris && troy);

  // Deploy them TOGETHER on team 1 — they never fight each other
  const handleDeploy = () => {
    if (!chris || !troy) return;
    onLoad([chris, troy], [], "cinematic");
  };

  return (
    <div
      className="relative overflow-hidden col-span-full"
      style={{
        background: "linear-gradient(135deg, rgba(255,200,0,0.06), rgba(0,0,0,0.5))",
        border: "1.5px solid rgba(255,200,0,0.25)",
        borderLeft: "4px solid #ffc800",
      }}
    >
      {/* Gold badge */}
      <div
        className="absolute top-0 right-0 px-3 py-1"
        style={{
          fontSize: 7,
          fontWeight: 900,
          letterSpacing: "0.25em",
          color: "#ffc800",
          background: "rgba(255,200,0,0.12)",
          borderLeft: "1px solid rgba(255,200,0,0.2)",
          borderBottom: "1px solid rgba(255,200,0,0.2)",
        }}
      >
        ◆ DEVELOPER LEGENDS
      </div>

      <div className="pt-6 pb-4 px-4">
        <h3
          className="font-display uppercase tracking-wider mb-1"
          style={{ fontSize: 14, color: "#ffc800", lineHeight: 1.2 }}
        >
          The Architects — Brothers in Arms
        </h3>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 12, lineHeight: 1.6, letterSpacing: "0.05em" }}>
          Chris Henry and Troy Wilson built this entire arena. They're brothers — they don't answer to anyone 
          inside it, and they sure as hell don't fight each other. Deploy them together and watch everything else burn.
        </p>

        {/* Character portraits — side by side as brothers */}
        <div className="flex items-center gap-4 mb-4">
          {[chris, troy].map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="relative overflow-hidden"
                style={{
                  width: 56, height: 72,
                  border: "2px solid rgba(255,200,0,0.5)",
                  boxShadow: "0 0 16px rgba(255,200,0,0.2)",
                }}
              >
                {c?.imageUrl ? (
                  <img src={c.imageUrl} alt={c?.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display font-bold text-sm" style={{ background: "rgba(255,200,0,0.08)", color: "#ffc800" }}>
                    {c?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)" }} />
                <div className="absolute bottom-1 left-0 right-0 text-center">
                  <span style={{ fontSize: 7, fontWeight: 900, color: "#ffc800", letterSpacing: "0.08em" }}>
                    {c?.name?.split(" ")[0] ?? "?"}
                  </span>
                </div>
              </div>
              {i === 0 && (
                <span
                  className="font-display font-black mx-1"
                  style={{ fontSize: 18, color: "rgba(255,200,0,0.5)" }}
                >
                  +
                </span>
              )}
            </div>
          ))}
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: 8, lineHeight: 1.5, flex: 1, fontStyle: "italic" }}>
            These two don't fight each other.{" "}
            <span style={{ color: "rgba(255,200,0,0.6)" }}>Not now. Not ever.</span>
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={handleDeploy}
          disabled={!loaded}
          className="w-full flex items-center justify-center gap-2 transition-all duration-150 active:scale-95"
          style={{
            padding: "9px 0",
            background: loaded ? "linear-gradient(135deg, rgba(255,200,0,0.15), rgba(255,200,0,0.08))" : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${loaded ? "rgba(255,200,0,0.5)" : "rgba(255,255,255,0.08)"}`,
            color: loaded ? "#ffc800" : "rgba(255,255,255,0.2)",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: "0.2em",
            cursor: loaded ? "pointer" : "default",
          }}
        >
          <Swords className="w-3.5 h-3.5" />
          {loaded ? "DEPLOY THE ARCHITECTS" : "LOADING LEGENDS…"}
        </button>
      </div>
    </div>
  );
}

function DebateProfileButton() {
  const { user } = useUser();
  const name =
    (user?.unsafeMetadata?.username as string) ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "You";
  const initial = name.charAt(0).toUpperCase();
  return (
    <Link href="/profile">
      <button className="flex items-center gap-1.5 px-1 py-0.5 transition-all hover:bg-primary/10 rounded" title={`Profile: ${name}`}>
        <CharacterAvatar size={26} fallbackInitial={initial} />
      </button>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function Suggest() {
  const { data: characters } = useListCharacters();
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");

  const characterMap = useMemo(() => {
    const m = new Map<number, Character>();
    const safeChars = Array.isArray(characters) ? characters : [];
    safeChars.forEach(c => m.set(c.id, c));
    return m;
  }, [characters]);

  // Find Developer Legends by name (IDs are dynamic)
  const chris = useMemo(() => (Array.isArray(characters) ? characters : []).find(c => c.name === "Chris Henry"), [characters]);
  const troy  = useMemo(() => (Array.isArray(characters) ? characters : []).find(c => c.name === "Troy Wilson"), [characters]);

  const filtered = useMemo(
    () => activeCategory === "All" ? MATCHUPS : activeCategory === "Developer Legends" ? [] : MATCHUPS.filter(m => m.category === activeCategory),
    [activeCategory]
  );

  const hotCount = MATCHUPS.filter(m => m.hot).length;

  function handleLoad(matchup: Matchup) {
    const team1 = (Array.isArray(matchup.team1Ids) ? matchup.team1Ids : []).map(id => characterMap.get(id)).filter(Boolean) as Character[];
    const team2 = (Array.isArray(matchup.team2Ids) ? matchup.team2Ids : []).map(id => characterMap.get(id)).filter(Boolean) as Character[];
    try {
      localStorage.setItem("ava_pending_fight", JSON.stringify({
        team1,
        team2,
        mode: matchup.mode,
      }));
    } catch {}
    navigate("/");
  }

  function handleDevLoad(team1: Character[], team2: Character[], mode: string) {
    try {
      localStorage.setItem("ava_pending_fight", JSON.stringify({ team1, team2, mode }));
    } catch {}
    navigate("/");
  }

  const showDevLegends = activeCategory === "All" || activeCategory === "Developer Legends";

  return (
    <div className="flex flex-col min-h-full" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div
        className="px-4 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-end justify-between mb-1">
          <div>
            <h1 className="font-display text-2xl uppercase tracking-[0.2em]" style={{ color: "#ff0055", lineHeight: 1 }}>
              Debate Room
            </h1>
            <p className="mt-1" style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
              CURATED MATCHUPS · ONLINE THEORIES · INSTANT LOAD
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" style={{ fontSize: 10, color: "#ff6b35" }}>
              <Flame className="w-4 h-4" />
              <span className="font-bold">{hotCount} HOT</span>
            </div>
            <DebateProfileButton />
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-1">
            <div style={{ width: 10, height: 10, background: "#c084fc", borderRadius: 1 }} />
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>DEBATE MODE — AI uses real fan theories</span>
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: 10, height: 10, background: "#ff0055", borderRadius: 1 }} />
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>FUN MODE — cinematic chaos</span>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div
        className="flex gap-1 px-3 py-2 overflow-x-auto flex-shrink-0"
        style={{ scrollbarWidth: "none", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="flex-shrink-0 transition-all duration-150"
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.12em",
              padding: "4px 10px",
              background: activeCategory === cat ? "rgba(255,0,85,0.15)" : "transparent",
              border: `1px solid ${activeCategory === cat ? "rgba(255,0,85,0.5)" : "rgba(255,255,255,0.08)"}`,
              color: activeCategory === cat ? "#ff0055" : "rgba(255,255,255,0.35)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Matchup grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {showDevLegends && (
            <DevLegendsCard chris={chris} troy={troy} onLoad={handleDevLoad} />
          )}
          {(Array.isArray(filtered) ? filtered : []).map(matchup => (
            <MatchupCard
              key={matchup.id}
              matchup={matchup}
              characterMap={characterMap}
              onLoad={handleLoad}
            />
          ))}
        </div>

        {filtered.length === 0 && !showDevLegends && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Zap className="w-10 h-10" style={{ color: "rgba(255,255,255,0.1)" }} />
            <p className="font-display uppercase tracking-widest" style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>
              No matchups in this category
            </p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
