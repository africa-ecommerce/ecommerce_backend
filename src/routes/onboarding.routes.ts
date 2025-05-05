import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { onboarding } from "../controllers/onboarding.controller";
const router = Router();

router.post("/", authenticateJWT, onboarding);

export default router;
