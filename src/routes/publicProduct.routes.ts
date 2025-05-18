import { Router } from "express";
import { getProductById } from "../controllers/publicProduct.controller";
const router = Router();

// Get all supplier products
router.post("/", getProductById);

export default router;
