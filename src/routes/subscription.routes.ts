// src/routes/subscription.routes.ts
import { Router } from "express";
import {
  subscribe,
  getSubscriptionStatus,
  changeSubscription,
  cancelSub,
} from "../controllers/subscription.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();

// All endpoints here are protected
router.post("/", authenticateJWT, subscribe);
router.get("/", authenticateJWT, getSubscriptionStatus);
router.put("/", authenticateJWT, changeSubscription);
router.delete("/", authenticateJWT, cancelSub);

export default router;
