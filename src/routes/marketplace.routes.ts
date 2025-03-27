// src/routes/marketplace.routes.ts
import { Router } from "express";
import {
  getMerchants,
  getMarketplaceProducts,
} from "../controllers/marketplace.controller";

const router = Router();

router.get("/merchants", getMerchants);
router.get("/products", getMarketplaceProducts);

export default router;
