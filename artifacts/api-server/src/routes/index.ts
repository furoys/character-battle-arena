import { Router, type IRouter } from "express";
import healthRouter from "./health";
import charactersRouter from "./characters";
import fightsRouter from "./fights";
import suggestionsRouter from "./suggestions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(charactersRouter);
router.use(fightsRouter);
router.use(suggestionsRouter);

export default router;
