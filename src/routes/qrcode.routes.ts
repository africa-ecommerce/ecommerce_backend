// src/routes/qrcode.routes.ts
import { Router } from "express";
import { getQRCode } from "../controllers/qrcode.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();

// Protected endpoint to get the QR code for a merchant's storefront
router.get("/", authenticateJWT, getQRCode);

export default router;
// The qrcode.routes.ts file defines a single protected endpoint that returns the QR code for a merchant's storefront. This endpoint requires a valid JWT to be included in the request headers.