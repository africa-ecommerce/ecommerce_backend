import express from "express";
import { productController } from "../controllers/product.controller";
import authenticateJWT from "../middleware/auth.middleware";
import { isSupplier } from "../middleware/role.middleware";

const router = express.Router();

// Middleware to ensure user is authenticated and is a supplier
const supplierAuth = [authenticateJWT, isSupplier];

router.use(supplierAuth);

// Get all supplier products
router.get("/supplier", productController.getSupplierProducts);

// Get product by ID
router.get("/:productId", productController.getProductById);

// create product
router.post("/", productController.createProduct);

// Update product
router.put("/:productId", productController.updateProduct);

// Delete product
router.delete("/:productId", productController.deleteProduct);

// Delete all products
router.delete("/", productController.deleteAllProducts);

export default router;
