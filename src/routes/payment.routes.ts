// src/routes/payment.routes.ts
import { Router } from "express";
import { initiatePayment } from "../controllers/payment.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();
router.post("/initiate", authenticateJWT, initiatePayment);

export default router;
