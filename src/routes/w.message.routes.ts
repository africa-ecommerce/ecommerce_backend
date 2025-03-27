// src/routes/whatsapp.message.routes.ts
import { Router } from "express";
import {
  receiveWhatsAppMessage,
  getWhatsAppMessagesForMerchant,
} from "../controllers/w.message.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();

/**
 * Public webhook endpoint to receive WhatsApp messages.
 * (If needed, you can secure this endpoint with a secret token or IP filtering.)
 */
router.post("/webhook", receiveWhatsAppMessage);

/**
 * Protected endpoint for merchants to fetch their received WhatsApp messages.
 */
router.get("/messages", authenticateJWT, getWhatsAppMessagesForMerchant);

export default router;
