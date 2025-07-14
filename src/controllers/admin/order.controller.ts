import { Request, Response } from "express";
import { prisma } from "../../config";
// import { sendOrderMail } from "../../helper/mail/sendOrderMail";
import { scheduleOrderPaymentProcessing } from "../../helper/workers/paymentProcessor";
import { shippedOrderMail } from "../../helper/mail/order/shippedOrderMail";
import { deliveredOrderMail } from "../../helper/mail/order/deliveredOrderMail";


export const shippedOrder = async (req: Request, res: Response) => {
  try {
    const { orderId} = req.body;

    if (!orderId) {
      res.status(400).json({ error: "Order ID is required!" });
      return;
    }

    const order = await prisma.order.update({
      where: { id: orderId, status: "PENDING" },
      data: { status: "SHIPPED" },
    });

    // Respond immediately
    res.status(200).json({
      message: "Order status updated successfully!",
      data: { status: "SHIPPED" },
    });

    // Background mail process
    setImmediate(() => {
      shippedOrderMail(order.buyerEmail, order.buyerName, order.orderNumber).catch(
        (error) => {
          console.error("Failed to send shipped order email:", error);
        }
      );
    });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: "Internal server error!" });
  }
};

// CALLED WHEN ORDER IS DELIVERED I.E LOGISTICS PARTNER HAS DELIVERED THE ORDER TO THE BUYER
export const deliveredOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ error: "Order ID is required!" });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId, status: "SHIPPED" },
      include: { orderItems: true },
    });

    if (!order) {
      res.status(404).json({ error: "Order not found!" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Calculate plug profit
      const plugProfit = order.orderItems.reduce((sum, item) => {
        return sum + (item.plugPrice! - item.supplierPrice!) * item.quantity;
      }, 0);
    
      // Each supplier mapped to their total amount
      const supplier: Record<string, number> = {};
    
      for (const item of order.orderItems) {
        const amount = item.supplierPrice! * item.quantity;
        const supplierId = item.supplierId!;
        supplier[supplierId] = (supplier[supplierId] || 0) + amount;
      }
    
      // Mark order as delivered
      await tx.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED", updatedAt: new Date() },
      });
    
      // Update sold count for products and variants
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            sold: {
              increment: item.quantity,
            },
          },
        });
      }
    
      // Create plug payment
      await tx.plugPayment.create({
        data: {
          orderId,
          plugId: order.plugId,
          amount: plugProfit,
          status: "LOCKED",
        },
      });
    
      // Create supplier payments
      for (const [supplierId, amount] of Object.entries(supplier)) {
        await tx.supplierPayment.create({
          data: {
            orderId,
            supplierId,
            amount,
            status: "LOCKED",
          },
        });
      }
    
      return order;
    });
    
    // Schedule payment processing for 3 days later
    const deliveryDate = new Date(result.updatedAt);
    await scheduleOrderPaymentProcessing(orderId, deliveryDate);

    res.status(200).json({
      message: "Order marked as delivered and payments locked for 3 days.",
      data: {
        status: "DELIVERED",
        paymentDate: new Date(
          deliveryDate.getTime() + 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });

    if (req.body.buyerEmail && req.body.buyerName) {
      setImmediate(() =>
        deliveredOrderMail(
          req.body.buyerEmail,
          req.body.buyerName,
          orderId
        ).catch((err) => console.error("Delivered order mail error:", err))
      );
    }
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: "Internal server error!" });
  }
};


// This function pauses an order item, deducting the amounts from plug and supplier payments, AFTER A RETURN REQUEST BY THE BUYER
export const pauseOrderItem = async (req: Request, res: Response) => {
  try {
    const { orderItemId, quantity } = req.body;

    if (!orderItemId || !quantity || quantity <= 0) {
      return res
        .status(400)
        .json({ error: "orderItemId and valid quantity required" });
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });
    if (!orderItem)
      return res.status(404).json({ error: "OrderItem not found" });

    const existingPause = await prisma.pausedOrderItem.findUnique({
      where: { orderItemId },
    });
    if (existingPause)
      return res.status(400).json({ error: "OrderItem already paused" });

    const plugAmount =
      (orderItem.plugPrice! - orderItem.supplierPrice!) * quantity;
    const supplierAmount = orderItem.supplierPrice! * quantity;

    await prisma.$transaction(async (tx) => {
      await tx.pausedOrderItem.create({
        data: { orderItemId, quantity },
      });

      // Deduct from plugPayment
      await tx.plugPayment.update({
        where: {
          orderId: orderItem.orderId,
          //compulsory --------------------->
          plugId: orderItem.plugId!,
          status: "LOCKED",
        },
        data: { amount: { decrement: plugAmount } },
      });

      const supplierPayment = await tx.supplierPayment.findFirst({
        where: {
          orderId: orderItem.orderId,
          supplierId: orderItem.supplierId!,
          status: "LOCKED",
        },
      });

      await tx.supplierPayment.update({
        where: {
          id: supplierPayment!.id,
        },
        data: { amount: { decrement: supplierAmount } },
      });
    });

    res.status(200).json({ message: "Order item paused successfully" });
  } catch (err) {
    console.error("Pause error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// This function unpauses an order item, restoring amounts to plug and supplier payments, AFTER A RETURN REQUEST BY THE BUYER, ORDER ITEM MUST BE PAUSED
export const unpauseOrderItem = async (req: Request, res: Response) => {
  try {
    const { orderItemId, quantity } = req.body;

    if (!orderItemId || !quantity || quantity <= 0) {
      return res
        .status(400)
        .json({ error: "orderItemId and valid quantity required" });
    }

    const pauseRecord = await prisma.pausedOrderItem.findUnique({
      where: { orderItemId },
    });

    if (!pauseRecord || pauseRecord.quantity < quantity) {
      return res.status(400).json({ error: "Invalid unpause quantity" });
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    if (!orderItem) {
      return res.status(404).json({ error: "Order item not found" });
    }

    const plugAmount =
      (orderItem.plugPrice! - orderItem.supplierPrice!) * quantity;
    const supplierAmount = orderItem.supplierPrice! * quantity;

    await prisma.$transaction(async (tx) => {
      // Handle PlugPayment
      const plugPayment = await tx.plugPayment.findFirst({
        where: {
          orderId: orderItem.orderId,
          plugId: orderItem.plugId!,
        },
      });

      if (plugPayment?.status === "PAID") {
        await tx.resolvePlugPayment.create({
          data: {
            orderItemId,
            orderId: orderItem.orderId,
            plugId: orderItem.plugId!,
            amount: plugAmount,
          },
        });
      } else {
        await tx.plugPayment.update({
          where: {
            id: plugPayment!.id,
          },
          data: {
            amount: {
              increment: plugAmount,
            },
          },
        });
      }

      // Handle SupplierPayment
      const supplierPayment = await tx.supplierPayment.findFirst({
        where: {
          orderId: orderItem.orderId,
          supplierId: orderItem.supplierId!,
        },
      });

      if (supplierPayment?.status === "PAID") {
        await tx.resolveSupplierPayment.create({
          data: {
            orderItemId,
            orderId: orderItem.orderId,
            supplierId: orderItem.supplierId!,
            amount: supplierAmount,
          },
        });
      } else {
        await tx.supplierPayment.update({
          where: {
            id: supplierPayment!.id,
          },
          data: {
            amount: {
              increment: supplierAmount,
            },
          },
        });
      }

      // Remove or decrement pause record
      if (pauseRecord.quantity === quantity) {
        await tx.pausedOrderItem.delete({ where: { orderItemId } });
      } else {
        await tx.pausedOrderItem.update({
          where: { orderItemId },
          data: { quantity: { decrement: quantity } },
        });
      }
    });

    return res
      .status(200)
      .json({ message: "Order item unpaused and payment adjusted" });
  } catch (err) {
    console.error("Unpause error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// This function handles returning an order item, updating paused and returned records, and adjusting payments
export const returnOrderItem = async (req: Request, res: Response) => {
  try {
    const { orderItemId, quantity } = req.body;

    const pause = await prisma.pausedOrderItem.findUnique({
      where: { orderItemId },
    });
    if (!pause || pause.quantity < quantity) {
      return res
        .status(400)
        .json({ error: "OrderItem not paused or quantity exceeds pause" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.returnedOrderItem.create({
        data: { orderItemId, quantity },
      });

      if (pause.quantity === quantity) {
        await tx.pausedOrderItem.delete({ where: { orderItemId } });
      } else {
        await tx.pausedOrderItem.update({
          where: { orderItemId },
          data: { quantity: { decrement: quantity } },
        });
      }
    });

    res.status(200).json({ message: "Order item returned successfully" });
  } catch (err) {
    console.error("Return error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
