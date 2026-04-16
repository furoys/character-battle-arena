import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, charactersTable } from "@workspace/db";
import {
  CreateCharacterBody,
  GetCharacterParams,
  DeleteCharacterParams,
  ListCharactersResponse,
  GetCharacterResponse,
  GetCharacterStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/characters/stats/summary", async (req, res): Promise<void> => {
  const all = await db.select().from(charactersTable);

  if (all.length === 0) {
    res.json(
      GetCharacterStatsResponse.parse({
        totalCharacters: 0,
        universeBreakdown: [],
      }),
    );
    return;
  }

  const topStrength = all.reduce((a, b) => (a.strength > b.strength ? a : b));
  const topSpeed = all.reduce((a, b) => (a.speed > b.speed ? a : b));
  const topIntelligence = all.reduce((a, b) =>
    a.intelligence > b.intelligence ? a : b,
  );

  const universeCounts: Record<string, number> = {};
  for (const c of all) {
    universeCounts[c.universe] = (universeCounts[c.universe] ?? 0) + 1;
  }
  const universeBreakdown = Object.entries(universeCounts).map(
    ([universe, count]) => ({ universe, count }),
  );

  res.json(
    GetCharacterStatsResponse.parse({
      totalCharacters: all.length,
      topStrength,
      topSpeed,
      topIntelligence,
      universeBreakdown,
    }),
  );
});

router.get("/characters", async (req, res): Promise<void> => {
  const characters = await db
    .select()
    .from(charactersTable)
    .orderBy(charactersTable.name);
  res.json(ListCharactersResponse.parse(characters));
});

router.post("/characters", async (req, res): Promise<void> => {
  const parsed = CreateCharacterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [character] = await db
    .insert(charactersTable)
    .values({
      name: parsed.data.name,
      universe: parsed.data.universe,
      strength: parsed.data.strength,
      speed: parsed.data.speed,
      intelligence: parsed.data.intelligence,
      durability: parsed.data.durability,
      specialAbility: parsed.data.specialAbility,
      weaknesses: parsed.data.weaknesses,
      description: parsed.data.description,
    })
    .returning();

  res.status(201).json(GetCharacterResponse.parse(character));
});

router.get("/characters/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetCharacterParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [character] = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.id, params.data.id));

  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  res.json(GetCharacterResponse.parse(character));
});

router.delete("/characters/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteCharacterParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(charactersTable)
    .where(eq(charactersTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
