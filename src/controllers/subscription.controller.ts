// src/controllers/subscription.controller.ts
import { Request, Response } from "express";
import {
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
} from "../services/subscription.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { SubscriptionTier } from "@prisma/client";

export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const { tier, endDate } = req.body;
    // Validate tier input
    if (!Object.values(SubscriptionTier).includes(tier)) {
      return res.status(400).json({ error: "Invalid subscription tier" });
    }
    const subscription = await createSubscription(merchantId, {
      tier,
      endDate: new Date(endDate),
    });
    res.status(201).json({ subscription });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getSubscriptionStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const merchantId = req.merchant.id;
    const subscription = await getSubscription(merchantId);
    if (!subscription)
      return res.status(404).json({ error: "No subscription found" });
    res.json({ subscription });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const changeSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const { tier, endDate } = req.body;
    const updatedSubscription = await updateSubscription(merchantId, {
      tier,
      endDate: new Date(endDate),
    });
    res.json({ subscription: updatedSubscription });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const cancelSub = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const subscription = await cancelSubscription(merchantId);
    res.json({ subscription });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
