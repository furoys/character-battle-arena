import type { Character } from "@workspace/db";

export interface SynergyResult {
  multiplier: number;
  active: ActiveSynergy[];
}

export interface ActiveSynergy {
  label: string;
  bonus: number;
  positive: boolean;
}

const POSITIVE_SYNERGIES: {
  label: string;
  anyOf: string[];
  minMatch: number;
  bonus: number;
}[] = [
  { label: "GON & KILLUA", anyOf: ["Gon Freecss", "Killua Zoldyck", "Adult Gon Freecss"], minMatch: 2, bonus: 0.20 },
  { label: "TEAM AVATAR", anyOf: ["Aang", "Katara", "Zuko", "Toph Beifong", "Sokka"], minMatch: 2, bonus: 0.15 },
  { label: "Z-FIGHTERS", anyOf: ["Goku", "Vegeta", "Gohan", "Piccolo", "Krillin", "Trunks", "Goten"], minMatch: 2, bonus: 0.13 },
  { label: "AVENGERS ASSEMBLE", anyOf: ["Captain America", "Iron Man", "Thor", "Hulk", "Black Widow", "Hawkeye", "Spider-Man", "Vision", "Wanda Maximoff", "Ant-Man", "Star-Lord", "Groot", "Rocket Raccoon"], minMatch: 2, bonus: 0.12 },
  { label: "JUSTICE LEAGUE", anyOf: ["Superman", "Batman", "Wonder Woman", "The Flash", "Aquaman", "Green Lantern", "Cyborg"], minMatch: 2, bonus: 0.12 },
  { label: "STRAW HAT CREW", anyOf: ["Monkey D. Luffy", "Roronoa Zoro", "Sanji", "Nami", "Usopp", "Nico Robin", "Franky", "Brook", "Tony Tony Chopper", "Jinbe"], minMatch: 2, bonus: 0.12 },
  { label: "FAIRY TAIL GUILD", anyOf: ["Natsu Dragneel", "Erza Scarlet", "Gildarts Clive", "Gray Fullbuster", "Lucy Heartfilia", "Wendy Marvell", "Laxus Dreyar", "Makarov Dreyar"], minMatch: 2, bonus: 0.12 },
  { label: "HASHIRA CORPS", anyOf: ["Tanjiro Kamado", "Zenitsu Agatsuma", "Inosuke Hashibira", "Giyu Tomioka", "Kyojuro Rengoku", "Tengen Uzui", "Muichiro Tokito", "Sanemi Shinazugawa", "Obanai Iguro", "Mitsuri Kanroji", "Gyomei Himejima", "Shinobu Kocho"], minMatch: 2, bonus: 0.10 },
  { label: "THE BOYS", anyOf: ["Billy Butcher", "Homelander", "Soldier Boy", "Queen Maeve", "Starlight", "Translucent", "A-Train", "The Deep"], minMatch: 2, bonus: 0.10 },
  { label: "VILTRUMITE BLOOD", anyOf: ["Omni-Man", "Invincible"], minMatch: 2, bonus: 0.18 },
  { label: "SHADOW MONARCH'S ARMY", anyOf: ["Sung Jin-Woo", "Antares"], minMatch: 2, bonus: 0.15 },
  { label: "TEAM 7", anyOf: ["Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno", "Kakashi Hatake"], minMatch: 2, bonus: 0.12 },
  { label: "ESPADA TIER", anyOf: ["Sosuke Aizen", "Ulquiorra Cifer", "Kenpachi Zaraki", "Byakuya Kuchiki", "Yoruichi Shihoin"], minMatch: 2, bonus: 0.10 },
  { label: "CLASS 1-A", anyOf: ["Izuku Midoriya", "Katsuki Bakugo", "Shoto Todoroki", "All Might", "Endeavor"], minMatch: 2, bonus: 0.10 },
  { label: "FIRE NATION ROYALTY", anyOf: ["Azula", "Fire Lord Ozai", "Zuko"], minMatch: 2, bonus: 0.12 },
  { label: "PILLAR MEN", anyOf: ["Kars", "Esidisi", "Wamuu"], minMatch: 2, bonus: 0.15 },
  { label: "SINISTER STANDEES", anyOf: ["Dio Brando", "Yoshikage Kira", "Kars", "Enrico Pucci"], minMatch: 2, bonus: 0.12 },
];

const NEGATIVE_SYNERGIES: {
  label: string;
  requires: string[];
  penalty: number;
}[] = [
  { label: "SWORN ENEMIES", requires: ["Aang", "Fire Lord Ozai"], penalty: -0.25 },
  { label: "BLOOD RIVALS", requires: ["Goku", "Frieza"], penalty: -0.20 },
  { label: "ETERNAL RIVALS", requires: ["Naruto Uzumaki", "Sasuke Uchiha"], penalty: -0.10 },
  { label: "SIBLING GRUDGE", requires: ["Zuko", "Azula"], penalty: -0.12 },
  { label: "MONSTER & SLAYER", requires: ["Sung Jin-Woo", "Antares"], penalty: -0.15 },
  { label: "PREDATOR VS PREY", requires: ["Omni-Man", "Invincible"], penalty: -0.15 },
  { label: "ANCIENT RIVALRY", requires: ["Superman", "Batman"], penalty: -0.05 },
  { label: "HERO VS VILLAIN", requires: ["Homelander", "Billy Butcher"], penalty: -0.18 },
  { label: "COSMIC CLASH", requires: ["Goku", "Vegeta"], penalty: -0.08 },
  { label: "FIRE VS WATER", requires: ["Natsu Dragneel", "Juvia Lockser"], penalty: -0.10 },
  { label: "FIRE VS WATER", requires: ["Azula", "Katara"], penalty: -0.12 },
  { label: "LIGHT VS DARK", requires: ["Alucard", "Belmont"], penalty: -0.10 },
];

export function computeSynergy(team: Character[]): SynergyResult {
  if (team.length < 2) return { multiplier: 1.0, active: [] };

  const names = new Set(team.map(c => c.name));
  const active: ActiveSynergy[] = [];

  // ── Universe synergy ─────────────────────────────────────────────────────
  const allSameUniverse = team.every(c => c.universe === team[0]!.universe);
  if (allSameUniverse) {
    active.push({ label: `${team[0]!.universe.toUpperCase()} UNITY`, bonus: 0.08, positive: true });
  }

  // ── Named positive synergies ─────────────────────────────────────────────
  for (const syn of POSITIVE_SYNERGIES) {
    const matches = syn.anyOf.filter(n => names.has(n)).length;
    if (matches >= syn.minMatch) {
      // Skip universe unity for same-universe named synergy (avoid double-dipping)
      active.push({ label: syn.label, bonus: syn.bonus, positive: true });
    }
  }

  // ── Named negative synergies ─────────────────────────────────────────────
  for (const neg of NEGATIVE_SYNERGIES) {
    if (neg.requires.every(n => names.has(n))) {
      active.push({ label: neg.label, bonus: neg.penalty, positive: false });
    }
  }

  // ── Aggregate: positives and negatives handled separately, then combined ─
  let positiveBonus = 0;
  let negativePenalty = 0;
  for (const s of active) {
    if (s.positive) positiveBonus += s.bonus;
    else negativePenalty += s.bonus; // bonus is negative
  }

  // Cap at +30% positive, -30% negative
  positiveBonus = Math.min(positiveBonus, 0.30);
  negativePenalty = Math.max(negativePenalty, -0.30);

  const multiplier = 1.0 + positiveBonus + negativePenalty;

  return { multiplier, active };
}
