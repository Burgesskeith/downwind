import { Router, type IRouter } from "express";
import healthRouter from "./health";
import weatherRouter from "./weather";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/weather", weatherRouter);

export default router;
