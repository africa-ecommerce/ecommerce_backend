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
      deliveryLocations = [], // ✅ Expect array from frontend
    } = req.body;

    // ✅ Basic validation
    if (
      typeof payOnDelivery !== "boolean" ||
      typeof returnPolicy !== "boolean"
    ) {
       res
        .status(400)
        .json({ error: "Invalid or missing required fields!" });
        return;
    }

    // ✅ Validate return window
    if (returnWindow && (isNaN(returnWindow) || returnWindow < 1)) {
       res
        .status(400)
        .json({ error: "Return window must be a positive integer!" });
        return;
    }

    // ✅ Validate deliveryLocations type
    if (!Array.isArray(deliveryLocations)) {
       res
        .status(400)
        .json({ error: "deliveryLocations must be an array" });
        return
    }

    // 🧩 Fetch existing channel if any
    const existing = await prisma.channel.findUnique({
      where: { supplierId },
      include: { deliveryLocations: true },
    });

    let channelId = existing?.channelId;

    // 🆕 Generate new channel ID if needed
    if (!channelId) {
      const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      channelId = `CH-${datePart}-${nanoid6()}`;
    }

    // ⚙️ Perform the upsert in a transaction for safety
    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Upsert or create the channel itself
      const channel = await tx.channel.upsert({
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

      // 2️⃣ Replace all delivery locations (transactional)
      await tx.channelDeliveryLocation.deleteMany({
        where: { channelId: channel.id },
      });

      if (deliveryLocations.length > 0) {
        await tx.channelDeliveryLocation.createMany({
          data: deliveryLocations.map((loc: any) => ({
            channelId: channel.id,
            state: loc.state,
            lgas: loc.lgas,
            fee: loc.fee,
            duration: loc.duration
          })),
        });
      }

      // 3️⃣ Return the fully updated record
      const updated = await tx.channel.findUnique({
        where: { id: channel.id },
        include: { deliveryLocations: true },
      });

      return updated;
    });

    res.status(200).json({
      message: existing
        ? "Channel updated successfully!"
        : "Channel created successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Error in upsertSupplierChannel:", error);
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
     include: { deliveryLocations: true },
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