import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  draftSessionsTable,
  charactersTable,
  tournamentsTable,
  type Character,
  type DraftPick,
  type TournamentBracket,
} from "@workspace/db";
import { getOptionalUserId } from "../lib/auth";
import { runBracket } from "./tournaments";

const router: IRouter = Router();

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const VALID_SIZES = new Set([8, 16, 32]);
const EXCLUDED_UNIVERSE = "Developer Legends";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Snake draft order for two players. Creator picks first overall; the order of
// each pair of picks reverses every round (C,J · J,C · C,J · …) so neither side
// gets a structural advantage. Returns whose pick the k-th (0-based) slot is.
function ownerForPick(k: number): "creator" | "joiner" {
  const round = Math.floor(k / 2);
  const within = k % 2;
  if (round % 2 === 0) return within === 0 ? "creator" : "joiner";
  return within === 0 ? "joiner" : "creator";
}

// Public view of a session — NEVER includes role tokens.
function publicView(s: typeof draftSessionsTable.$inferSelect) {
  const picks = (s.picks ?? []) as DraftPick[];
  const full = picks.length >= s.size;
  return {
    code: s.code,
    size: s.size,
    status: s.status,
    picks,
    pickCount: picks.length,
    // Whose turn it is to pick next (null when not actively drafting).
    turn: s.status === "drafting" && !full ? ownerForPick(picks.length) : null,
    joinerPresent: !!s.joinerToken,
    tournamentId: s.tournamentId ?? null,
    championOwner: s.championOwner ?? null,
    expiresAt: s.expiresAt.toISOString(),
  };
}

// ── POST /api/drafts — create a draft session ─────────────────────────────────
router.post("/drafts", async (req, res): Promise<void> => {
  const size = Number((req.body as { size?: unknown }).size);
  if (!VALID_SIZES.has(size)) {
    res.status(400).json({ error: "size must be 8, 16, or 32" });
    return;
  }
  const creatorToken = randomUUID();
  const creatorUserId = getOptionalUserId(req);
  const expiresAt = new Date(Date.now() + DRAFT_TTL_MS);

  // Retry on the (vanishingly unlikely) code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const [row] = await db
        .insert(draftSessionsTable)
        .values({ code, size, status: "open", picks: [], creatorToken, creatorUserId, expiresAt })
        .returning();
      res.status(201).json({ ...publicView(row!), creatorToken, role: "creator" });
      return;
    } catch {
      // unique-code collision — try another code
    }
  }
  res.status(500).json({ error: "Could not allocate a draft code, try again" });
});

// ── GET /api/drafts/:code — poll session state ────────────────────────────────
router.get("/drafts/:code", async (req, res): Promise<void> => {
  const code = String(req.params["code"] ?? "").toUpperCase();
  const [s] = await db.select().from(draftSessionsTable).where(eq(draftSessionsTable.code, code)).limit(1);
  if (!s) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }
  res.json(publicView(s));
});

// ── POST /api/drafts/:code/join — second player joins ─────────────────────────
router.post("/drafts/:code/join", async (req, res): Promise<void> => {
  const code = String(req.params["code"] ?? "").toUpperCase();
  // Lock the session row for the whole join so two simultaneous joiners can't
  // both claim the open slot (read-then-write race → token/role clobbering).
  const result = await db.transaction(async (tx) => {
    const [s] = await tx
      .select()
      .from(draftSessionsTable)
      .where(eq(draftSessionsTable.code, code))
      .for("update")
      .limit(1);
    if (!s) return { status: 404 as const, error: "Draft not found" };
    if (new Date() > s.expiresAt) return { status: 410 as const, error: "Draft expired" };
    if (s.joinerToken) return { status: 409 as const, error: "This draft already has two players" };
    const joinerToken = randomUUID();
    const [updated] = await tx
      .update(draftSessionsTable)
      .set({ joinerToken, status: "drafting" })
      .where(eq(draftSessionsTable.code, code))
      .returning();
    return { ok: true as const, joinerToken, view: publicView(updated!) };
  });
  if (!("ok" in result)) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json({ ...result.view, joinerToken: result.joinerToken, role: "joiner" });
});

// ── POST /api/drafts/:code/pick — place one pick (turn-gated) ──────────────────
router.post("/drafts/:code/pick", async (req, res): Promise<void> => {
  const code = String(req.params["code"] ?? "").toUpperCase();
  const { token, characterId } = req.body as { token?: string; characterId?: number };
  const charId = Number(characterId);
  if (!token || !Number.isInteger(charId)) {
    res.status(400).json({ error: "Missing token or characterId" });
    return;
  }

  // The whole pick — re-read, turn/duplicate checks, and the write (including the
  // bracket build + finalize on the last pick) — runs under a row lock so two
  // concurrent requests can't both pass the turn gate and clobber each other's
  // picks (lost-update), and finalize stays atomic (no orphan/duplicate cups).
  const result = await db.transaction(async (tx) => {
    const [s] = await tx
      .select()
      .from(draftSessionsTable)
      .where(eq(draftSessionsTable.code, code))
      .for("update")
      .limit(1);
    if (!s) return { status: 404 as const, error: "Draft not found" };
    if (new Date() > s.expiresAt) return { status: 410 as const, error: "Draft expired" };
    if (s.status !== "drafting") {
      return {
        status: 409 as const,
        error: s.status === "open" ? "Waiting for an opponent to join" : "Draft is already complete",
      };
    }

    // Identify the caller's role from the token.
    let role: "creator" | "joiner" | null = null;
    if (s.creatorToken && s.creatorToken === token) role = "creator";
    else if (s.joinerToken && s.joinerToken === token) role = "joiner";
    if (!role) return { status: 403 as const, error: "Invalid token for this draft" };

    const picks = (s.picks ?? []) as DraftPick[];
    if (picks.length >= s.size) return { status: 409 as const, error: "Draft field is already full" };
    // Turn gate.
    if (ownerForPick(picks.length) !== role) return { status: 409 as const, error: "It is not your turn" };
    // No duplicate fighters.
    if (picks.some((p) => p.id === charId)) {
      return { status: 409 as const, error: "That fighter is already drafted" };
    }
    // Validate the character (exists + not a barred Developer Legend).
    const [char] = await tx.select().from(charactersTable).where(eq(charactersTable.id, charId)).limit(1);
    if (!char) return { status: 400 as const, error: "Unknown character id" };
    if (char.universe === EXCLUDED_UNIVERSE) {
      return { status: 400 as const, error: "Developer Legends are not allowed in drafts" };
    }

    const nextPicks: DraftPick[] = [...picks, { id: charId, owner: role }];

    // If the field is now full, build the bracket and finalize atomically.
    if (nextPicks.length >= s.size) {
      const ids = nextPicks.map((p) => p.id);
      const rows = await tx.select().from(charactersTable).where(inArray(charactersTable.id, ids));
      const byId = new Map<number, Character>(rows.map((c) => [c.id, c]));
      // Seed in pick order so first-round matchups pit the two drafters against
      // each other. Map draft owners onto the bracket's user/cpu coloring:
      // creator → "user", joiner → "cpu".
      const seeded: Character[] = [];
      const ownerById = new Map<number, "user" | "cpu">();
      for (const p of nextPicks) {
        const c = byId.get(p.id);
        if (c) {
          seeded.push(c);
          ownerById.set(c.id, p.owner === "creator" ? "user" : "cpu");
        }
      }

      const { rounds, champion } = await runBracket(seeded, s.size, ownerById);
      const bracket: TournamentBracket = { rounds };
      const championPick = nextPicks.find((p) => p.id === champion.id);

      const [cup] = await tx
        .insert(tournamentsTable)
        .values({
          userId: s.creatorUserId ?? null,
          name: "Draft Duel",
          themeLabel: "PvP Draft",
          size: s.size,
          mode: "draft",
          championId: champion.id,
          championName: champion.name,
          bracket,
        })
        .returning();

      const [updated] = await tx
        .update(draftSessionsTable)
        .set({
          picks: nextPicks,
          status: "complete",
          tournamentId: cup!.id,
          championOwner: championPick?.owner ?? null,
        })
        .where(eq(draftSessionsTable.code, code))
        .returning();
      return { ok: true as const, view: publicView(updated!) };
    }

    const [updated] = await tx
      .update(draftSessionsTable)
      .set({ picks: nextPicks })
      .where(eq(draftSessionsTable.code, code))
      .returning();
    return { ok: true as const, view: publicView(updated!) };
  });

  if (!("ok" in result)) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.view);
});

export default router;
