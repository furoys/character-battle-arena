/**
 * enrich-new-chars.ts
 *
 * Focused enrichment for the 188 PDF-batch characters (id >= 1030).
 * Same prompt/logic as enrich-characters.ts but scoped + per-batch logging
 * + per-call timeout so it can't silently hang.
 *
 * Run:  pnpm --filter @workspace/scripts run enrich-new-chars
 */

import { db, charactersTable } from "@workspace/db";
import { eq, gte } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "_dummy_",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MIN_ID = 1030;
const CHARS_PER_CALL = 3;
const PARALLEL_BATCHES = 8;
const CALL_TIMEOUT_MS = 60_000;

const STAT_SCALE = `STAT SCALE (integers, range 100 – 10,000,000+):
  Peak human   → 100–15,000        e.g. Batman STR=12,240 SPD=8,500 INT=6,816,000
  Enhanced     → 15,000–300,000    e.g. Deathstroke STR=42,667 | Spider-Man STR=200,000
  Powerhouse   → 300,000–2M        e.g. Thor, Hulk, Wonder Woman
  Planetary    → 2M–8M             e.g. Superman STR=8,000,000 | Goku STR=5,000,000
  Universal    → 8M+               e.g. Saitama STR=10,000,000 | Galactus

TIER labels (use exactly): "Mortal","Peak Human","Street","Enhanced","Superhuman","City","Country","Continental","Planetary","Star","Universal".
SKILL (0-100): combat mastery. ENERGY_PROJECTION (0-100): ranged damage. HAX (0-100): durability bypass / status effects.`;

const SYSTEM_PROMPT = `You are a senior fiction powerscaling analyst with deep knowledge of VS Battles Wiki, Marvel/DC, anime, video games, and movie lore.

CRITICAL: The "currentStats" you receive in the input are PLACEHOLDER values on a 0-100 scale. You MUST IGNORE them and OUTPUT FRESH stats on the millions-scale below based purely on canonical lore. Do NOT scale or normalize the input — replace it.

${STAT_SCALE}

You will receive a batch of characters (JSON array). Return a JSON array with one enriched entry per character, SAME ORDER. Return ONLY valid JSON.

Each entry shape:
{
  "id": <int>,
  "strength": <int 100-10000000>,
  "speed": <int 100-30000000>,
  "intelligence": <int 100-10000000>,
  "durability": <int 100-10000000>,
  "skill": <int 0-100>,
  "energyProjection": <int 0-100>,
  "hax": <int 0-100>,
  "tier": <tier string>,
  "powerGapIndex": <int 0-12>,
  "specialAbility": <1 sentence>,
  "weaknesses": <1 sentence>,
  "description": <2 sentences>,
  "v3Profile": {
    "abilities": [<5-10 named powers>],
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
    "archetypes": [<2-4 archetypes>],
    "counters": [<3-5 counter types>],
    "notableFeats": [<4-6 canon feats>],
    "powerTier": <int 0-10>,
    "loreNotes": <1-2 sentences>,
    "stamina": <int 0-100>,
    "regenLevel": <"none"|"low"|"moderate"|"high"|"extreme"|"absolute">,
    "intelligenceType": <"tactical"|"scientific"|"magical"|"cosmic"|"street"|"divine">,
    "haxAbilities": [<canonical hax only>],
    "signatures": [<3-5 named signatures>]
  }
}

Rules: NEVER invent feats. Match calibration scale exactly. Be specific (named moves, not descriptions).`;

interface Char {
  id: number;
  name: string;
  universe: string;
  strength: number;
  speed: number;
  intelligence: number;
  durability: number;
  specialAbility: string;
  weaknesses: string;
  description: string;
}

async function enrichBatch(batch: Char[]): Promise<Record<string, unknown>[]> {
  const input = batch.map((c) => ({
    id: c.id,
    name: c.name,
    universe: c.universe,
    hint_specialAbility: c.specialAbility,
    hint_weaknesses: c.weaknesses,
    hint_description: c.description,
  }));

  const callPromise = openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.15,
    max_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Enrich these ${batch.length} characters. Return a JSON object of shape {"results":[<${batch.length} enriched entries SAME ORDER>]}.\n\n${JSON.stringify(input, null, 2)}` },
    ],
  });

  const timeoutPromise = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error(`call timeout ${CALL_TIMEOUT_MS}ms`)), CALL_TIMEOUT_MS)
  );

  const res = (await Promise.race([callPromise, timeoutPromise])) as Awaited<typeof callPromise>;
  const raw = res.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: extract first JSON object/array
    const m = raw.match(/[\{\[][\s\S]*[\}\]]/);
    if (!m) throw new Error("no JSON found in response");
    parsed = JSON.parse(m[0]);
  }
  if (Array.isArray(parsed)) return parsed;
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.results)) return obj.results as Record<string, unknown>[];
  if (Array.isArray(obj.characters)) return obj.characters as Record<string, unknown>[];
  if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  // Single entry
  return [obj];
}

async function applyUpdate(charId: number, data: Record<string, unknown>) {
  const v3 = (data.v3Profile as Record<string, unknown>) ?? {};
  const toInt = (v: unknown) => (typeof v === "number" ? Math.round(v) : undefined);
  const toStr = (v: unknown) => (typeof v === "string" && v ? v : undefined);

  await db.update(charactersTable).set({
    strength: toInt(data.strength),
    speed: toInt(data.speed),
    intelligence: toInt(data.intelligence),
    durability: toInt(data.durability),
    skill: toInt(data.skill),
    energyProjection: toInt(data.energyProjection),
    hax: toInt(data.hax),
    tier: toStr(data.tier),
    powerGapIndex: toInt(data.powerGapIndex),
    specialAbility: toStr(data.specialAbility),
    weaknesses: toStr(data.weaknesses),
    description: toStr(data.description),
    v3Profile: v3,
  }).where(eq(charactersTable.id, charId));
}

async function processBatch(batch: Char[], label: string): Promise<{ ok: number; fail: number }> {
  try {
    const enriched = await enrichBatch(batch);
    let ok = 0, fail = 0;
    for (const r of enriched) {
      const id = r.id as number;
      if (!id) { fail++; continue; }
      try { await applyUpdate(id, r); ok++; }
      catch (e) { fail++; console.error(`  ✗ db ${id}: ${(e as Error).message?.slice(0, 80)}`); }
    }
    console.log(`${label} ✓ ok=${ok} fail=${fail}`);
    return { ok, fail };
  } catch (e) {
    console.log(`${label} ✗ ${(e as Error).message?.slice(0, 100)}`);
    return { ok: 0, fail: batch.length };
  }
}

async function main() {
  console.log("Loading new characters (id >= 1030)…");
  const all = await db.select({
    id: charactersTable.id,
    name: charactersTable.name,
    universe: charactersTable.universe,
    strength: charactersTable.strength,
    speed: charactersTable.speed,
    intelligence: charactersTable.intelligence,
    durability: charactersTable.durability,
    specialAbility: charactersTable.specialAbility,
    weaknesses: charactersTable.weaknesses,
    description: charactersTable.description,
  }).from(charactersTable).where(gte(charactersTable.id, MIN_ID)).orderBy(charactersTable.id);

  // Skip those already enriched (strength > 100 means already on big scale)
  const remaining = all.filter((c) => c.strength <= 100);
  console.log(`Total new: ${all.length} | Remaining: ${remaining.length}`);

  const batches: Char[][] = [];
  for (let i = 0; i < remaining.length; i += CHARS_PER_CALL) batches.push(remaining.slice(i, i + CHARS_PER_CALL));
  console.log(`Batches of ${CHARS_PER_CALL}: ${batches.length}`);

  let totalOk = 0, totalFail = 0;
  for (let r = 0; r < batches.length; r += PARALLEL_BATCHES) {
    const round = batches.slice(r, r + PARALLEL_BATCHES);
    const results = await Promise.all(round.map((b, i) =>
      processBatch(b, `[${r + i + 1}/${batches.length}] ${b.map((c) => c.name).join(", ").slice(0, 70)}`)
    ));
    for (const { ok, fail } of results) { totalOk += ok; totalFail += fail; }
  }

  console.log(`\n✅ Done. ok=${totalOk} fail=${totalFail}`);
  process.exit(0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
