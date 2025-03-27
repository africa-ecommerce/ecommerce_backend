// src/routes/search.routes.ts
import { Router } from "express";
import {
  productSearch,
  merchantSearch,
} from "../controllers/search.controller";

const router = Router();

router.get("/products", productSearch);
router.get("/merchants", merchantSearch);

export default router;
