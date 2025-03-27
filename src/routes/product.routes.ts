// src/routes/product.routes.ts
import { Router } from "express";
import {
  addProduct,
  getProducts,
  modifyProduct,
  removeProduct,
} from "../controllers/product.controller";
import { authenticateJWT } from "../middleware/auth.middleware";
import { cache } from "../middleware/cache.middleware";

const router = Router();

// Protected endpoints for product management
router.post("/", authenticateJWT, addProduct);
// Cache product list for 60 seconds
router.get("/", authenticateJWT, cache("products", 60), getProducts);
router.put("/:id", authenticateJWT, modifyProduct);
router.delete("/:id", authenticateJWT, removeProduct);


// // Handle local units like "derica"
// router.post('/', [
//   authMiddleware,
//   validateProduct,
//   checkInventory,
//   syncPhysicalStore
// ], createProduct);

// // Bulk CSV import
// router.post('/import', [
//   authMiddleware,
//   upload.single('file'),
//   parseCSV,
//   validateBulkProducts
// ], importProducts);

export default router;
