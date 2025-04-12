// src/routes/search.routes.ts
import express from "express";
import { searchController } from "../controllers/search.controller";
import authenticateJWT from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticateJWT);
// Public search routes
router.get("/products", searchController.searchProducts);
router.get("/plugs", searchController.searchPlugs);


router.get(
  "/supplier/:supplierId/products",
  searchController.searchSupplierProducts
);

export default router;
