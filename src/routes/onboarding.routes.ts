import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { onboarding, checkPlugBusinessNameAvailability, checkSupplierBusinessNameAvailability } from "../controllers/onboarding.controller";
import { isPlug, isSupplier } from "../middleware/role.middleware";

const router = Router();

router.post("/plug/businessName", authenticateJWT, checkPlugBusinessNameAvailability);
router.post("/supplier/businessName", authenticateJWT, checkSupplierBusinessNameAvailability);
router.post("/", authenticateJWT, onboarding);

export default router;
