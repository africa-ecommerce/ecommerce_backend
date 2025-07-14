import{ Router } from "express";
import { logisticsPricing } from "../controllers/logistics.controller";
const router = Router();

router.get("/pricing", logisticsPricing);
export default router;
