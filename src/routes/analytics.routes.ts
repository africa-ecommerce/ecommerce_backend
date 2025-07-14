import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { isPlug } from "../middleware/role.middleware";
import { getPlugLinkAnalytics, getPlugStoreAnalytics } from "../controllers/analytics.controller";

const router = Router();

router.get("/links", authenticateJWT, isPlug, getPlugLinkAnalytics);
router.get("/store", authenticateJWT, isPlug, getPlugStoreAnalytics);

export default router;