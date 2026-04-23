import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, challengesTable } from "@workspace/db";
import { getOptionalUserId } from "../lib/auth";

const router: IRouter = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

router.post("/challenges", async (req, res): Promise<void> => {
  const { team1Ids, mode = "cinematic", blind = false } = req.body;
  if (!Array.isArray(team1Ids) || team1Ids.length === 0 || team1Ids.length > 5) {
    res.status(400).json({ error: "team1Ids must be 1–5 character IDs" });
    return;
  }
  let code = "";
  let attempts = 0;
  while (attempts < 10) {
    code = generateCode();
    const existing = await db.select({ id: challengesTable.id })
      .from(challengesTable).where(eq(challengesTable.code, code)).limit(1);
    if (existing.length === 0) break;
    attempts++;
  }
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(challengesTable).values({
    code, team1Ids, mode, blind, expiresAt,
    creatorUserId: getOptionalUserId(req),
  });
  res.json({ code, blind, mode });
});

router.get("/challenges/:code", async (req, res): Promise<void> => {
  const [challenge] = await db.select().from(challengesTable)
    .where(eq(challengesTable.code, req.params["code"]!.toUpperCase())).limit(1);
  if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
  if (new Date() > challenge.expiresAt) { res.status(410).json({ error: "Challenge expired" }); return; }

  const team1Hidden = challenge.blind && !challenge.team2Ids;
  res.json({
    code: challenge.code,
    team1Ids: team1Hidden ? null : challenge.team1Ids,
    team2Ids: challenge.team2Ids,
    mode: challenge.mode,
    blind: challenge.blind,
    status: challenge.status,
    team1Hidden,
  });
});

router.post("/challenges/:code/accept", async (req, res): Promise<void> => {
  const [challenge] = await db.select().from(challengesTable)
    .where(eq(challengesTable.code, req.params["code"]!.toUpperCase())).limit(1);
  if (!challenge) { res.status(404).json({ error: "Not found" }); return; }
  if (challenge.status !== "open") { res.status(409).json({ error: "Challenge already accepted" }); return; }

  const { team2Ids } = req.body;
  if (!Array.isArray(team2Ids) || team2Ids.length === 0 || team2Ids.length > 5) {
    res.status(400).json({ error: "team2Ids must be 1–5 character IDs" });
    return;
  }
  await db.update(challengesTable)
    .set({ team2Ids, status: "accepted" })
    .where(eq(challengesTable.code, challenge.code));

  res.json({
    code: challenge.code,
    team1Ids: challenge.team1Ids,
    team2Ids,
    mode: challenge.mode,
    blind: challenge.blind,
  });
});

export default router;
