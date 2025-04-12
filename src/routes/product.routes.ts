// src/routes/product.routes.ts
import express from "express";
import { productController } from "../controllers/product.controller";
import authenticateJWT from "../middleware/auth.middleware";
import { isSupplier } from "../middleware/role.middleware";

const router = express.Router();

router.get("/", authenticateJWT, productController.getAllProducts);

// Get product by ID
router.get("/:productId", authenticateJWT, productController.getProductById);

// Middleware to ensure user is authenticated and is a plug
const supplierAuth = [authenticateJWT, isSupplier];

router.use(supplierAuth);

// Create a new product
router.post("/", productController.createProduct);

// Get products by supplier ID
router.get("/supplier", productController.getSupplierProducts);

// Update product
router.put("/:productId", productController.updateProduct);

// Delete product
router.delete("/:productId", productController.deleteProduct);

export default router;
