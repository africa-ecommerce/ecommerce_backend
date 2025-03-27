// src/controllers/logistics.controller.ts
import { Request, Response } from "express";
import { initiateLogisticsRequest } from "../services/logistics.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const logisticsRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, warehouseId, pickupLocation, deliveryLocation } = req.body;
    const result = await initiateLogisticsRequest(
      orderId,
      warehouseId,
      pickupLocation,
      deliveryLocation
    );
    res.json({ logistics: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
