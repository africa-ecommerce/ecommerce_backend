// src/routes/order.routes.ts
import { Router } from "express";
import {
  placeOrder,
  listOrders,
  getOrderDetails,
  changeOrderStatus,
} from "../controllers/order.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticateJWT, placeOrder);
router.get("/", authenticateJWT, listOrders);
router.get("/:id", authenticateJWT, getOrderDetails);
router.put("/:id/status", authenticateJWT, changeOrderStatus);


// Flutterwave integration
// router.post('/:id/pay', [
//   getOrder,
//   reserveInventory,
//   initFlutterwavePayment,
//   handleWebhook
// ], processPayment);

// // Physical store QR code orders
// router.post('/qr', [
//   scanQRCode,
//   validateStock,
//   createTempOrder
// ], handleQROrder);

export default router;
