import { Router } from "express";
import { getProductById, getStoreProductById, getStoreProducts } from "../controllers/public/product.controller";
import {
  verifySubdomain,
  getStoreConfig,
  pixelStoreVisitTracker,
  // getSupplierStorePolicy,
} from "../controllers/public/store.controller";
import { getOrderItemByOrderNumber, manageOrder } from "../controllers/public/order.controller";
const router = Router();
// This route handles fetching a specific product by its ID for a specific plug.
router.get("/products/:productId/:id", getProductById);
router.get("/products/:productId", getStoreProductById);
router.get("/order/:orderNumber", getOrderItemByOrderNumber);
router.put("/order/manage", manageOrder);
router.get("/store/config", getStoreConfig);
router.get("/store/products", getStoreProducts);    
router.get("/store/pixel", pixelStoreVisitTracker);
//adjust middleware
router.get("/store/verifySubdomain", verifySubdomain);
// router.get("/store/policy", getSupplierStorePolicy);

export default router;
