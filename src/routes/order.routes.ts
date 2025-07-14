import { Router } from "express";
import {
  getBuyerInfo,
  getPlugOrders,
  getSupplierOrders,
  placeOrder,
  getPlugPausedOrderItems,
  getPlugReturnedOrderItems,
  getSupplierPausedOrderItems,
  getSupplierReturnedOrderItems,
} from "../controllers/order.controller";
import authenticateJWT from "../middleware/auth.middleware";
import { isPlug, isSupplier } from "../middleware/role.middleware";
const router = Router();

router.post("/place-order", placeOrder);
router.get("/buyer-info", getBuyerInfo);
router.get("/plug", authenticateJWT, isPlug, getPlugOrders);
router.get("/supplier", authenticateJWT, isSupplier, getSupplierOrders);
router.get("/plug/paused", authenticateJWT, isPlug, getPlugPausedOrderItems);
router.get(
  "/plug/returned",
  authenticateJWT,
  isPlug,
  getPlugReturnedOrderItems
);
router.get(
  "/supplier/paused",
  authenticateJWT,
  isSupplier,
  getSupplierPausedOrderItems
);
router.get(
  "/supplier/returned",
  authenticateJWT,
  isSupplier,
  getSupplierReturnedOrderItems
);
export default router;
