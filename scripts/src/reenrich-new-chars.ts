/**
 * reenrich-new-chars.ts
 *
 * Repairs the newly-added (2026-05-31) roster rows whose data is wrong/thin.
 *
 * Root cause being fixed: generate-from-list.ts inserted batches of N characters
 * and mapped gen[j] -> input[j]. When the model returned fewer/duplicate entries,
 * the wrong character's data (description, stats, universe, v3Profile) got attached
 * to a correct name. This script re-generates ONE character per call (no batch
 * misalignment possible), validates strictly, and UPDATEs the row in place by id.
 *
 * Targets rows that are: duplicate descriptions, junk/short descriptions, corrupted
 * text, or thin v3Profile (few abilities / no finishers / no signatures).
 *
 * Run:  pnpm --filter @workspace/scripts run reenrich-new-chars
 */

import { db, charactersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
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

const PARALLEL = 5;
const CALL_TIMEOUT_MS = 55_000;
const MAX_ATTEMPTS = 2;

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

You are producing ONE complete, lore-accurate roster entry for the EXACT character named in the user message. The description, abilities, weaknesses, finishers and signatures MUST be specific to THAT character — never generic and never about any other character.

${STAT_SCALE}

CRITICAL — STAT SCALE IS MANDATORY: strength/speed/intelligence/durability MUST be on the millions-scale shown above (typical values are in the THOUSANDS to TENS OF MILLIONS). A value of 100 or any 0-100 number is ONLY ever valid for a "Mortal"-tier civilian. Make the raw stats consistent with the tier you assign.

UNIVERSE ASSIGNMENT (important):
- Assign the character to the single most appropriate universe.
- STRONGLY PREFER one of these EXISTING universe names when the character belongs to it (use the EXACT string):
${existingUniverses.map((u) => `  • ${u}`).join("\n")}
- If the character's real franchise is not in that list, use the correct specific franchise name (e.g. "Halloween", "Doctor Who", "Naughty Bear").
- Do NOT use vague buckets like "Horror", "Anime", "Comics", "Video Game", or "Mixed" when a specific franchise exists.

Return ONLY valid JSON of this exact shape (a single object):
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
  "specialAbility": <1 sentence defining power summary, >= 20 chars>,
  "weaknesses": <1 sentence specific weaknesses, >= 15 chars>,
  "description": <2 sentences of punchy, characterful lore for THIS character, >= 60 chars — witty encyclopedic tone>,
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

Even MUNDANE or COMEDIC characters (e.g. sitcom/cartoon civilians) MUST get a proper, characterful 2-sentence description and at least 4 abilities (everyday skills, gags, signature traits or improvised tactics all count) plus at least 2 finishers and 2 signatures (comedic or improvised moves count) — NEVER return empty arrays or one-word descriptions.

Rules: NEVER invent feats. Be specific (named moves, not descriptions). Use only ASCII characters in text fields.`;
}

const toInt = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v.replace(/[, ]/g, ""), 10) : NaN;
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const toStr = (v: unknown, fallback: string): string => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const toArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim()) : [];

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

async function generateOne(name: string, hint: string, existingUniverses: string[]): Promise<Record<string, unknown>> {
  const callPromise = openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt(existingUniverses) },
      {
        role: "user",
        content: `Create the complete roster entry for this single character:\nname: ${name}\nfranchise hint: ${hint || "(unknown — infer the correct one)"}\n\nReturn ONLY the single JSON object described above, fully about ${name}.`,
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
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no JSON in response");
    parsed = JSON.parse(m[0]);
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.results && Array.isArray(obj.results)) return obj.results[0] as Record<string, unknown>;
  return obj;
}

const hasNonAscii = (s: string) => /[^\x00-\x7F]/.test(s);

function validate(data: Record<string, unknown>): string | null {
  const desc = toStr(data.description, "");
  const sa = toStr(data.specialAbility, "");
  const weak = toStr(data.weaknesses, "");
  const v3 = (data.v3Profile as Record<string, unknown>) ?? {};
  if (desc.length < 40) return `desc too short (${desc.length})`;
  if (["none", "1", "2", "n/a"].includes(desc.toLowerCase())) return "junk desc";
  if (hasNonAscii(desc) || hasNonAscii(sa)) return "non-ascii text";
  if (sa.length < 15) return `specialAbility too short (${sa.length})`;
  if (weak.length < 10) return `weaknesses too short (${weak.length})`;
  // Bar calibrated to the existing roster norm (avg ab 5, fin 2.9, sig 2.7) so
  // new rows MATCH the style of others rather than exceeding it.
  if (toArr(v3.abilities).length < 3) return `abilities < 3 (${toArr(v3.abilities).length})`;
  if (toArr(v3.finishers).length < 1) return `finishers < 1 (${toArr(v3.finishers).length})`;
  if (toArr(v3.signatures).length < 1) return `signatures < 1 (${toArr(v3.signatures).length})`;
  return null;
}

async function main() {
  const list: { name: string; listUniverse: string }[] = JSON.parse(fs.readFileSync(LIST_PATH, "utf-8"));
  const hintMap = new Map<string, string>();
  for (const e of list) hintMap.set(e.name.trim().toLowerCase(), e.listUniverse);

  const existing = await db
    .select({ name: charactersTable.name, universe: charactersTable.universe })
    .from(charactersTable);
  const universeMap = new Map<string, string>();
  for (const c of existing) universeMap.set(c.universe.toLowerCase(), c.universe);
  const existingUniverses = [...new Set(existing.map((c) => c.universe))].sort();

  // Select the bad new rows (mirror of the audit).
  const bad = await db.execute(sql`
    WITH n AS (SELECT * FROM characters WHERE archived=0 AND created_at::date = DATE '2026-05-31'),
    dupd AS (SELECT description FROM n GROUP BY description HAVING COUNT(*) > 1)
    SELECT id, name FROM n WHERE
      description IN (SELECT description FROM dupd)
      OR description ~ '[^\\x00-\\x7F]'
      OR lower(description) IN ('none','1','2','n/a')
      OR length(description) < 40
      OR length(special_ability) < 15
      OR length(weaknesses) < 10
      OR jsonb_array_length(COALESCE(v3_profile->'abilities','[]'::jsonb)) < 3
      OR jsonb_array_length(COALESCE(v3_profile->'finishers','[]'::jsonb)) < 1
      OR jsonb_array_length(COALESCE(v3_profile->'signatures','[]'::jsonb)) < 1
    ORDER BY id`);
  const rows = (bad.rows ?? bad) as unknown as { id: number; name: string }[];
  console.log(`Rows needing re-enrichment: ${rows.length}`);
  if (rows.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < rows.length; i += PARALLEL) {
    const round = rows.slice(i, i + PARALLEL);
    const results = await Promise.all(
      round.map(async (row) => {
        const hint = hintMap.get(row.name.trim().toLowerCase()) ?? "";
        let lastErr = "";
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const data = await generateOne(row.name, hint, existingUniverses);
            const err = validate(data);
            if (err) {
              lastErr = err;
              continue;
            }
            let universe = toStr(data.universe, hint || "Mixed");
            const canon = universeMap.get(universe.toLowerCase());
            if (canon) universe = canon;
            const v3raw = (data.v3Profile as Record<string, unknown>) ?? {};
            const lethality = clamp(toInt(v3raw.lethality, 50), 0, 100);
            const tier = toStr(data.tier, "Enhanced");
            const stats = repairStats(tier, {
              strength: toInt(data.strength, 1000),
              speed: toInt(data.speed, 1000),
              intelligence: toInt(data.intelligence, 1000),
              durability: toInt(data.durability, 1000),
            });
            await db
              .update(charactersTable)
              .set({
                universe,
                strength: clamp(stats.strength, 100, 30_000_000),
                speed: clamp(stats.speed, 100, 30_000_000),
                intelligence: clamp(stats.intelligence, 100, 30_000_000),
                durability: clamp(stats.durability, 100, 30_000_000),
                specialAbility: toStr(data.specialAbility, "Skilled combatant."),
                weaknesses: toStr(data.weaknesses, "Standard mortal vulnerabilities."),
                description: toStr(data.description, row.name),
                behaviorTags: deriveBehaviorTags({ ...v3raw, energyProjection: data.energyProjection }, lethality),
                skill: clamp(toInt(data.skill, 50), 0, 100),
                energyProjection: clamp(toInt(data.energyProjection, 20), 0, 100),
                hax: clamp(toInt(data.hax, 10), 0, 100),
                tier,
                powerGapIndex: clamp(toInt(data.powerGapIndex, 3), 0, 12),
                v3Profile: v3raw,
              })
              .where(eq(charactersTable.id, row.id));
            return { ok: true, name: row.name };
          } catch (e) {
            lastErr = (e as Error).message?.slice(0, 90) ?? "err";
          }
        }
        console.error(`  ✗ ${row.name}: ${lastErr}`);
        return { ok: false, name: row.name };
      }),
    );
    for (const r of results) r.ok ? ok++ : fail++;
    console.log(`  …progress ok=${ok} fail=${fail} / ${rows.length}`);
  }
  console.log(`\n✅ Done. updated=${ok} failed=${fail}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
