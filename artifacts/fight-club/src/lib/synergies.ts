export interface ActiveSynergy {
  label: string;
  bonus: number;
  positive: boolean;
}

export interface SynergyResult {
  multiplier: number;
  active: ActiveSynergy[];
}

const POSITIVE_SYNERGIES: {
  label: string;
  anyOf: string[];
  minMatch: number;
  bonus: number;
}[] = [
  // ── Hunter x Hunter ───────────────────────────────────────────────────────
  { label: "GON & KILLUA", anyOf: ["Gon Freecss", "Killua Zoldyck", "Adult Gon Freecss"], minMatch: 2, bonus: 0.20 },
  { label: "PHANTOM TROUPE", anyOf: ["Hisoka Morow", "Chrollo Lucilfer", "Illumi Zoldyck"], minMatch: 2, bonus: 0.14 },
  { label: "HUNTER EXAM SQUAD", anyOf: ["Gon Freecss", "Killua Zoldyck", "Kurapika", "Leorio Paradinight"], minMatch: 3, bonus: 0.15 },
  // ── Avatar: The Last Airbender ────────────────────────────────────────────
  { label: "TEAM AVATAR", anyOf: ["Aang", "Katara", "Zuko", "Toph Beifong", "Sokka"], minMatch: 2, bonus: 0.15 },
  { label: "FIRE NATION ROYALTY", anyOf: ["Azula", "Fire Lord Ozai", "Zuko"], minMatch: 2, bonus: 0.12 },
  // ── Dragon Ball ───────────────────────────────────────────────────────────
  { label: "Z-FIGHTERS", anyOf: ["Goku", "Vegeta", "Gohan", "Piccolo", "Krillin", "Trunks", "Goten"], minMatch: 2, bonus: 0.13 },
  // ── Marvel ────────────────────────────────────────────────────────────────
  { label: "AVENGERS ASSEMBLE", anyOf: ["Captain America", "Iron Man", "Thor", "Hulk", "Black Widow", "Hawkeye", "Spider-Man", "Vision", "Wanda Maximoff", "Ant-Man", "Star-Lord", "Groot", "Rocket Raccoon"], minMatch: 2, bonus: 0.12 },
  { label: "GUARDIANS OF THE GALAXY", anyOf: ["Star-Lord", "Groot", "Rocket Raccoon", "Drax", "Gamora", "Mantis", "Nebula"], minMatch: 3, bonus: 0.14 },
  { label: "MUTANT BROTHERHOOD", anyOf: ["Magneto", "Mystique", "Sabretooth", "Juggernaut", "Pyro"], minMatch: 2, bonus: 0.12 },
  // ── DC ────────────────────────────────────────────────────────────────────
  { label: "JUSTICE LEAGUE", anyOf: ["Superman", "Batman", "Wonder Woman", "Flash", "Aquaman", "Green Lantern", "Cyborg"], minMatch: 2, bonus: 0.12 },
  { label: "TRINITY", anyOf: ["Superman", "Batman", "Wonder Woman"], minMatch: 3, bonus: 0.18 },
  { label: "SPEED FORCE", anyOf: ["Flash", "Kid Flash", "Jay Garrick", "Wally West"], minMatch: 2, bonus: 0.14 },
  // ── One Piece ─────────────────────────────────────────────────────────────
  { label: "STRAW HAT CREW", anyOf: ["Monkey D. Luffy", "Roronoa Zoro", "Sanji", "Nami", "Usopp", "Nico Robin", "Franky", "Brook", "Tony Tony Chopper", "Jinbe"], minMatch: 2, bonus: 0.12 },
  { label: "MONSTER TRIO", anyOf: ["Monkey D. Luffy", "Roronoa Zoro", "Sanji"], minMatch: 3, bonus: 0.18 },
  { label: "SHICHIBUKAI REMNANTS", anyOf: ["Dracule Mihawk", "Boa Hancock", "Trafalgar Law", "Buggy"], minMatch: 2, bonus: 0.10 },
  // ── Fairy Tail ────────────────────────────────────────────────────────────
  { label: "FAIRY TAIL GUILD", anyOf: ["Natsu Dragneel", "Erza Scarlet", "Gildarts Clive", "Gray Fullbuster", "Lucy Heartfilia", "Wendy Marvell", "Laxus Dreyar", "Makarov Dreyar"], minMatch: 2, bonus: 0.12 },
  { label: "DRAGON SLAYERS", anyOf: ["Natsu Dragneel", "Laxus Dreyar", "Wendy Marvell", "Gajeel Redfox", "Sting Eucliffe", "Rogue Cheney"], minMatch: 2, bonus: 0.13 },
  // ── Demon Slayer ──────────────────────────────────────────────────────────
  { label: "HASHIRA CORPS", anyOf: ["Tanjiro Kamado", "Zenitsu Agatsuma", "Inosuke Hashibira", "Giyu Tomioka", "Kyojuro Rengoku", "Tengen Uzui", "Muichiro Tokito", "Sanemi Shinazugawa", "Obanai Iguro", "Mitsuri Kanroji", "Gyomei Himejima", "Shinobu Kocho"], minMatch: 2, bonus: 0.10 },
  { label: "UPPER MOON DEMONS", anyOf: ["Akaza", "Doma", "Kokushibo", "Gyutaro", "Hantengu", "Gyokko"], minMatch: 2, bonus: 0.14 },
  { label: "DEMON TRIO", anyOf: ["Tanjiro Kamado", "Zenitsu Agatsuma", "Inosuke Hashibira"], minMatch: 3, bonus: 0.15 },
  // ── The Boys ──────────────────────────────────────────────────────────────
  { label: "THE BOYS", anyOf: ["Billy Butcher", "Homelander", "Soldier Boy", "Queen Maeve", "Starlight", "Translucent", "A-Train", "The Deep"], minMatch: 2, bonus: 0.10 },
  { label: "THE SEVEN", anyOf: ["Homelander", "Queen Maeve", "A-Train", "The Deep", "Translucent", "Starlight", "Black Noir"], minMatch: 3, bonus: 0.13 },
  // ── Solo Leveling / Invincible ────────────────────────────────────────────
  { label: "VILTRUMITE BLOOD", anyOf: ["Omni-Man", "Invincible"], minMatch: 2, bonus: 0.18 },
  { label: "SHADOW MONARCH'S ARMY", anyOf: ["Sung Jin-Woo", "Antares"], minMatch: 2, bonus: 0.15 },
  // ── Naruto ────────────────────────────────────────────────────────────────
  { label: "TEAM 7", anyOf: ["Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno", "Kakashi Hatake"], minMatch: 2, bonus: 0.12 },
  { label: "AKATSUKI", anyOf: ["Nagato", "Konan", "Itachi Uchiha", "Kisame Hoshigaki", "Deidara", "Sasori", "Obito Uchiha", "Zetsu"], minMatch: 2, bonus: 0.13 },
  { label: "UCHIHA CLAN", anyOf: ["Sasuke Uchiha", "Itachi Uchiha", "Madara Uchiha", "Obito Uchiha", "Shisui Uchiha"], minMatch: 2, bonus: 0.14 },
  { label: "LEGENDARY SANNIN", anyOf: ["Jiraiya", "Tsunade", "Orochimaru"], minMatch: 2, bonus: 0.15 },
  // ── Bleach ────────────────────────────────────────────────────────────────
  { label: "ESPADA TIER", anyOf: ["Sosuke Aizen", "Ulquiorra Cifer", "Kenpachi Zaraki", "Byakuya Kuchiki", "Yoruichi Shihoin"], minMatch: 2, bonus: 0.10 },
  { label: "GOTEI 13 CAPTAINS", anyOf: ["Kenpachi Zaraki", "Byakuya Kuchiki", "Yoruichi Shihoin", "Shinji Hirako", "Shunsui Kyoraku", "Jushiro Ukitake"], minMatch: 2, bonus: 0.11 },
  { label: "SUBSTITUTE SOUL REAPERS", anyOf: ["Ichigo Kurosaki", "Chad", "Orihime Inoue", "Uryu Ishida"], minMatch: 2, bonus: 0.10 },
  // ── My Hero Academia ──────────────────────────────────────────────────────
  { label: "CLASS 1-A", anyOf: ["Izuku Midoriya", "Katsuki Bakugo", "Shoto Todoroki", "All Might", "Endeavor"], minMatch: 2, bonus: 0.10 },
  { label: "LEAGUE OF VILLAINS", anyOf: ["Tomura Shigaraki", "All For One", "Dabi", "Toga Himiko", "Twice", "Mr. Compress"], minMatch: 2, bonus: 0.12 },
  { label: "SYMBOL DUO", anyOf: ["All Might", "Izuku Midoriya"], minMatch: 2, bonus: 0.16 },
  // ── JoJo's Bizarre Adventure ──────────────────────────────────────────────
  { label: "PILLAR MEN", anyOf: ["Kars", "Esidisi", "Wamuu"], minMatch: 2, bonus: 0.15 },
  { label: "SINISTER STANDEES", anyOf: ["Dio Brando", "Yoshikage Kira", "Kars", "Enrico Pucci"], minMatch: 2, bonus: 0.12 },
  { label: "JOESTAR BLOODLINE", anyOf: ["Jonathan Joestar", "Joseph Joestar", "Jotaro Kujo", "Josuke Higashikata", "Giorno Giovanna", "Jolyne Cujoh"], minMatch: 2, bonus: 0.13 },
  { label: "GOLDEN WIND", anyOf: ["Giorno Giovanna", "Bruno Bucciarati", "Guido Mista", "Trish Una", "Narancia Ghirga", "Pannacotta Fugo"], minMatch: 2, bonus: 0.12 },
  // ── Attack on Titan ───────────────────────────────────────────────────────
  { label: "SURVEY CORPS", anyOf: ["Eren Yeager", "Mikasa Ackerman", "Levi Ackerman", "Armin Arlert", "Hange Zoe", "Erwin Smith"], minMatch: 2, bonus: 0.12 },
  { label: "ACKERMAN BOND", anyOf: ["Levi Ackerman", "Mikasa Ackerman"], minMatch: 2, bonus: 0.15 },
  { label: "TITAN SHIFTERS", anyOf: ["Eren Yeager", "Reiner Braun", "Annie Leonhart", "Bertholdt Hoover", "Ymir", "Pieck Finger", "Porco Galliard"], minMatch: 2, bonus: 0.12 },
  // ── Fullmetal Alchemist ───────────────────────────────────────────────────
  { label: "ELRIC BROTHERS", anyOf: ["Edward Elric", "Alphonse Elric"], minMatch: 2, bonus: 0.22 },
  { label: "STATE ALCHEMISTS", anyOf: ["Edward Elric", "Roy Mustang", "Alex Louis Armstrong", "Riza Hawkeye"], minMatch: 2, bonus: 0.12 },
  { label: "HOMUNCULI", anyOf: ["Pride", "Greed", "Envy", "Wrath", "Gluttony", "Lust", "Sloth", "Father"], minMatch: 2, bonus: 0.12 },
  // ── Jujutsu Kaisen ────────────────────────────────────────────────────────
  { label: "JUJUTSU HIGH", anyOf: ["Yuji Itadori", "Megumi Fushiguro", "Nobara Kugisaki", "Gojo Satoru", "Nanami Kento"], minMatch: 2, bonus: 0.12 },
  { label: "ZENIN CLAN", anyOf: ["Megumi Fushiguro", "Maki Zenin", "Naoya Zenin"], minMatch: 2, bonus: 0.11 },
  { label: "SPECIAL GRADE SORCERERS", anyOf: ["Gojo Satoru", "Ryomen Sukuna", "Yuta Okkotsu", "Suguru Geto"], minMatch: 2, bonus: 0.15 },
  // ── Chainsaw Man ──────────────────────────────────────────────────────────
  { label: "PUBLIC SAFETY DIVISION 4", anyOf: ["Denji", "Aki Hayakawa", "Power", "Himeno", "Kobeni Higashiyama"], minMatch: 2, bonus: 0.11 },
  { label: "DEVIL HUNTERS", anyOf: ["Denji", "Aki Hayakawa", "Kishibe", "Quanxi"], minMatch: 2, bonus: 0.12 },
  // ── God of War ────────────────────────────────────────────────────────────
  { label: "FATHER & SON", anyOf: ["Kratos", "Atreus"], minMatch: 2, bonus: 0.20 },
  // ── The Witcher ───────────────────────────────────────────────────────────
  { label: "WITCHER & DESTINY", anyOf: ["Geralt of Rivia", "Ciri"], minMatch: 2, bonus: 0.20 },
  { label: "WITCHER TRIO", anyOf: ["Geralt of Rivia", "Ciri", "Yennefer"], minMatch: 2, bonus: 0.15 },
  // ── One Punch Man ─────────────────────────────────────────────────────────
  { label: "HERO ASSOCIATION S-CLASS", anyOf: ["Saitama", "Genos", "Tatsumaki", "Bang", "King", "Atomic Samurai", "Child Emperor"], minMatch: 2, bonus: 0.11 },
  { label: "SENSEI & DISCIPLE", anyOf: ["Saitama", "Genos"], minMatch: 2, bonus: 0.14 },
  // ── Death Note ────────────────────────────────────────────────────────────
  { label: "KIRA'S SHADOW", anyOf: ["Light Yagami", "Ryuk", "Misa Amane"], minMatch: 2, bonus: 0.12 },
  // ── Spy x Family ──────────────────────────────────────────────────────────
  { label: "FORGER FAMILY", anyOf: ["Loid Forger", "Yor Forger", "Anya Forger"], minMatch: 2, bonus: 0.18 },
  // ── Sword Art Online ──────────────────────────────────────────────────────
  { label: "AINCRAD DUO", anyOf: ["Kirito", "Asuna"], minMatch: 2, bonus: 0.16 },
];

const NEGATIVE_SYNERGIES: {
  label: string;
  requires: string[];
  penalty: number;
}[] = [
  // ── Avatar ────────────────────────────────────────────────────────────────
  { label: "SWORN ENEMIES", requires: ["Aang", "Fire Lord Ozai"], penalty: -0.25 },
  { label: "SIBLING GRUDGE", requires: ["Zuko", "Azula"], penalty: -0.12 },
  { label: "FIRE VS WATER", requires: ["Azula", "Katara"], penalty: -0.12 },
  // ── Dragon Ball ───────────────────────────────────────────────────────────
  { label: "BLOOD RIVALS", requires: ["Goku", "Frieza"], penalty: -0.20 },
  { label: "COSMIC CLASH", requires: ["Goku", "Vegeta"], penalty: -0.08 },
  { label: "SAIYAN FEUD", requires: ["Vegeta", "Broly"], penalty: -0.10 },
  // ── Naruto ────────────────────────────────────────────────────────────────
  { label: "ETERNAL RIVALS", requires: ["Naruto Uzumaki", "Sasuke Uchiha"], penalty: -0.10 },
  { label: "BROTHERS OF SHADOW", requires: ["Itachi Uchiha", "Sasuke Uchiha"], penalty: -0.08 },
  { label: "SAGE VS STUDENT", requires: ["Jiraiya", "Naruto Uzumaki"], penalty: -0.05 },
  // ── Solo Leveling ─────────────────────────────────────────────────────────
  { label: "MONSTER & SLAYER", requires: ["Sung Jin-Woo", "Antares"], penalty: -0.15 },
  // ── Invincible ────────────────────────────────────────────────────────────
  { label: "PREDATOR VS PREY", requires: ["Omni-Man", "Invincible"], penalty: -0.15 },
  // ── DC ────────────────────────────────────────────────────────────────────
  { label: "ANCIENT RIVALRY", requires: ["Superman", "Batman"], penalty: -0.05 },
  { label: "SPEED PARADOX", requires: ["Flash", "Reverse-Flash"], penalty: -0.18 },
  { label: "KRYPTONIAN SCHISM", requires: ["Superman", "General Zod"], penalty: -0.15 },
  // ── The Boys ──────────────────────────────────────────────────────────────
  { label: "HERO VS VILLAIN", requires: ["Homelander", "Billy Butcher"], penalty: -0.18 },
  { label: "SOLDIER CONFLICT", requires: ["Homelander", "Soldier Boy"], penalty: -0.12 },
  // ── Fairy Tail ────────────────────────────────────────────────────────────
  { label: "FIRE VS WATER", requires: ["Natsu Dragneel", "Juvia Lockser"], penalty: -0.10 },
  // ── Castlevania ───────────────────────────────────────────────────────────
  { label: "LIGHT VS DARK", requires: ["Alucard", "Belmont"], penalty: -0.10 },
  // ── Attack on Titan ───────────────────────────────────────────────────────
  { label: "WALLS DIVIDED", requires: ["Eren Yeager", "Reiner Braun"], penalty: -0.15 },
  { label: "OATH OF VENGEANCE", requires: ["Eren Yeager", "Annie Leonhart"], penalty: -0.10 },
  // ── Fullmetal Alchemist ───────────────────────────────────────────────────
  { label: "HOMUNCULUS HUNT", requires: ["Edward Elric", "Envy"], penalty: -0.15 },
  { label: "KING VS STATE", requires: ["Father", "Roy Mustang"], penalty: -0.14 },
  // ── Jujutsu Kaisen ────────────────────────────────────────────────────────
  { label: "CURSE OF LIMITLESS", requires: ["Gojo Satoru", "Ryomen Sukuna"], penalty: -0.18 },
  { label: "VESSEL CONFLICT", requires: ["Yuji Itadori", "Ryomen Sukuna"], penalty: -0.20 },
  // ── Chainsaw Man ──────────────────────────────────────────────────────────
  { label: "DEVIL'S BARGAIN", requires: ["Denji", "Makima"], penalty: -0.22 },
  // ── Death Note ────────────────────────────────────────────────────────────
  { label: "GOD VS DETECTIVE", requires: ["Light Yagami", "L Lawliet"], penalty: -0.25 },
  // ── One Punch Man ─────────────────────────────────────────────────────────
  { label: "HERO VS MONSTER", requires: ["Saitama", "Boros"], penalty: -0.10 },
  // ── Bleach ────────────────────────────────────────────────────────────────
  { label: "BETRAYAL OF SOUL SOCIETY", requires: ["Sosuke Aizen", "Ichigo Kurosaki"], penalty: -0.15 },
  // ── God of War ────────────────────────────────────────────────────────────
  { label: "GODS' WRATH", requires: ["Kratos", "Zeus"], penalty: -0.20 },
  // ── JoJo ──────────────────────────────────────────────────────────────────
  { label: "STAR VS WORLD", requires: ["Jotaro Kujo", "Dio Brando"], penalty: -0.20 },
];

export function computeSynergy(team: { name: string; universe: string }[]): SynergyResult {
  if (team.length < 2) return { multiplier: 1.0, active: [] };

  const names = new Set(team.map(c => c.name));
  const active: ActiveSynergy[] = [];

  const allSameUniverse = team.every(c => c.universe === team[0]!.universe);
  if (allSameUniverse) {
    active.push({ label: `${team[0]!.universe.toUpperCase()} UNITY`, bonus: 0.08, positive: true });
  }

  for (const syn of POSITIVE_SYNERGIES) {
    const matches = syn.anyOf.filter(n => names.has(n)).length;
    if (matches >= syn.minMatch) {
      active.push({ label: syn.label, bonus: syn.bonus, positive: true });
    }
  }

  for (const neg of NEGATIVE_SYNERGIES) {
    if (neg.requires.every(n => names.has(n))) {
      active.push({ label: neg.label, bonus: neg.penalty, positive: false });
    }
  }

  let positiveBonus = 0;
  let negativePenalty = 0;
  for (const s of active) {
    if (s.positive) positiveBonus += s.bonus;
    else negativePenalty += s.bonus;
  }
  positiveBonus = Math.min(positiveBonus, 0.30);
  negativePenalty = Math.max(negativePenalty, -0.30);

  return { multiplier: 1.0 + positiveBonus + negativePenalty, active };
}
