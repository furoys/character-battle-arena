/**
 * generate-from-list.ts
 *
 * Creates brand-new character records from scripts/src/missing-from-list.json
 * (the characters present in the imported A.v.A list but missing from the DB).
 *
 * Unlike enrich-*.ts (which UPDATES existing rows), this script INSERTS new rows
 * with the full "style of others": millions-scale stats, tier, behavior tags,
 * and a complete v3Profile — all generated with the same calibration prompt the
 * existing roster was built with. Each character is also assigned an appropriate
 * universe, preferring an existing universe name when the character clearly
 * belongs to one.
 *
 * Resumable: any name already in the DB (case-insensitive) is skipped, so the
 * script can be run repeatedly until every entry is generated.
 *
 * Run:  pnpm --filter @workspace/scripts run generate-from-list
 */

import { db, charactersTable } from "@workspace/db";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "_dummy_",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIST_PATH = path.join(__dirname, "missing-from-list.json");

const CHARS_PER_CALL = 3;
const PARALLEL_BATCHES = 6;
const CALL_TIMEOUT_MS = 90_000;

const STAT_SCALE = `STAT SCALE (integers, range 100 – 10,000,000+):
  Peak human   → 100–15,000        e.g. Batman STR=12,240 SPD=8,500 INT=6,816,000
  Enhanced     → 15,000–300,000    e.g. Deathstroke STR=42,667 | Spider-Man STR=200,000
  Powerhouse   → 300,000–2M        e.g. Thor, Hulk, Wonder Woman
  Planetary    → 2M–8M             e.g. Superman STR=8,000,000 | Goku STR=5,000,000
  Universal    → 8M+               e.g. Saitama STR=10,000,000 | Galactus

TIER labels (use exactly): "Mortal","Peak Human","Street","Enhanced","Superhuman","City","Country","Continental","Planetary","Star","Universal".
SKILL (0-100): combat mastery. ENERGY_PROJECTION (0-100): ranged damage. HAX (0-100): durability bypass / status effects.`;

function systemPrompt(existingUniverses: string[]): string {
  return `You are a senior fiction powerscaling analyst with deep knowledge of VS Battles Wiki, Marvel/DC, anime, video games, horror films, cartoons, and movie lore.

You are CREATING brand-new roster entries from scratch. For each character you receive a name and a rough "listUniverse" hint. Produce a complete, lore-accurate entry.

${STAT_SCALE}

CRITICAL — STAT SCALE IS MANDATORY: strength/speed/intelligence/durability MUST be on the millions-scale shown above (typical values are in the THOUSANDS to TENS OF MILLIONS). A value of 100 or any 0-100 number is ONLY ever valid for a "Mortal"-tier civilian. NEVER output 0-100 "rating" style numbers for any powered character. Example: a Planetary fighter has strength around 5,000,000–8,000,000; a Universal fighter 8,000,000–15,000,000; an Enhanced fighter 15,000–300,000. Make the raw stats consistent with the tier you assign.

UNIVERSE ASSIGNMENT (important):
- Assign each character to the single most appropriate universe.
- STRONGLY PREFER one of these EXISTING universe names when the character belongs to it (use the EXACT string):
${existingUniverses.map((u) => `  • ${u}`).join("\n")}
- If the character's real franchise is not in that list, use the correct specific franchise name (e.g. "Halloween", "Friday the 13th", "Naughty Bear").
- Do NOT use vague buckets like "Horror", "Anime", "Comics", "Video Game", or "Mixed" when a specific franchise exists. Only use a broad label as a last resort.

You will receive a batch of characters (JSON array). Return ONLY valid JSON of shape {"results":[ ... ]} with one entry per character, SAME ORDER.

Each entry shape:
{
  "name": <string — echo the input name EXACTLY>,
  "universe": <string — assigned universe>,
  "strength": <int 100-10000000>,
  "speed": <int 100-30000000>,
  "intelligence": <int 100-10000000>,
  "durability": <int 100-10000000>,
  "skill": <int 0-100>,
  "energyProjection": <int 0-100>,
  "hax": <int 0-100>,
  "tier": <tier string>,
  "powerGapIndex": <int 0-12>,
  "specialAbility": <1 sentence defining power summary>,
  "weaknesses": <1 sentence specific weaknesses>,
  "description": <2 sentences of punchy, characterful lore — match a witty encyclopedic tone>,
  "v3Profile": {
    "abilities": [<5-10 named powers from canon>],
    "weapons": [<named weapons or empty>],
    "gadgets": [<named gadgets or empty>],
    "combatStyle": [<3-5 style tags>],
    "temperament": <"feral"|"controlled"|"cunning"|"cold"|"adaptive"|"battle-hungry"|"disciplined"|"balanced">,
    "battleIQ": <int 0-100>,
    "finishers": [<3-5 named finishing moves>],
    "specialRules": [<1-4 match rules>],
    "mobilityType": [<movement methods>],
    "weaknesses": [<3-5 named weaknesses>],
    "preferredRange": <"melee"|"mid"|"ranged"|"variable">,
    "lethality": <int 0-100>,
    "archetypes": [<2-4 archetypes: "tank","speedster","trickster","bruiser","tactician","berserker","glass-cannon","flier","ranged-blaster">],
    "counters": [<3-5 counter types>],
    "notableFeats": [<4-6 canon feats>],
    "powerTier": <int 0-10>,
    "loreNotes": <1-2 sentences of matchup context>,
    "stamina": <int 0-100>,
    "regenLevel": <"none"|"low"|"moderate"|"high"|"extreme"|"absolute">,
    "intelligenceType": <"tactical"|"scientific"|"magical"|"cosmic"|"street"|"divine">,
    "haxAbilities": [<canonical hax only>],
    "signatures": [<3-5 named signatures>]
  }
}

Rules: NEVER invent feats. Match the calibration scale exactly — do not over-buff non-powered characters. Be specific (named moves, not descriptions).`;
}

type ListEntry = { name: string; listUniverse: string };

const toInt = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v.replace(/[, ]/g, ""), 10) : NaN;
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const toStr = (v: unknown, fallback: string): string => (typeof v === "string" && v.trim() ? v.trim() : fallback);
// Representative millions-scale strength per tier (from the calibration scale).
// Used to self-heal records where the model slipped back to 0-100 ratings.
const TIER_BASE: Record<string, number> = {
  Mortal: 600,
  "Peak Human": 12_000,
  Street: 22_000,
  Enhanced: 120_000,
  Superhuman: 600_000,
  City: 1_500_000,
  Country: 3_000_000,
  Continental: 5_000_000,
  Planetary: 8_000_000,
  Star: 9_500_000,
  Universal: 11_000_000,
};

// If every raw stat is tiny relative to the assigned tier, the model used the
// wrong scale — rescale from the tier baseline while preserving the relative
// profile encoded in the (0-100) values it returned.
function repairStats(
  tier: string,
  s: { strength: number; speed: number; intelligence: number; durability: number },
): { strength: number; speed: number; intelligence: number; durability: number } {
  const base = TIER_BASE[tier];
  if (!base || base <= 2000) return s;
  const maxStat = Math.max(s.strength, s.speed, s.intelligence, s.durability);
  if (maxStat > 1000) return s;
  const mod = (v: number) => Math.round(base * (0.55 + 0.45 * (clamp(v, 0, 100) / 100)));
  return { strength: mod(s.strength), speed: mod(s.speed), intelligence: mod(s.intelligence), durability: mod(s.durability) };
}

const toArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim()) : [];

function deriveBehaviorTags(v3: Record<string, unknown>, lethality: number): string[] {
  const tags = new Set<string>();
  const archetypes = toArr(v3.archetypes).map((a) => a.toLowerCase());
  const temperament = String(v3.temperament ?? "").toLowerCase();
  const range = String(v3.preferredRange ?? "").toLowerCase();
  const mobility = toArr(v3.mobilityType).map((m) => m.toLowerCase());
  const regen = String(v3.regenLevel ?? "").toLowerCase();
  const energy = toInt(v3.energyProjection, 0);

  if (lethality >= 60 || ["feral", "battle-hungry", "cold"].includes(temperament) || archetypes.some((a) => a.includes("berserker") || a.includes("bruiser")))
    tags.add("aggressive");
  if (archetypes.includes("tank") || ["high", "extreme", "absolute"].includes(regen)) tags.add("defensive");
  if (range === "ranged" || range === "mid" || energy >= 60 || archetypes.includes("ranged-blaster")) tags.add("long-range");
  if (archetypes.includes("speedster") || mobility.some((m) => m.includes("speed") || m.includes("teleport") || m.includes("flight"))) tags.add("speedster");

  return [...tags];
}

async function generateBatch(batch: ListEntry[], existingUniverses: string[]): Promise<Record<string, unknown>[]> {
  const input = batch.map((c) => ({ name: c.name, listUniverse: c.listUniverse }));

  const callPromise = openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    max_tokens: 8000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt(existingUniverses) },
      {
        role: "user",
        content: `Create ${batch.length} brand-new character entries. Return {"results":[<${batch.length} entries SAME ORDER>]}.\n\n${JSON.stringify(input, null, 2)}`,
      },
    ],
  });

  const timeoutPromise = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error(`call timeout ${CALL_TIMEOUT_MS}ms`)), CALL_TIMEOUT_MS),
  );

  const res = (await Promise.race([callPromise, timeoutPromise])) as Awaited<typeof callPromise>;
  const raw = res.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/[\{\[][\s\S]*[\}\]]/);
    if (!m) throw new Error("no JSON in response");
    parsed = JSON.parse(m[0]);
  }
  if (Array.isArray(parsed)) return parsed;
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.results)) return obj.results as Record<string, unknown>[];
  if (Array.isArray(obj.characters)) return obj.characters as Record<string, unknown>[];
  if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  return [obj];
}

async function insertChar(
  data: Record<string, unknown>,
  fallbackName: string,
  fallbackUniverse: string,
  universeMap: Map<string, string>,
): Promise<void> {
  // The input list name is authoritative for resume/dedup correctness — never
  // trust a model-altered name (a wrong-but-nonempty name would insert an
  // unintended row while the intended entry still looks "missing" on resume).
  const name = fallbackName;
  let universe = toStr(data.universe, fallbackUniverse);
  const canon = universeMap.get(universe.toLowerCase());
  if (canon) universe = canon;

  const v3raw = (data.v3Profile as Record<string, unknown>) ?? {};

  // Reject degenerate/placeholder responses (model sometimes echoes the schema
  // example, returning "1" / 1 / ["1"] for every field). These must NOT be
  // inserted — throwing makes the caller count it as a failure so resume retries.
  const isPlaceholder = (v: unknown): boolean =>
    v === "1" || v === 1 || (Array.isArray(v) && v.length > 0 && v.every((x) => x === "1" || x === 1));
  const desc = typeof data.description === "string" ? data.description.trim() : "";
  const junkSignals = [
    data.description,
    data.specialAbility,
    v3raw.temperament,
    v3raw.loreNotes,
    v3raw.archetypes,
    v3raw.abilities,
  ].filter(isPlaceholder).length;
  if (junkSignals >= 2 || desc.length < 8 || Object.keys(v3raw).length === 0) {
    throw new Error("degenerate/placeholder entry");
  }
  const lethality = clamp(toInt(v3raw.lethality, 50), 0, 100);
  const tier = toStr(data.tier, "Enhanced");

  const stats = repairStats(tier, {
    strength: toInt(data.strength, 1000),
    speed: toInt(data.speed, 1000),
    intelligence: toInt(data.intelligence, 1000),
    durability: toInt(data.durability, 1000),
  });

  await db.insert(charactersTable).values({
    name,
    universe,
    strength: clamp(stats.strength, 100, 30_000_000),
    speed: clamp(stats.speed, 100, 30_000_000),
    intelligence: clamp(stats.intelligence, 100, 30_000_000),
    durability: clamp(stats.durability, 100, 30_000_000),
    specialAbility: toStr(data.specialAbility, "Skilled combatant."),
    weaknesses: toStr(data.weaknesses, "Standard mortal vulnerabilities."),
    description: toStr(data.description, name),
    behaviorTags: deriveBehaviorTags({ ...v3raw, preferredRange: v3raw.preferredRange }, lethality),
    skill: clamp(toInt(data.skill, 50), 0, 100),
    energyProjection: clamp(toInt(data.energyProjection, 20), 0, 100),
    hax: clamp(toInt(data.hax, 10), 0, 100),
    tier,
    powerGapIndex: clamp(toInt(data.powerGapIndex, 3), 0, 12),
    v3Profile: v3raw,
  });
}

async function main() {
  const list: ListEntry[] = JSON.parse(fs.readFileSync(LIST_PATH, "utf-8"));
  console.log(`List entries: ${list.length}`);

  // Existing names (resume) + universes (categorization).
  const existing = await db.select({ name: charactersTable.name, universe: charactersTable.universe }).from(charactersTable);
  const existingNames = new Set(existing.map((c) => c.name.trim().toLowerCase()));
  const universeMap = new Map<string, string>();
  for (const c of existing) universeMap.set(c.universe.toLowerCase(), c.universe);
  const existingUniverses = [...new Set(existing.map((c) => c.universe))].sort();

  // Dedup the input list itself (case-insensitive) so a single run never
  // processes the same name twice, then drop anything already in the DB.
  const seenInList = new Set<string>();
  const remaining = list.filter((c) => {
    const key = c.name.trim().toLowerCase();
    if (existingNames.has(key) || seenInList.has(key)) return false;
    seenInList.add(key);
    return true;
  });
  console.log(`Already present: ${list.length - remaining.length} | To generate: ${remaining.length}`);
  if (remaining.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  const batches: ListEntry[][] = [];
  for (let i = 0; i < remaining.length; i += CHARS_PER_CALL) batches.push(remaining.slice(i, i + CHARS_PER_CALL));
  console.log(`Batches of ${CHARS_PER_CALL}: ${batches.length} (parallel ${PARALLEL_BATCHES})`);

  let ok = 0;
  let fail = 0;
  for (let r = 0; r < batches.length; r += PARALLEL_BATCHES) {
    const round = batches.slice(r, r + PARALLEL_BATCHES);
    const results = await Promise.all(
      round.map(async (b, i) => {
        const label = `[${r + i + 1}/${batches.length}] ${b.map((c) => c.name).join(", ").slice(0, 70)}`;
        try {
          const gen = await generateBatch(b, existingUniverses);
          let bok = 0;
          let bfail = 0;
          // Insert by index order (fallback to input name/universe).
          for (let j = 0; j < b.length; j++) {
            const data = gen[j] ?? {};
            try {
              await insertChar(data, b[j].name, b[j].listUniverse, universeMap);
              bok++;
            } catch (e) {
              bfail++;
              console.error(`  ✗ insert "${b[j].name}": ${(e as Error).message?.slice(0, 90)}`);
            }
          }
          console.log(`${label} ✓ ok=${bok} fail=${bfail}`);
          return { ok: bok, fail: bfail };
        } catch (e) {
          console.log(`${label} ✗ ${(e as Error).message?.slice(0, 100)}`);
          return { ok: 0, fail: b.length };
        }
      }),
    );
    for (const x of results) {
      ok += x.ok;
      fail += x.fail;
    }
    console.log(`  …progress ok=${ok} fail=${fail}`);
  }

  console.log(`\n✅ Done. inserted=${ok} failed=${fail}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
