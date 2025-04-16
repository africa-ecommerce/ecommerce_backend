// src/routes/product.routes.ts
import express from "express";
import { productController } from "../controllers/product.controller";
import authenticateJWT from "../middleware/auth.middleware";
import { isSupplier } from "../middleware/role.middleware";

const router = express.Router();


router.get("/supplier", authenticateJWT, isSupplier, productController.getSupplierProducts);

router.get("/", authenticateJWT, productController.getAllProducts);

// Get product by ID
router.get("/:productId", authenticateJWT, productController.getProductById);

// Middleware to ensure user is authenticated and is a plug
// const supplierAuth = [authenticateJWT, isSupplier];

// router.use(supplierAuth);

// Create a new product
router.post("/", authenticateJWT, isSupplier, productController.createProduct);

// Get products for a supplier

// Update product
router.put("/:productId", authenticateJWT, isSupplier, productController.updateProduct);

// Delete product
router.delete("/:productId", authenticateJWT, isSupplier, productController.deleteProduct);

// Delete all products
router.delete("/", authenticateJWT, isSupplier, productController.deleteAllProducts);

export default router;
