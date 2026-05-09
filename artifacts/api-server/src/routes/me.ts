import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getEnergyState } from "../lib/energy";
import { db, savedTeamsTable } from "@workspace/db";

const router: IRouter = Router();

// ── Energy state for the signed-in user ──────────────────────────────────────
// Returns { energy, max, msUntilNextRefill, fullAt, serverNow }.
// 401 for guests — clients should only call this when signed in.
router.get("/me/energy", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const state = await getEnergyState(userId);
  res.json(state);
});

// ── Saved teams ───────────────────────────────────────────────────────────────

router.get("/me/teams", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const teams = await db
    .select()
    .from(savedTeamsTable)
    .where(eq(savedTeamsTable.userId, userId))
    .orderBy(savedTeamsTable.createdAt);
  res.json(teams);
});

router.post("/me/teams", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const { name, characterIds } = req.body as { name?: unknown; characterIds?: unknown };

  if (typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!Array.isArray(characterIds) || characterIds.length === 0 || characterIds.length > 5) {
    res.status(400).json({ error: "characterIds must be 1-5 integers" });
    return;
  }
  const ids = characterIds as number[];

  const [team] = await db
    .insert(savedTeamsTable)
    .values({ userId, name: name.trim(), characterIds: ids })
    .returning();
  res.json(team);
});

router.delete("/me/teams/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const id = parseInt(String(req.params["id"] ?? ""), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const deleted = await db
    .delete(savedTeamsTable)
    .where(and(eq(savedTeamsTable.id, id), eq(savedTeamsTable.userId, userId)))
    .returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).end();
});

export default router;
