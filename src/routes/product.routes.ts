import { Router } from "express";
import { productController } from "../controllers/supplierProduct.controller";
import authenticateJWT from "../middleware/auth.middleware";
import { isSupplier } from "../middleware/role.middleware";

const router = Router();

// Get all supplier products
router.get(
  "/supplier",
  authenticateJWT,
  isSupplier,
  productController.getSupplierProducts
);

// Get product by ID
router.get("/:productId", authenticateJWT, productController.getProductById);

// create product
router.post("/", authenticateJWT, isSupplier, productController.createProduct);

// Update product
router.put(
  "/:productId",
  authenticateJWT,
  isSupplier,
  productController.updateProduct
);

// Delete product
router.delete(
  "/:productId",
  authenticateJWT,
  isSupplier,
  productController.deleteProduct
);

// /**
//  * @dev unused route
//  */
// // Delete all products
// router.delete(
//   "/",
//   authenticateJWT,
//   isSupplier,
//   productController.deleteAllProducts
// );

export default router;
