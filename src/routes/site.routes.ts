import { Router } from "express";
import { createSiteConfig } from "../controllers/site.controller";
import { isPlug } from "../middleware/role.middleware";
import authenticateJWT from "../middleware/auth.middleware";

const router = Router();

// Middleware to ensure user is authenticated and is a plug
const plugAuth = [authenticateJWT, isPlug];

router.use(plugAuth);
/**
 * Site Configuration Routes
 */

// Create site configuration
router.post("/", createSiteConfig);

// // Get site configuration
// router.get("/", fetchSiteConfig);

// // List all available site configurations
// router.get("/list", listAllSiteConfigs);

// // Update site configuration (partial)
// router.patch("/", updateSiteConfig);

// // Delete site configuration
// router.delete("/", removeSiteConfig);

export default router;
