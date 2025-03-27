// src/controllers/whatsapp.controller.ts
import { Request, Response } from "express";
import { processWhatsAppProduct } from "../services/whatsapp.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const whatsappProductUpload = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const merchantId = req.merchant.id;
    const message = req.body; // Expected payload: { photoUrl, details: { title, description, price, inventory } }
    const product = await processWhatsAppProduct(merchantId, message);
    res.status(201).json({ product });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
