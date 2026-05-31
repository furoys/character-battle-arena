import { Router, type IRouter } from "express";
import healthRouter from "./health";
import charactersRouter from "./characters";
import fightsRouter from "./fights";
import suggestionsRouter from "./suggestions";
import challengesRouter from "./challenges";
import ttsRouter from "./tts";
import downloadsRouter from "./downloads";
import meRouter from "./me";
import dailyRouter from "./daily";
import tournamentsRouter from "./tournaments";
import draftsRouter from "./drafts";
import wagerRouter from "./wager";

const router: IRouter = Router();

router.use(healthRouter);
router.use(charactersRouter);
router.use(fightsRouter);
router.use(suggestionsRouter);
router.use(challengesRouter);
router.use(ttsRouter);
router.use(downloadsRouter);
router.use(meRouter);
router.use(dailyRouter);
router.use(tournamentsRouter);
router.use(draftsRouter);
router.use(wagerRouter);

export default router;
