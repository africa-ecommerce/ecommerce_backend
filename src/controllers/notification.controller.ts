// src/controllers/notification.controller.ts
import { Request, Response } from "express";
import {
  sendNotification,
  sendInAppNotification,
  sendEmailNotification,
  sendSMSNotification,
} from "../services/notification.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const notify = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const { message } = req.body;
    await sendNotification(merchantId, message);
    res.json({ message: "Notification sent" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};



export const notifyInApp = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const { message } = req.body;
    await sendInAppNotification(merchantId, message);
    res.json({ message: 'In-App notification sent' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const notifyEmail = async (req: AuthRequest, res: Response) => {
  try {
    // Assume merchant email is available in the auth token
    const { email } = req.merchant;
    const { subject, message } = req.body;
    await sendEmailNotification(email, subject, message);
    res.json({ message: 'Email notification sent' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const notifySMS = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, message } = req.body;
    await sendSMSNotification(phone, message);
    res.json({ message: 'SMS notification sent' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

