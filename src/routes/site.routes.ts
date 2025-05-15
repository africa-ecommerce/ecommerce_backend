import { Router } from "express";
import {
  createSiteConfig,
  getSiteConfig,
  updateSiteConfig,
  deleteSiteConfig,
  checkSubdomainAvailability,
} from "../controllers/site.controller";
import { isPlug } from "../middleware/role.middleware";
import authenticateJWT from "../middleware/auth.middleware";

const router = Router();

// Middleware to ensure user is authenticated and is a plug
const plugAuth = [authenticateJWT, isPlug];

router.use(plugAuth);
// Protected routes requiring plug authentication
router.post("/", createSiteConfig);
router.get("/", getSiteConfig);
router.put("/", updateSiteConfig);
router.delete("/", deleteSiteConfig);
router.get("/check-subdomain", checkSubdomainAvailability);

export default router;
