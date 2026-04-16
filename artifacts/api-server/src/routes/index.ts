import { Router, type IRouter } from "express";
import healthRouter from "./health";
import charactersRouter from "./characters";
import fightsRouter from "./fights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(charactersRouter);
router.use(fightsRouter);

export default router;
