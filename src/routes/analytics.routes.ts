// src/routes/analytics.routes.ts
import { Router } from "express";
import {
  salesAnalytics,
  inventoryAnalytics,
} from "../controllers/analytics.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();
router.get("/sales", authenticateJWT, salesAnalytics);
router.get("/inventory", authenticateJWT, inventoryAnalytics);

export default router;
