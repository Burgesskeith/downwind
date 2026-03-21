import { Router, type IRouter } from "express";
import healthRouter from "./health";
import weatherRouter from "./weather";
import adsRouter from "./ads";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/weather", weatherRouter);
router.use(adsRouter);
router.use(storageRouter);

export default router;
