// src/routes/website.routes.ts
import { Router } from "express";
import {
  createOrUpdateWebsite,
  fetchWebsite,
  removeWebsite,
} from "../controllers/website.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();

// Protected endpoints for website management
router.post("/", authenticateJWT, createOrUpdateWebsite);
router.get("/", authenticateJWT, fetchWebsite);
router.delete("/", authenticateJWT, removeWebsite);

export default router;
