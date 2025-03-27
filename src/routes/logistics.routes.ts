// src/routes/logistics.routes.ts
import { Router } from "express";
import { logisticsRequest } from "../controllers/logistics.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();
router.post("/", authenticateJWT, logisticsRequest);

export default router;
