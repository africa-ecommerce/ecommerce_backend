import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config";
import { formatPlugOrders} from "../../helper/formatData";

export async function getOrderItemByOrderNumber(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { orderNumber } = req.params;

    const orders = await prisma.order.findMany({
      where: {
        orderNumber,
      },
      include: {
        orderItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!orders) {
      res
        .status(404)
        .json({ error: "No orders found with this order number!" });
      return;
    }

    const data = formatPlugOrders(orders);
    res.status(200).json({
      message: "Orders fetched successfully!",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export const manageOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { orderId, updatedItems } = req.body;

  if (!orderId) {
    res.status(400).json({ error: "Order ID is required!" });
    return;
  }

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!existingOrder) {
      res.status(404).json({ error: "Order not found!" });
      return;
    }

    if (existingOrder.status !== "PENDING") {
      res.status(400).json({ error: "Only pending orders can be cancelled!" });
      return;
    }

    const existingItemsMap = new Map();
    for (const item of existingOrder.orderItems) {
      existingItemsMap.set(item.id, item);
    }

    const updatedItemIds = new Set(updatedItems?.map((item: any) => item.id));

    const removedItems = existingOrder.orderItems.filter(
      (item) => !updatedItemIds.has(item.id)
    );

    await prisma.$transaction(async (tx) => {
      // Update stocks for removed items
      for (const removed of removedItems) {
        await tx.product.update({
          where: { id: removed.productId },
          data: {
            stock: { increment: removed.quantity },
          },
        });

        if (removed.variantId) {
          await tx.productVariation.update({
            where: {
              id: removed.variantId,
              productId: removed.productId,
            },
            data: {
              stock: { increment: removed.quantity },
            },
          });
        }
      }

      // Remove items from DB
      if (removedItems.length > 0) {
        await tx.orderItem.deleteMany({
          where: {
            id: { in: removedItems.map((i) => i.id) },
          },
        });
      }

      // If all items are removed, cancel the order
      const remainingItems = await tx.orderItem.findMany({
        where: { orderId },
      });

      if (remainingItems.length === 0) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED" },
        });
        res.status(200).json({
          message: "Order cancelled successfully!",
          data: { status: "CANCELLED" },
        });
        return;
      }
      // Else, return updated items
      res.status(200).json({
        message: "Order updated successfully!",
        data: { remainingItems },
      });
    });
  } catch (err) {
    next(err);
  }
};
