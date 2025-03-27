// src/middleware/subscriptionCheck.middleware.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config";

export const subscriptionCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract subdomain from request hostname. For example, if hostname is merchant1.africonnect.com
    const host = req.hostname; // e.g., merchant1.africonnect.com
    const subdomain = host.split(".")[0];

    // Find merchant website by subdomain
    const website = await prisma.website.findUnique({
      where: { subdomain },
      include: { merchant: true },
    });

    if (!website) {
      return res.status(404).send("Website not found");
    }

    // Check subscription status – assume merchant has a subscription field in your Merchant model or via separate subscription model.
    // For demonstration, we assume that the merchant model has a "subscriptionActive" boolean flag.
    // You might instead call a function like: await isSubscriptionActive(website.merchantId)
    const isActive = true; // Replace with actual logic

    if (!isActive) {
      return res
        .status(403)
        .send(
          "Website access restricted due to overdue payment. Please renew your subscription."
        );
    }

    // Attach website info for later use if needed
    (req as any).website = website;
    next();
  } catch (error: any) {
    res.status(500).send("Internal server error");
  }
};
