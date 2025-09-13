import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { onboarding, checkPlugBusinessNameAvailability, checkSupplierBusinessNameAvailability } from "../controllers/onboarding.controller";
import { isPlug, isSupplier } from "../middleware/role.middleware";

const router = Router();

router.post("/plug/businessName", authenticateJWT, isPlug, checkPlugBusinessNameAvailability);
router.post("/supplier/businessName", authenticateJWT, isSupplier, checkSupplierBusinessNameAvailability);
router.post("/", authenticateJWT, onboarding);

export default router;
