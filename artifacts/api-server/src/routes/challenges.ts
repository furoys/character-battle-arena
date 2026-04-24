import { Router, type IRouter } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, challengesTable, pushSubscriptionsTable } from "@workspace/db";
import { getOptionalUserId } from "../lib/auth";
import { getVapidPublicKey, sendPushToChallengeRole } from "../lib/push";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Web Push: VAPID public key ────────────────────────────────────────────────
// Returned to clients so they can call PushManager.subscribe() with the right
// applicationServerKey. Public — by design.
router.get("/push/vapid-public-key", (_req, res): void => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503).json({ error: "Push not configured" });
    return;
  }
  res.json({ key });
});

// ── Web Push: subscribe ──────────────────────────────────────────────────────
// Client posts its PushSubscription JSON + the challenge code + the role token
// (creator or joiner). We verify the token matches the stored token for that
// role on the challenge before storing the subscription, so a stranger can't
// register their browser to receive notifications meant for someone else.
router.post("/push/subscribe", async (req, res): Promise<void> => {
  const { code, token, subscription } = req.body as {
    code?: string;
    token?: string;
    subscription?: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
  };

  if (!code || !token || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    res.status(400).json({ error: "Missing code, token, or subscription fields" });
    return;
  }

  const [challenge] = await db.select().from(challengesTable)
    .where(eq(challengesTable.code, code.toUpperCase())).limit(1);
  if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
  if (new Date() > challenge.expiresAt) { res.status(410).json({ error: "Challenge expired" }); return; }

  let role: "creator" | "joiner" | null = null;
  if (challenge.creatorToken && challenge.creatorToken === token) role = "creator";
  else if (challenge.joinerToken && challenge.joinerToken === token) role = "joiner";
  if (!role) { res.status(403).json({ error: "Invalid token for this challenge" }); return; }

  // Upsert by endpoint — a single browser only ever has one subscription per
  // VAPID key, so re-subscribing should overwrite the previous record.
  await db.insert(pushSubscriptionsTable).values({
    challengeCode: challenge.code,
    role,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }).onConflictDoUpdate({
    target: pushSubscriptionsTable.endpoint,
    set: {
      challengeCode: challenge.code,
      role,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  res.json({ ok: true, role });
});

// ── Create challenge ─────────────────────────────────────────────────────────
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
  const creatorToken = randomUUID();
  await db.insert(challengesTable).values({
    code, team1Ids, mode, blind, expiresAt,
    creatorUserId: getOptionalUserId(req),
    creatorToken,
  });
  res.json({ code, blind, mode, creatorToken });
});

// ── Get challenge state (polled by both sides) ───────────────────────────────
router.get("/challenges/:code", async (req, res): Promise<void> => {
  const [challenge] = await db.select().from(challengesTable)
    .where(eq(challengesTable.code, req.params["code"]!.toUpperCase())).limit(1);
  if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
  if (new Date() > challenge.expiresAt) { res.status(410).json({ error: "Challenge expired" }); return; }

  // Hide team1 in blind mode until the joiner has locked in a team.
  const team1Hidden = challenge.blind && !challenge.team2Ids;
  res.json({
    code: challenge.code,
    team1Ids: team1Hidden ? null : challenge.team1Ids,
    team2Ids: challenge.team2Ids,
    mode: challenge.mode,
    blind: challenge.blind,
    status: challenge.status,
    team1Hidden,
    team1Ready: challenge.team1Ready,
    team2Ready: challenge.team2Ready,
    fightId: challenge.fightId,
  });
});

// ── Accept challenge — sets team2, sends push to creator ─────────────────────
router.post("/challenges/:code/accept", async (req, res): Promise<void> => {
  const [challenge] = await db.select().from(challengesTable)
    .where(eq(challengesTable.code, req.params["code"]!.toUpperCase())).limit(1);
  if (!challenge) { res.status(404).json({ error: "Not found" }); return; }
  if (new Date() > challenge.expiresAt) { res.status(410).json({ error: "Challenge expired" }); return; }
  if (challenge.status !== "open") { res.status(409).json({ error: "Challenge already accepted" }); return; }

  const { team2Ids } = req.body;
  const required = challenge.team1Ids?.length ?? 0;
  if (!Array.isArray(team2Ids) || team2Ids.length !== required) {
    res.status(400).json({
      error: `Pick exactly ${required} fighter${required === 1 ? "" : "s"} to match the challenger's team`,
    });
    return;
  }

  // Atomic accept: only update if no one else has already accepted. Two
  // joiners hitting Lock In at the same time would both pass the check above
  // (read-then-write), so we re-assert the precondition in the WHERE clause
  // and verify a row was actually updated.
  const joinerToken = randomUUID();
  const updated = await db.update(challengesTable)
    .set({ team2Ids, status: "accepted", joinerToken })
    .where(and(
      eq(challengesTable.code, challenge.code),
      eq(challengesTable.status, "open"),
      isNull(challengesTable.team2Ids),
    ))
    .returning({ id: challengesTable.id });
  if (updated.length === 0) {
    res.status(409).json({ error: "Challenge already accepted" });
    return;
  }

  // Fire-and-forget push to the creator. We don't await this in the response
  // path — the joiner shouldn't wait on push delivery. Errors are logged.
  void sendPushToChallengeRole(challenge.code, "creator", {
    title: "Your challenge was accepted!",
    body: "Tap to enter the lobby and start the fight.",
    // Relative path — service worker resolves against its own scope so this
    // works under both root deployments and artifact-prefixed previews.
    url: `challenge/${challenge.code}?creator=1`,
    tag: `challenge-${challenge.code}`,
  }).catch((err) => logger.warn({ err, code: challenge.code }, "creator push failed"));

  res.json({
    code: challenge.code,
    team1Ids: challenge.team1Ids,
    team2Ids,
    mode: challenge.mode,
    blind: challenge.blind,
    joinerToken,
  });
});

// ── Lobby ready toggle ───────────────────────────────────────────────────────
// Each side calls this to mark themselves ready. Token identifies the side.
// Once both flags are true the status flips to "ready" and clients are free to
// open the fight stream (gated server-side as a defence-in-depth check).
router.post("/challenges/:code/ready", async (req, res): Promise<void> => {
  const { token, ready = true } = req.body as { token?: string; ready?: boolean };
  if (!token) { res.status(400).json({ error: "Missing token" }); return; }

  const [challenge] = await db.select().from(challengesTable)
    .where(eq(challengesTable.code, req.params["code"]!.toUpperCase())).limit(1);
  if (!challenge) { res.status(404).json({ error: "Not found" }); return; }
  if (new Date() > challenge.expiresAt) { res.status(410).json({ error: "Challenge expired" }); return; }
  if (!challenge.team2Ids) { res.status(409).json({ error: "Waiting for opponent to lock in" }); return; }

  let side: 1 | 2 | null = null;
  if (challenge.creatorToken && challenge.creatorToken === token) side = 1;
  else if (challenge.joinerToken && challenge.joinerToken === token) side = 2;
  if (!side) { res.status(403).json({ error: "Invalid token" }); return; }

  const update: Partial<typeof challengesTable.$inferInsert> = side === 1
    ? { team1Ready: !!ready }
    : { team2Ready: !!ready };

  // Compute the new status based on what BOTH flags will be after this update.
  const newTeam1Ready = side === 1 ? !!ready : challenge.team1Ready;
  const newTeam2Ready = side === 2 ? !!ready : challenge.team2Ready;
  if (newTeam1Ready && newTeam2Ready && challenge.status !== "completed") {
    update.status = "ready";
  }

  await db.update(challengesTable).set(update)
    .where(eq(challengesTable.code, challenge.code));

  // Push the *opponent* a heads-up that we're ready. Best-effort.
  const opponentRole = side === 1 ? "joiner" : "creator";
  if (ready) {
    void sendPushToChallengeRole(challenge.code, opponentRole, {
      title: side === 1 ? "Challenger is ready!" : "Opponent is ready!",
      body: "Hit READY to start the fight.",
      url: `challenge/${challenge.code}${side === 2 ? "?creator=1" : ""}`,
      tag: `ready-${challenge.code}`,
    }).catch((err) => logger.warn({ err, code: challenge.code }, "ready push failed"));
  }

  res.json({
    code: challenge.code,
    team1Ready: newTeam1Ready,
    team2Ready: newTeam2Ready,
    status: (newTeam1Ready && newTeam2Ready) ? "ready" : challenge.status,
  });
});

// Internal helper — exported via the module so fights.ts can check readiness
// without duplicating the lookup. Returns true if both sides are ready OR
// if the challenge has already been completed (so replays still work).
export async function isChallengeReadyForFight(code: string): Promise<boolean> {
  const [c] = await db.select({
    team1Ready: challengesTable.team1Ready,
    team2Ready: challengesTable.team2Ready,
    status: challengesTable.status,
    fightId: challengesTable.fightId,
  }).from(challengesTable).where(eq(challengesTable.code, code)).limit(1);
  if (!c) return false;
  if (c.fightId) return true;
  if (c.status === "ready" || c.status === "completed") return true;
  return c.team1Ready && c.team2Ready;
}

export default router;
