import express from "express";
import { generateShortLink, linkHandler } from "../controllers/links.controller.js";
import authenticateJWT from "../middleware/auth.middleware";
import { isPlug } from "../middleware/role.middleware";
const router = express.Router();

// This route handles generating a short link for plugs
router.post("/generate", authenticateJWT, generateShortLink);
router.get("/:slug", linkHandler);

export default router;

