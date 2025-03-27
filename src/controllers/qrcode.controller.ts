// src/controllers/qrcode.controller.ts
import { Request, Response } from "express";
import { generateStoreQRCode } from "../services/qrcode.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const getQRCode = async (req: AuthRequest, res: Response) => {
  try {
    // For demonstration, assume each merchant has a storefront at: merchantID.africonnect.com
    const merchantId = req.merchant.id;
    const storeUrl = `https://${merchantId}.africonnect.com`;
    const qrCodeDataUrl = await generateStoreQRCode(storeUrl);
    res.json({ qrCode: qrCodeDataUrl });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
