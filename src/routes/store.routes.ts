import { Router } from "express";
import {
  createStore,
  updateStore,
  deleteStore,
  checkSubdomainAvailability,
  getStoreConfig,
} from "../controllers/store.controller";
import { isPlug } from "../middleware/role.middleware";
import authenticateJWT from "../middleware/auth.middleware";

const router = Router();

// Middleware to ensure user is authenticated and is a plug
const plugAuth = [authenticateJWT, isPlug];

router.use(plugAuth);
// Protected routes requiring plug authentication
router.get("/config", getStoreConfig);
router.post("/check-subdomain", checkSubdomainAvailability);
router.post("/", createStore);
router.put("/", updateStore);
router.delete("/", deleteStore);

export default router;
