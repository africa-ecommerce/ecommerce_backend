import { Response, NextFunction } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nanoid6 = customAlphabet(alphabet, 6);

export const upsertSupplierChannel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplierId = req.supplier?.id!;
    const {
      payOnDelivery,
      returnPolicy,
      returnWindow,
      returnPolicyTerms,
      refundPolicy,
      returnShippingFee,
      supplierShare,
      phone,
      whatsapp,
      telegram,
      instagram,
    } = req.body;

    // ✅ Basic validation
    if (
      typeof payOnDelivery !== "boolean" ||
      typeof returnPolicy !== "boolean" 
    ) {
      res.status(400).json({ error: "Invalid or missing required fields!" });
      return;
    }

    // ✅ Validate return window
    if (returnWindow && (isNaN(returnWindow) || returnWindow < 1)) {
      res
        .status(400)
        .json({ error: "Return window must be a positive integer!" });
      return;
    }

    // 🧩 Check if channel already exists for this supplier
    const existing = await prisma.channel.findUnique({ where: { supplierId } });

    let channelId = existing?.channelId;

    // 🆕 If not exists, generate a new channelId
    if (!channelId) {
      const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      channelId = `CH-${datePart}-${nanoid6()}`;
    }

    // ⚡ Upsert channel data
    const channel = await prisma.channel.upsert({
      where: { supplierId },
      update: {
        payOnDelivery,
        returnPolicy,
        returnWindow,
        returnPolicyTerms,
        refundPolicy,
        returnShippingFee,
        supplierShare,
        phone,
        whatsapp,
        telegram,
        instagram,
      },
      create: {
        supplierId,
        channelId,
        payOnDelivery,
        returnPolicy,
        returnWindow,
        returnPolicyTerms,
        refundPolicy,
        returnShippingFee,
        supplierShare,
        phone,
        whatsapp,
        telegram,
        instagram,
      },
    });

  

    res.status(200).json({
      message: existing
        ? "Channel updated successfully!"
        : "Channel created successfully!",
      data: channel
    });
  } catch (error) {
    next(error);
  }
};

export const getSupplierChannel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplierId = req.supplier?.id;

   const channel = await prisma.channel.findFirst({
     where: { supplierId, disabled: false },
   });

    if (!channel) {
      res.status(404).json({ error: "Channel not found!" });
      return;
    }

    res.status(200).json({ data: channel });
  } catch (error) {
    next(error);
  }
};

export const disableSupplierChannel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplierId = req.supplier?.id;

    // ✅ Check if channel exists
    const existing = await prisma.channel.findUnique({ where: { supplierId } });
    if (!existing) {
      res.status(404).json({ error: "Channel not found!" });
      return;
    }

    // ⚡ Instead of deleting, mark as disabled
    await prisma.channel.update({
      where: { supplierId },
      data: { disabled: true },
    });

    res.status(200).json({ message: "Channel disabled successfully!" });
  } catch (error) {
    next(error);
  }
};