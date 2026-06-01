import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getEnergyState } from "../lib/energy";
import {
  db,
  savedTeamsTable,
  tournamentRecordsTable,
  tournamentRecordEntriesTable,
  tournamentsTable,
} from "@workspace/db";
import { RecordTournamentResultBody } from "@workspace/api-zod";

const router: IRouter = Router();

type RecordResponse = {
  wins: number;
  losses: number;
  streak: number;
  best: number;
  lastTournamentId: number | null;
};
const EMPTY_RECORD: RecordResponse = { wins: 0, losses: 0, streak: 0, best: 0, lastTournamentId: null };

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

// ── vs-CPU tournament record ─────────────────────────────────────────────────

router.get("/me/tournament-record", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const [rec] = await db
    .select()
    .from(tournamentRecordsTable)
    .where(eq(tournamentRecordsTable.userId, userId))
    .limit(1);
  res.json(
    rec
      ? {
          wins: rec.wins,
          losses: rec.losses,
          streak: rec.streak,
          best: rec.best,
          lastTournamentId: rec.lastTournamentId ?? null,
        }
      : EMPTY_RECORD,
  );
});

router.post("/me/tournament-record", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const parsed = RecordTournamentResultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid result input", details: parsed.error.issues });
    return;
  }
  const { tournamentId, displayName } = parsed.data;

  // ── Authoritative outcome: never trust a client-supplied `won`. Load the
  // tournament, require the caller to be its creator and that it's a draft cup,
  // then derive the result from the bracket's final match. ───────────────────
  const [tournament] = await db
    .select()
    .from(tournamentsTable)
    .where(eq(tournamentsTable.id, tournamentId))
    .limit(1);
  if (!tournament) {
    res.status(404).json({ error: "Tournament not found" });
    return;
  }
  if (tournament.userId !== userId) {
    res.status(403).json({ error: "Not your tournament" });
    return;
  }
  if (tournament.mode !== "draft") {
    res.status(400).json({ error: "Only draft-vs-CPU cups count toward your record" });
    return;
  }
  const rounds = tournament.bracket?.rounds ?? [];
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  const championSide =
    finalMatch?.winnerSide === 1
      ? finalMatch.a
      : finalMatch?.winnerSide === 2
        ? finalMatch.b
        : null;
  if (!championSide || (championSide.owner !== "user" && championSide.owner !== "cpu")) {
    res.status(409).json({ error: "Tournament has no resolved drafted champion" });
    return;
  }
  const won = championSide.owner === "user";
  const nameToStore = (displayName ?? "").trim() || null;

  // Ledger claim + aggregate update run atomically and serialized per user so a
  // crash can't claim-without-counting and concurrent submissions can't lose an
  // update. Claim the (user, tournament) ledger row first (idempotency); then
  // lock the user's record row FOR UPDATE before the read-modify-write.
  const result = await db.transaction(async (tx): Promise<RecordResponse> => {
    const claimed = await tx
      .insert(tournamentRecordEntriesTable)
      .values({ userId, tournamentId, won: won ? 1 : 0 })
      .onConflictDoNothing({
        target: [tournamentRecordEntriesTable.userId, tournamentRecordEntriesTable.tournamentId],
      })
      .returning({ tournamentId: tournamentRecordEntriesTable.tournamentId });

    // Ensure a record row exists so the FOR UPDATE lock below has a row to take,
    // then lock it to serialize concurrent submissions for this user.
    await tx
      .insert(tournamentRecordsTable)
      .values({ userId, displayName: nameToStore })
      .onConflictDoNothing({ target: tournamentRecordsTable.userId });
    const [existing] = await tx
      .select()
      .from(tournamentRecordsTable)
      .where(eq(tournamentRecordsTable.userId, userId))
      .for("update")
      .limit(1);
    const prev: RecordResponse = existing
      ? {
          wins: existing.wins,
          losses: existing.losses,
          streak: existing.streak,
          best: existing.best,
          lastTournamentId: existing.lastTournamentId ?? null,
        }
      : EMPTY_RECORD;

    // Already counted (replay / re-open / forged retry): leave totals untouched.
    if (claimed.length === 0) return prev;

    const streak = won
      ? prev.streak > 0
        ? prev.streak + 1
        : 1
      : prev.streak < 0
        ? prev.streak - 1
        : -1;
    const next: RecordResponse = {
      wins: prev.wins + (won ? 1 : 0),
      losses: prev.losses + (won ? 0 : 1),
      streak,
      best: Math.max(prev.best, streak),
      lastTournamentId: tournamentId,
    };

    await tx
      .update(tournamentRecordsTable)
      .set({
        displayName: nameToStore || existing?.displayName || null,
        wins: next.wins,
        losses: next.losses,
        streak: next.streak,
        best: next.best,
        lastTournamentId: next.lastTournamentId,
        updatedAt: new Date(),
      })
      .where(eq(tournamentRecordsTable.userId, userId));

    return next;
  });

  res.json(result);
});

export default router;
