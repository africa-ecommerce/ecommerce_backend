import { Router } from "express";
import { getAllSuppliers } from "../controllers/admin/user.controller";
import { adminProductController } from "../controllers/admin/product.controller";
import { adminLogout, sendAdminOTP, verifyAdminOTP } from "../controllers/admin/auth.controller";
import { deliveredOrder, getOrders, shippedOrder } from "../controllers/admin/order.controller";
import { getShareAnalytics, trackShareAnalytics } from "../controllers/admin/analytics/shareAnalytics.controller";

const router = Router();

// Get all supplier products
router.get(
  "/user/suppliers",
  getAllSuppliers
)
// Get product by ID
router.get("/product/:supplierId", adminProductController.getSupplierProducts);

router.post("/product/:supplierId", adminProductController.createProduct);
// Update product
router.put("/product/:supplierId/:productId", adminProductController.updateProduct);
// Delete product
router.delete(
  "/product/:supplierId/:productId",
  adminProductController.deleteProduct
);

router.get("/order", getOrders);
router.post("/order/shipped", shippedOrder);
router.post("/order/delivered", deliveredOrder);

router.post("/auth/send-otp", sendAdminOTP);
router.post("/auth/verify-otp", verifyAdminOTP);
router.post("/auth/logout", adminLogout);


router.post("/analytics/share", trackShareAnalytics);
router.get("/analytics/share", getShareAnalytics);



export default router;

