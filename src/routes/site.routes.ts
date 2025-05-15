import { Router } from "express";
import {
  createSite,
  // getSiteConfig,
  updateSite,
  deleteSite,
  checkSubdomainAvailability,
} from "../controllers/site.controller";
import { isPlug } from "../middleware/role.middleware";
import authenticateJWT from "../middleware/auth.middleware";

const router = Router();

// router.get("/:plugId", getSiteConfig);
// Middleware to ensure user is authenticated and is a plug
const plugAuth = [authenticateJWT, isPlug];

router.use(plugAuth);
// Protected routes requiring plug authentication
router.post("/check-subdomain", checkSubdomainAvailability);
router.post("/", createSite);
router.put("/", updateSite);
router.delete("/", deleteSite);

export default router;
