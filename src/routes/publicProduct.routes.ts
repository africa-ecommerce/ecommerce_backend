import { Router } from "express";
import { getProductById } from "../controllers/publicProduct.controller";
const router = Router();
// This route handles fetching a specific product by its ID for a specific plug.

// Get all supplier products
router.get("/:plugId/:productId", getProductById);

export default router;
