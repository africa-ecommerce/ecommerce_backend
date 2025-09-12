import { Router } from "express";
import { getAllSuppliers, verifySupplier } from "../controllers/admin/user.controller";
import { adminProductController } from "../controllers/admin/product.controller";
import { adminLogout, sendAdminOTP, verifyAdminOTP } from "../controllers/admin/auth.controller";
import { deliveredOrder, getOrderById, getOrders, shippedOrder, markItemsReceived, cancelOrder, pauseOrderItem, returnOrderItem, unpauseOrderItem, getPausedOrderItems } from "../controllers/admin/order.controller";
import { getShareAnalytics, trackShareAnalytics } from "../controllers/admin/analytics/shareAnalytics.controller";
import authenticateJWT from "../middleware/auth.middleware";
import { requireAdminAuth } from "../middleware/role.middleware";


const router = Router();

// Get all supplier products
router.get(
  "/user/suppliers",
  requireAdminAuth,
  getAllSuppliers
)

//verify supplier 
router.post("/verifySupplier/:supplierId", requireAdminAuth, verifySupplier);
// Get product by ID
router.get("/product/:supplierId", requireAdminAuth, adminProductController.getSupplierProducts);

router.post("/product/:supplierId", requireAdminAuth, adminProductController.createProduct);

// Approve product (with min/max price)
router.put("/product/approve/:productId", requireAdminAuth, adminProductController.approveSupplierProducts);

// Query (reject) product
router.put("/product/query/:productId", requireAdminAuth, adminProductController.querySupplierProducts);

// Update product
router.put("/product/:supplierId/:productId", requireAdminAuth, adminProductController.updateProduct);
// Delete product
router.delete(
  "/product/:supplierId/:productId",
  requireAdminAuth,
  adminProductController.deleteProduct
);





router.get("/order", requireAdminAuth, getOrders);
router.get("/order/:id", requireAdminAuth,getOrderById);
router.post("/order/shipped", requireAdminAuth, shippedOrder);
router.post("/order/delivered", requireAdminAuth, deliveredOrder);
// Mark order items as received
router.post("/order/received/:orderId", requireAdminAuth, markItemsReceived);

// Cancel an order
router.post("/order/cancel/:orderId", requireAdminAuth, cancelOrder);


router.get("/order/paused/:orderId", requireAdminAuth, getPausedOrderItems);
router.post("/order/pause", requireAdminAuth, pauseOrderItem);
router.post("/order/unpause", requireAdminAuth, unpauseOrderItem);
router.post("/order/return", requireAdminAuth, returnOrderItem);

router.post("/auth/send-otp", sendAdminOTP);
router.post("/auth/verify-otp", verifyAdminOTP);
router.post("/auth/logout", requireAdminAuth, adminLogout);


router.post("/analytics/share", authenticateJWT, trackShareAnalytics);
router.get("/analytics/share", requireAdminAuth, getShareAnalytics);

export default router;

