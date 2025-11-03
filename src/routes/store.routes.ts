import { Router } from "express";
import {
  createStore,
  updateStore,
  deleteStore,
  checkSubdomainAvailability,
  getStoreConfig,
  upsertSupplierStorePolicy,
  getSupplierStorePolicy
} from "../controllers/store.controller";
import authenticateJWT from "../middleware/auth.middleware";
import { isSupplier } from "../middleware/role.middleware";

const router = Router();

// Middleware to ensure user is authenticated and is a plug
const auth = [authenticateJWT];

router.use(auth);
// Protected routes requiring plug authentication
router.get("/config", getStoreConfig);
router.post("/check-subdomain", checkSubdomainAvailability);
router.post("/", createStore);
router.put("/", updateStore);
router.delete("/", deleteStore);
router.post("/policy", isSupplier, upsertSupplierStorePolicy);
router.get("/policy", isSupplier, getSupplierStorePolicy);

export default router;
