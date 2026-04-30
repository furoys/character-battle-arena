import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { getEnergyState } from "../lib/energy";

const router: IRouter = Router();

// ── Energy state for the signed-in user ──────────────────────────────────────
// Returns { energy, max, msUntilNextRefill, fullAt, serverNow }.
// 401 for guests — clients should only call this when signed in.
router.get("/me/energy", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: string }).userId;
  const state = await getEnergyState(userId);
  res.json(state);
});

export default router;
