/**
 * tagCharacters.ts
 * One-shot script: derive behavior tags for every character and store in behavior_tags[].
 * Run with: npx tsx src/lib/tagCharacters.ts
 */
import { db } from "@workspace/db";
import { charactersTable } from "@workspace/db/schema";
import type { Character } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── Tag definitions ──────────────────────────────────────────────────────────
//
// Each tag has a stat threshold (optional) and a regex against the combined
// name+universe+specialAbility+description+weaknesses text.
//
const TAG_RULES: {
  tag: string;
  statTest?: (c: Character) => boolean;
  regex?: RegExp;
}[] = [
  {
    tag: "aggressive",
    statTest: (c) => c.strength >= 7500,
    regex: /\b(berserker|fury|rampage|rage|wrath|frenzy|savag|brutal|vicious|ferocious|violent|bloodthirst|relentless assault|unbridled aggression|all.?out attack|destroy|obliterate|annihilate)\b/i,
  },
  {
    tag: "arrogant",
    regex: /\b(arrogant|overconfident|superiority|god.?king|god complex|ego(?:tistical|maniac)?|narcissist|omnipotent being|unstoppable|invincible|all.?powerful|supreme being|lesser being|beneath me|kneel|bow before|fear me|above all|i alone|i am inevitable|no equal|unmatched|unchallenged|none can stop)\b/i,
  },
  {
    tag: "tactical",
    statTest: (c) => c.intelligence >= 7500,
    regex: /\b(tactical|strateg(?:ist|ic|y)?|calculated|master plan|genius|scheming|manipulat|deceiv|outsmart|outmaneuver|cunning|clever|predict|counter|analyse|analyze|read(?:ing)? the field|exploit(?:ing)? weakness|precision)\b/i,
  },
  {
    tag: "sadistic",
    regex: /\b(sadis|tortur|cruelty|inflicting pain|relish(?:es)? suffering|delight in pain|feeds on suffering|enjoys killing|malicious|merciless|pitiless|cold.?blooded killer|no mercy|enjoy(?:s)? the kill|pleasure from|horror and pain)\b/i,
  },
  {
    tag: "defensive",
    statTest: (c) => c.durability >= 7500,
    regex: /\b(shield|barrier|block(?:ing)?|absorb(?:s)?|deflect|defend|protect(?:or)?|fortif|invulner|immune|resistant|reflect(?:s)?|endur|impenetrable|indestructible|nigh.?invulnerable|near.?invulnerable|virtually invincible|cannot be harmed|damage resistance|damage reduction|damage absorption)\b/i,
  },
  {
    tag: "long-range",
    regex: /\b(projectile|laser|heat vision|optic blast|energy blast|ranged|sniper|artillery|cannon|fires? from|shoots? from|at a distance|long.?range|homing|missile|railgun|beam weapon|long.?distance|remote attack)\b/i,
  },
  {
    tag: "close-quarters",
    regex: /\b(martial art|hand.to.hand|cqc|brawl|boxer|boxing|wrestl|knife fight|sword|blade|katana|claw|talon|assassin|street fight|bare.?hand|unarmed combat|close.?quarter|melee|fist|punch|kick|grapple|body slam|close combat)\b/i,
  },
  {
    tag: "reality-warper",
    regex: /\b(reality warp|probability manipulation|rewrite reality|reshape reality|alter reality|warp reality|chaos magic|spontaneous reality|impossible things|defy physics|violate causality|bend reality|infinite power|omnipotent|reality manipulation|matter manipulation|quantum manipulation)\b/i,
  },
  {
    tag: "regen",
    regex: /\b(regenerat|healing factor|self.?heal|self.?repair|recover(?:y|ies)?|resurrect|come back from|back from the dead|immortal|rapid heal|instant heal|cellular regenerat|wounds close|heal overnight|cannot stay dead|restored|regrow)\b/i,
  },
  {
    tag: "speedster",
    statTest: (c) => c.speed >= 7500,
    regex: /\b(speed force|mach \d|supersonic|hypersonic|light speed|faster than light|FTL|fastest alive|super speed|accelerat(?:ion)?|lightning.?fast|lightning reflex|blur of motion|teleport|instant movement|time.?dilation|reaction time|ms reaction)\b/i,
  },
  {
    tag: "stealth",
    regex: /\b(stealth|invisib(?:le|ility)|shadow|ninja|assassin|infiltrat|sneak|silent killer|undetect(?:able|ed)|camouflage|cloaking|hidden|lurk|ambush|disappear|shadow.?step|teleport(?:ation)?|phase|intangib)\b/i,
  },
];

function deriveBehaviorTags(char: Character): string[] {
  const text = [char.name, char.universe, char.specialAbility, char.description, char.weaknesses].join(" ");
  const tags: string[] = [];
  for (const rule of TAG_RULES) {
    const statHit  = rule.statTest ? rule.statTest(char) : false;
    const regexHit = rule.regex    ? rule.regex.test(text) : false;
    if (statHit || regexHit) tags.push(rule.tag);
  }
  return tags;
}

async function main() {
  console.log("Fetching all characters…");
  const all = await db.select().from(charactersTable);
  console.log(`Tagging ${all.length} characters…`);

  let updated = 0;
  const tagFreq: Record<string, number> = {};

  for (const char of all) {
    const tags = deriveBehaviorTags(char);
    for (const t of tags) tagFreq[t] = (tagFreq[t] ?? 0) + 1;

    await db
      .update(charactersTable)
      .set({ behaviorTags: tags })
      .where(eq(charactersTable.id, char.id));
    updated++;
    if (updated % 50 === 0) console.log(`  …${updated}/${all.length}`);
  }

  console.log(`\nDone — ${updated} characters tagged.\n`);
  console.log("Tag distribution:");
  for (const [tag, count] of Object.entries(tagFreq).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tag.padEnd(18)} ${count}`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
