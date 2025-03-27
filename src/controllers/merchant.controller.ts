// src/controllers/merchant.controller.ts
import { Request, Response } from "express";
import {
  getMerchantProfile,
  updateMerchantProfile,
} from "../services/merchant.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const profile = await getMerchantProfile(merchantId);
    res.json({ profile });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const data = req.body;
    const updatedProfile = await updateMerchantProfile(merchantId, data);
    res.json({ updatedProfile });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
