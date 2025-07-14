import{ Router } from "express";
import { logisticsPricing, logisticsTracking } from "../controllers/logistics.controller";
const router = Router();

router.get("/pricing", logisticsPricing);
router.get("/tracking", logisticsTracking);
export default router;
