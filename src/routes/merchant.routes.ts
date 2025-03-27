// src/routes/merchant.routes.ts
import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/merchant.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();

// All merchant routes are protected
router.get("/profile", authenticateJWT, getProfile);
router.put("/profile", authenticateJWT, updateProfile);

export default router;
