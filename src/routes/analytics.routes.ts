import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { isPlug } from "../middleware/role.middleware";
import { getLinkAnalytics, getStoreAnalytics } from "../controllers/analytics.controller";

const router = Router();

router.get("/links", authenticateJWT,  getLinkAnalytics);
router.get("/store", authenticateJWT, getStoreAnalytics);

export default router;