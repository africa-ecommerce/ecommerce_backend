// // src/routes/order.routes.ts
// import { Router } from "express";
// import {
//   placeOrder,
//   listOrders,
//   getOrderDetails,
//   changeOrderStatus,
// } from "../controllers/order.controller";
// import { authenticateJWT } from "../middleware/auth.middleware";

// const router = Router();

// router.post("/", authenticateJWT, placeOrder);
// router.get("/", authenticateJWT, listOrders);
// router.get("/:id", authenticateJWT, getOrderDetails);
// router.put("/:id/status", authenticateJWT, changeOrderStatus);


// // Flutterwave integration
// // router.post('/:id/pay', [
// //   getOrder,
// //   reserveInventory,
// //   initFlutterwavePayment,
// //   handleWebhook
// // ], processPayment);

// // // Physical store QR code orders
// // router.post('/qr', [
// //   scanQRCode,
// //   validateStock,
// //   createTempOrder
// // ], handleQROrder);

// export default router;





// // src/routes/order.routes.ts

// import express from 'express';
// import { orderController } from '../controllers/order.controller';
// import { verifyToken, ensureSupplier } from '../middleware/auth.middleware';

// const router = express.Router();

// /**
//  * @route POST /api/orders
//  * @desc Create a new order
//  * @access Public (buyers will use this)
//  */
// router.post('/', orderController.createOrder);

// /**
//  * @route GET /api/orders/:id
//  * @desc Get a specific order by ID
//  * @access Protected - Only the supplier of the order or admin can access
//  */
// router.get('/:id', verifyToken, orderController.getOrder);

// /**
//  * @route GET /api/orders/buyer
//  * @desc Get all orders for a buyer
//  * @access Public (with email validation)
//  */
// router.get('/buyer', orderController.getBuyerOrders);

// /**
//  * @route GET /api/orders/supplier
//  * @desc Get all orders for a supplier
//  * @access Protected - Suppliers only
//  */
// router.get('/supplier', verifyToken, ensureSupplier, orderController.getSupplierOrders);

// /**
//  * @route GET /api/orders/stats
//  * @desc Get order statistics for supplier
//  * @access Protected - Suppliers only
//  */
// router.get('/stats', verifyToken, ensureSupplier, orderController.getSupplierOrderStats);

// /**
//  * @route PUT /api/orders/:id/status
//  * @desc Update order status
//  * @access Protected - Suppliers only
//  */
// router.put('/:id/status', verifyToken, ensureSupplier, orderController.updateOrderStatus);

// /**
//  * @route PUT /api/orders/:id/cancel
//  * @desc Cancel an order
//  * @access Protected - Suppliers only
//  */
// router.put('/:id/cancel', verifyToken, ensureSupplier, orderController.cancelOrder);

// /**
//  * @route PUT /api/orders/:id/delay
//  * @desc Delay an order
//  * @access Protected - Suppliers only
//  */
// router.put('/:id/delay', verifyToken, ensureSupplier, orderController.delayOrder);

// /**
//  * @route POST /api/orders/track
//  * @desc Track an order
//  * @access Public
//  */
// router.post('/track', orderController.trackOrder);

// export default router;