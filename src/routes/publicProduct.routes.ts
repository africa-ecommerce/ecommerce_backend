import { Router } from "express";
import { getProductById } from "../controllers/publicProduct.controller";
const router = Router();
// This route handles fetching a specific product by its ID for a specific plug.
router.get("/:productId/:plugId", getProductById);

export default router;
