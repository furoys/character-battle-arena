/**
 * enrich-characters.ts
 *
 * Verifies and enriches all 816+ character profiles using AI lore knowledge.
 * References VS Battles Wiki, Marvel/DC databases, anime wikis, and game wikis
 * to verify stats and deeply populate v3Profile fields.
 *
 * Run:  pnpm --filter @workspace/scripts run enrich-characters
 *
 * Progress is saved to scripts/.local/enrich-progress.json so the script can
 * be interrupted and resumed without reprocessing already-updated characters.
 *
 * What gets updated per character:
 *   Main stats  : strength, speed, intelligence, durability, skill,
 *                 energyProjection, hax, tier, powerGapIndex
 *   Text fields : specialAbility, weaknesses, description
 *   v3Profile   : ALL existing fields filled from lore PLUS new fields:
 *                 notableFeats, powerTier, loreNotes, stamina, regenLevel,
 *                 intelligenceType, haxAbilities, signatures
 *
 * Design: 5 characters per API call, progress-safe, resumable.
 */

import { db, charactersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "_dummy_",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_PATH = path.join(__dirname, "..", ".local", "enrich-progress.json");
const CHARS_PER_CALL = 5;  // characters batched per single API call
const DELAY_MS = 500;      // delay between batches

// ── Calibration scale sent in every prompt ─────────────────────────────────
const STAT_SCALE = `STAT SCALE (integers, range 100 – 10,000,000+):
  Peak human   → 100–15,000        e.g. Batman STR=12,240 SPD=8,500 INT=6,816,000
  Enhanced     → 15,000–300,000    e.g. Deathstroke STR=42,667 | Spider-Man STR=200,000
  Powerhouse   → 300,000–2M        e.g. Thor, Hulk, Wonder Woman
  Planetary    → 2M–8M             e.g. Superman STR=8,000,000 | Goku STR=5,000,000
  Universal    → 8M+               e.g. Saitama STR=10,000,000 | Galactus

TIER labels (use exactly these strings):
  "Mortal"       pgi=0  civilians, non-powered
  "Peak Human"   pgi=1  Batman, Deathstroke
  "Street"       pgi=2  Daredevil, Punisher
  "Enhanced"     pgi=3  Spider-Man, Wolverine, Captain America
  "Superhuman"   pgi=4  Thor base, Hulk base
  "City"         pgi=5  Thor full power, Hulk WorldBreaker
  "Country"      pgi=6  Juggernaut, Darkseid avatars
  "Continental"  pgi=7  Thanos base (no IG)
  "Planetary"    pgi=8  Superman, Goku, Naruto Baryon
  "Star"         pgi=9  Sentry, Vegeta GoD, Whis
  "Universal"    pgi=12 Saitama, Galactus, Odin, The Presence

SKILL (0–100): raw combat mastery, independent of power level.
  Batman=98, Deathstroke=94, Goku=85, Wolverine=78, Saitama=30

ENERGY_PROJECTION (0–100): ranged/AoE damage output.
  Superman=85, Iron Man=90, Hawkeye=20, Batman=5

HAX (0–100): ability to bypass conventional durability or impose status effects.
  Scarlet Witch=98, Doctor Strange=92, Wolverine=40 (regen), Batman=15`;

const SYSTEM_PROMPT = `You are a senior fiction powerscaling analyst. Your training includes VS Battles Wiki,
Marvel Database, DC Database, Dragon Ball Wiki, Naruto Wiki, One Piece Wiki, Bleach Wiki,
Demon Slayer Wiki, Attack on Titan Wiki, all major video game and mythology wikis, and movie lore databases.

${STAT_SCALE}

You will receive a batch of characters (as a JSON array). Return a JSON array with one enriched entry per character.
The output array MUST be in the same order as the input. Return ONLY valid JSON — no markdown fences, no prose.

Each entry in the returned array must have this exact shape:
{
  "id": <integer — same id as input>,
  "strength": <integer 100–10000000+>,
  "speed": <integer 100–30000000>,
  "intelligence": <integer 100–10000000>,
  "durability": <integer 100–10000000>,
  "skill": <integer 0–100>,
  "energyProjection": <integer 0–100>,
  "hax": <integer 0–100>,
  "tier": <exact tier string from list above>,
  "powerGapIndex": <integer 0–12>,
  "specialAbility": <1-sentence defining power summary>,
  "weaknesses": <1-sentence specific weaknesses>,
  "description": <2-sentence lore description>,
  "v3Profile": {
    "abilities": [<5–10 specific named powers from canon>],
    "weapons": [<named weapons they actually use, empty if none>],
    "gadgets": [<named gadgets/tools, empty if none>],
    "combatStyle": [<3–5 style tags e.g. "berserker-charge", "guerrilla-precision", "power-overwhelming">],
    "temperament": <"feral"|"controlled"|"cunning"|"cold"|"adaptive"|"battle-hungry"|"disciplined"|"balanced">,
    "battleIQ": <integer 0–100 — pure in-combat tactical IQ>,
    "finishers": [<3–5 named finishing moves or kill techniques from canon>],
    "specialRules": [<1–4 special match rules e.g. "scales with rage", "prep time doubles effectiveness">],
    "mobilityType": [<movement methods: "flight", "wall-crawling", "teleportation", "super speed", etc.>],
    "weaknesses": [<3–5 named specific weaknesses>],
    "preferredRange": <"melee"|"mid"|"ranged"|"variable">,
    "lethality": <integer 0–100 — willingness+capability to kill, 0=never kills, 100=kills freely>,
    "archetypes": [<2–4 archetypes: "tank","speedster","trickster","bruiser","tactician","berserker","glass-cannon">],
    "counters": [<3–5 specific ability types or character types that exploit this character's weaknesses>],
    "notableFeats": [<4–6 specific canon feats justifying power level — cite source where possible>],
    "powerTier": <integer 0–10: 0=human, 3=street, 5=city-buster, 7=country, 8=planet-buster, 10=universe>,
    "loreNotes": <1–2 sentences of key matchup context from lore>,
    "stamina": <integer 0–100 — sustained combat endurance>,
    "regenLevel": <"none"|"low"|"moderate"|"high"|"extreme"|"absolute">,
    "intelligenceType": <"tactical"|"scientific"|"magical"|"cosmic"|"street"|"divine">,
    "haxAbilities": [<ONLY abilities they canonically have: "regeneration","soul manipulation","durability negation","mind control","reality warping","time manipulation","teleportation","intangibility","matter manipulation","life force drain">],
    "signatures": [<3–5 named signature techniques from canon>]
  }
}

Rules:
- NEVER invent feats. All notableFeats must be real canon events.
- Stats must match the calibration scale exactly. Do not over-buff.
- Be specific: "Mjolnir lightning strike" not "uses hammer".
- Finishers/signatures should be move names, not descriptions.
- lethality: this is WILLINGNESS × CAPABILITY to kill.
- intelligenceType: the primary TYPE of intelligence, not raw IQ.
- haxAbilities: ONLY list what they actually have in canon.`;

// ── Progress tracking ───────────────────────────────────────────────────────
function loadProgress(): Set<number> {
  try {
    fs.mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true });
    const raw = fs.readFileSync(PROGRESS_PATH, "utf-8");
    const ids: number[] = JSON.parse(raw);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function saveProgress(done: Set<number>) {
  fs.mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true });
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify([...done]), "utf-8");
}

// ── API call: enrich a batch of characters ─────────────────────────────────
async function enrichBatch(
  chars: Array<{
    id: number;
    name: string;
    universe: string;
    strength: number;
    speed: number;
    intelligence: number;
    durability: number;
    skill: number | null;
    energyProjection: number | null;
    hax: number | null;
    tier: string | null;
    powerGapIndex: number | null;
    specialAbility: string;
    weaknesses: string;
    description: string;
    v3Profile: Record<string, unknown> | null;
  }>
): Promise<Record<string, unknown>[]> {
  const input = chars.map((c) => ({
    id: c.id,
    name: c.name,
    universe: c.universe,
    currentStats: {
      strength: c.strength, speed: c.speed,
      intelligence: c.intelligence, durability: c.durability,
      skill: c.skill, energyProjection: c.energyProjection,
      hax: c.hax, tier: c.tier, powerGapIndex: c.powerGapIndex,
    },
    specialAbility: c.specialAbility,
    weaknesses: c.weaknesses,
    description: c.description,
    currentV3: c.v3Profile ?? {},
  }));

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.15,
    max_tokens: 4000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Enrich this batch of ${chars.length} characters. Return a JSON array of ${chars.length} entries in the SAME ORDER.\n\n${JSON.stringify(input, null, 2)}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content?.trim() ?? "[]";
  const clean = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(clean);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// ── Apply enriched data to DB ───────────────────────────────────────────────
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

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Loading characters…");
  const chars = await db.select().from(charactersTable).orderBy(charactersTable.id);
  console.log(`Total characters: ${chars.length}`);

  const done = loadProgress();
  const remaining = chars.filter((c) => !done.has(c.id));
  console.log(`Already enriched: ${done.size} | Remaining: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log("All characters already enriched! Delete .local/enrich-progress.json to re-run.");
    return;
  }

  let processed = 0;
  let errors = 0;
  const totalBatches = Math.ceil(remaining.length / CHARS_PER_CALL);

  for (let i = 0; i < remaining.length; i += CHARS_PER_CALL) {
    const batch = remaining.slice(i, i + CHARS_PER_CALL);
    const batchNum = Math.floor(i / CHARS_PER_CALL) + 1;
    const names = batch.map((c) => c.name).join(", ");
    process.stdout.write(`[${batchNum}/${totalBatches}] ${names}… `);

    try {
      const enriched = await enrichBatch(
        batch.map((c) => ({
          id: c.id,
          name: c.name,
          universe: c.universe,
          strength: c.strength,
          speed: c.speed,
          intelligence: c.intelligence,
          durability: c.durability,
          skill: c.skill,
          energyProjection: c.energyProjection,
          hax: c.hax,
          tier: c.tier,
          powerGapIndex: c.powerGapIndex,
          specialAbility: c.specialAbility,
          weaknesses: c.weaknesses,
          description: c.description,
          v3Profile: c.v3Profile as Record<string, unknown> | null,
        }))
      );

      // Apply each result by matching on id
      for (const result of enriched) {
        const charId = result.id as number;
        if (!charId) continue;
        try {
          await applyUpdate(charId, result);
          done.add(charId);
          processed++;
        } catch (e) {
          errors++;
          console.error(`\n  ✗ DB update failed for id=${charId}: ${(e as Error).message?.slice(0, 80)}`);
        }
      }

      // Also mark any chars in the batch whose ids weren't returned (so we don't retry forever)
      for (const c of batch) {
        if (!done.has(c.id)) {
          done.add(c.id);  // skip on next run even if unenriched
        }
      }

      console.log("✓");
    } catch (err: unknown) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ (${msg.slice(0, 100)})`);
      // Mark batch as attempted so we don't retry endlessly on hard errors
      for (const c of batch) done.add(c.id);
    }

    saveProgress(done);

    if (i + CHARS_PER_CALL < remaining.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(
    `\n✅ Complete. Enriched: ${processed} | Errors: ${errors} | Total done: ${done.size}/${chars.length}`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
