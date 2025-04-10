// src/routes/product.routes.ts
import express from "express";
import { productController } from "../controllers/product.controller";
import authenticateJWT from "../middleware/auth.middleware";


const router = express.Router();

// All routes require authentication
router.use(authenticateJWT);

// Create a new product
router.post("/", productController.createProduct);

// Public route for getting all products - no authentication required
router.get("/", productController.getAllProducts);

// Get products by supplier ID
router.get("/supplier/:supplierId", productController.getSupplierProducts);

// Get product by ID
router.get("/:productId", productController.getProductById);

// Update product
router.put("/:productId", productController.updateProduct);

// Delete product
router.delete("/:productId", productController.deleteProduct);

export default router;
