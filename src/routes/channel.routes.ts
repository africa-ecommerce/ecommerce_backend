import {
  upsertSupplierChannel,
  getSupplierChannel,
  deleteSupplierChannel
} from "../controllers/channel.controller";
import authenticateJWT from "../middleware/auth.middleware";
import { isSupplier } from "../middleware/role.middleware";
import { Router } from "express";



const plugAuth = [authenticateJWT, isSupplier];
const router = Router();
router.use(plugAuth);

router.post("/", upsertSupplierChannel);
router.get("/", getSupplierChannel);
router.delete("/", deleteSupplierChannel);

export default router;
