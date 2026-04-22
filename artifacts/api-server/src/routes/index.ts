import { Router, type IRouter } from "express";
import healthRouter from "./health";
import charactersRouter from "./characters";
import fightsRouter from "./fights";
import suggestionsRouter from "./suggestions";
import challengesRouter from "./challenges";

const router: IRouter = Router();

router.use(healthRouter);
router.use(charactersRouter);
router.use(fightsRouter);
router.use(suggestionsRouter);
router.use(challengesRouter);

export default router;
