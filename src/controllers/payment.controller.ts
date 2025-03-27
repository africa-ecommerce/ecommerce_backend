// src/controllers/payment.controller.ts
import { Request, Response } from "express";
import { initiateFlutterwavePayment } from "../services/payment.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const initiatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, amount, customerEmail } = req.body;
    const paymentResponse = await initiateFlutterwavePayment(
      orderId,
      amount,
      customerEmail
    );
    res.json(paymentResponse);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
