import express from "express";
import { getProductById } from "../controllers/publicProduct.controller";
const router = express.Router();

// Get all supplier products
router.get("/", getProductById);

export default router;
