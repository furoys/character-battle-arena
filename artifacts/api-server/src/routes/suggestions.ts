import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, suggestionsTable, charactersTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const ADMIN_PIN = process.env.ADMIN_PIN ?? "ava2024";

function requireAdmin(req: any, res: any): boolean {
  const auth = req.headers["x-admin-pin"];
  if (auth !== ADMIN_PIN) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

const SuggestionBody = z.object({
  name: z.string().min(1).max(100),
  universe: z.string().min(1).max(100),
  strength: z.number().int().min(1).max(100),
  speed: z.number().int().min(1).max(100),
  intelligence: z.number().int().min(1).max(100),
  durability: z.number().int().min(1).max(100),
  specialAbility: z.string().min(1),
  weaknesses: z.string().min(1),
  description: z.string().min(1),
});

router.post("/suggestions", async (req, res): Promise<void> => {
  const parsed = SuggestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [suggestion] = await db
    .insert(suggestionsTable)
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
      status: "pending",
    })
    .returning();

  res.status(201).json(suggestion);
});

router.get("/suggestions", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const suggestions = await db
    .select()
    .from(suggestionsTable)
    .where(eq(suggestionsTable.status, "pending"))
    .orderBy(suggestionsTable.createdAt);

  res.json(suggestions);
});

router.post("/suggestions/:id/approve", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [suggestion] = await db
    .select()
    .from(suggestionsTable)
    .where(eq(suggestionsTable.id, id));

  if (!suggestion) {
    res.status(404).json({ error: "Suggestion not found" });
    return;
  }

  // Scale 1-100 stats to 0-10000 by squaring (matches existing character distribution)
  const scale = (v: number) => v * v;

  const [character] = await db
    .insert(charactersTable)
    .values({
      name: suggestion.name,
      universe: suggestion.universe,
      strength: scale(suggestion.strength),
      speed: scale(suggestion.speed),
      intelligence: scale(suggestion.intelligence),
      durability: scale(suggestion.durability),
      specialAbility: suggestion.specialAbility,
      weaknesses: suggestion.weaknesses,
      description: suggestion.description,
      imageUrl: null,
    })
    .returning();

  await db
    .delete(suggestionsTable)
    .where(eq(suggestionsTable.id, id));

  res.status(201).json(character);
});

router.delete("/suggestions/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(suggestionsTable)
    .where(eq(suggestionsTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Suggestion not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
