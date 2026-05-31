/**
 * regen-full-dump.ts
 *
 * Regenerates artifacts/api-server/src/lib/charactersFullDump.json from the
 * CURRENT dev database. The dump is the canonical roster that seedNewChars()
 * replays on API-server startup: on boot it inserts (by name) any dump entry
 * missing from the local DB. That is how production picks up roster additions
 * after a deploy — but only if the dump is kept current.
 *
 * This exports every ACTIVE (archived=0) character in the exact camelCase shape
 * the existing dump uses, so a deploy will sync the new roster into prod.
 * Archived rows (e.g. removed duplicate variants) are intentionally excluded so
 * they never get inserted into production.
 *
 * Run:  pnpm --filter @workspace/scripts run regen-full-dump
 */

import { db, charactersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../artifacts/api-server/src/lib/charactersFullDump.json",
);

async function main() {
  const rows = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.archived, 0))
    .orderBy(asc(charactersTable.id));

  const dump = rows.map((r) => ({
    name: r.name,
    universe: r.universe,
    strength: r.strength,
    speed: r.speed,
    intelligence: r.intelligence,
    durability: r.durability,
    specialAbility: r.specialAbility,
    weaknesses: r.weaknesses,
    description: r.description,
    imageUrl: r.imageUrl,
    behaviorTags: r.behaviorTags,
    skill: r.skill,
    energyProjection: r.energyProjection,
    hax: r.hax,
    tier: r.tier,
    powerGapIndex: r.powerGapIndex,
    v3Profile: r.v3Profile,
  }));

  writeFileSync(OUT, JSON.stringify(dump, null, 2) + "\n", "utf8");
  console.log(`Wrote ${dump.length} active characters to ${OUT}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
