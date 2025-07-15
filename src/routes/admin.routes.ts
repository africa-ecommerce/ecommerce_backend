import { Router } from "express";
import { productController } from "../controllers/product.controller";
import authenticateJWT from "../middleware/auth.middleware";
import { isSupplier } from "../middleware/role.middleware";
import { getAllSuppliers } from "../controllers/admin/user.controller";
import { adminProductController } from "../controllers/admin/product.controller";

const router = Router();

// Get all supplier products
router.get(
  "/user/suppliers",
  getAllSuppliers
)

// Get product by ID
router.post("/product/:supplierId", adminProductController.createProduct);
// Update product
router.put("/product/:supplierId/:productId", adminProductController.updateProduct);

// Delete product
router.delete(
  "/product/:supplierId/:productId",
  adminProductController.deleteProduct
);

export default router;

