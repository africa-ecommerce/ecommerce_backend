import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config";
import { scheduleOrderPaymentProcessing } from "../../helper/workers/paymentProcessor";
import { shippedOrderMail } from "../../helper/mail/order/shippedOrderMail";
import { deliveredOrderMail } from "../../helper/mail/order/deliveredOrderMail";
import { OrderStatus } from "@prisma/client";
import { formatPlugOrders } from "../../helper/formatData";


export async function getOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const status = (req.query.orderStatus as string | undefined)?.toUpperCase();
    const where: any = { };
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      where.status = status as OrderStatus;
    }
    const orders = await prisma.order.findMany({
      where,
      include: {
        orderItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const data = orders ? formatPlugOrders(orders) : [];
    res.status(200).json({
      message: "Orders fetched successfully!",
      data,
    });
    return;
  } catch (error) {
    next(error)
  }
}


export async function getOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // 1. Collect supplierIds, filter out nulls properly
    const supplierIds: string[] = order.orderItems
      .map((i) => i.supplierId)
      .filter((id): id is string => !!id);

    // 2. Fetch suppliers with pickupLocation
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      include: { pickupLocation: true }, 
    });

    // 3. Group items under suppliers
    const supplierMap = order.orderItems.reduce((acc, item) => {
      if (!item.supplierId) return acc;

      if (!acc[item.supplierId]) {
        const s = suppliers.find((sup) => sup.id === item.supplierId);
        if (s) {
          acc[item.supplierId] = {
            supplierId: s.id,
            businessName: s.businessName,
            phone: s.phone,
            address: s.pickupLocation?.streetAddress || null,
            state: s.pickupLocation?.state || null,
            lga: s.pickupLocation?.lga || null,
            directions: s.pickupLocation?.directions || null,
            orderItems: [],
          };
        }
      }

      acc[item.supplierId]?.orderItems.push({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        plugPrice: item.plugPrice,
        supplierPrice: item.supplierPrice,
        productSize: item.productSize,
        productColor: item.productColor,
        variantId: item.variantId,
        variantSize: item.variantSize,
        variantColor: item.variantColor,
      });

      return acc;
    }, {} as Record<string, any>);

    // 4. Send response
    res.status(200).json({
      suppliers: Object.values(supplierMap),
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyer: {
        name: order.buyerName,
        email: order.buyerEmail,
        phone: order.buyerPhone,
        address: order.buyerAddress,
        state: order.buyerState,
        lga: order.buyerLga,
        directions: order.buyerDirections,
      },
      deliveryType: order.deliveryType,
      terminalAddress: order.terminalAddress,
      totalAmount: order.totalAmount,
      deliveryFee: order.deliveryFee,
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error!" });
  }
}


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

    try {
      await shippedOrderMail(
        order.buyerEmail,
        order.buyerName,
        order.orderNumber,
        order.deliveryType,
        order.terminalAddress
      );
    } catch (error) {
      console.error("Failed to send shipped order email:", error);
    }

    // Respond immediately
    res.status(200).json({
      message: "Order status updated successfully!",
      data: { status: "SHIPPED" },
    });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: "Internal server error!" });
  }
};


//product or other things should be removed against throw, so first check id
//dont use plug product
export const deliveredOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
       res.status(400).json({ error: "Order ID is required!" });
       return;
    }
    const order = await prisma.order.findFirst({
      where: { id: orderId, status: "SHIPPED" },
      include: { orderItems: true },
    });

    if (!order) {
       res.status(404).json({ error: "Order not found!" });
       return;
    }

    const result = await prisma.$transaction(async (tx) => {
      let plugNetAmount = 0;
      let supplierTotalAmount = 0;

      for (const item of order.orderItems) {
       
        const itemTotal = (item.plugPrice ?? 0) * item.quantity;
        const supplierAmount = (item.supplierPrice ?? 0) * item.quantity;

        supplierTotalAmount += supplierAmount;

        // Calculate plug margin (profit before commission)
        const plugMargin = itemTotal - supplierAmount;

        // Apply commission 
        const commissionAmount =
          (plugMargin * (item.commission ?? 0)) / 100;

        // Net amount for the plug
        plugNetAmount += plugMargin - commissionAmount;
      }

      // Update order as delivered
      await tx.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED", updatedAt: new Date() },
      });

      // Update sold count
      for (const item of order.orderItems) {
        //this check product first
        try {
          await tx.product.update({
            where: { id: item.productId },
            data: { sold: { increment: item.quantity } },
          });
        } catch (e) {
          console.error(`Product ${item.productId} not found, skipping update ${e}`);
        }
      }

      // Create plug payment
      await tx.plugPayment.create({
        data: {
          orderId,
          plugId: order.plugId,
          amount: plugNetAmount,
          status: "LOCKED",
        },
      });

      // Create supplier  payments only for received items
      await tx.supplierPayment.createMany({
        data: order.orderItems
          .filter((i) => i.recieved)
          .map((item) => ({
            orderId,
            supplierId: item.supplierId!,
            amount: (item.supplierPrice ?? 0) * item.quantity,
            status: "LOCKED",
          })),
      });

      return order;
    });

    // Schedule payment release after 3 days
    const deliveryDate = new Date(result.updatedAt);
    await scheduleOrderPaymentProcessing(orderId, deliveryDate);

    try {
      await deliveredOrderMail(
        order.buyerEmail,
        order.buyerName,
        order.orderNumber,
        order.deliveryType,
        order.terminalAddress
      );
    } catch (error) {
      console.error("Failed to send delivered order email:", error);
    }

    res.status(200).json({
      message:
        "Order marked as delivered. Plug and supplier payments locked for 3 days.",
      data: {
        status: "DELIVERED",
        paymentDate: new Date(
          deliveryDate.getTime() + 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });
  
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: "Internal server error!" });
  }
};


export const getPausedOrderItems = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
       res.status(400).json({ error: "Order ID is required" });
       return;
    }

    const pausedItems = await prisma.pausedOrderItem.findMany({
      where: { orderItem: { orderId } },
      include: {
        orderItem: {
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            plugPrice: true,
            supplierPrice: true,
            recieved: true,
          },
        },
      },
    });

    res.status(200).json({
      message: "Paused order items fetched successfully",
      data: pausedItems,
    });
  } catch (err) {
    console.error("Get paused order items error:", err);
    res.status(500).json({ error: "Internal server error!" });
  }
};
export const getReturnedOrderItems = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
       res.status(400).json({ error: "Order ID is required" });
       return;
    }

    const returnedItems = await prisma.returnedOrderItem.findMany({
      where: { orderItem: { orderId } },
      include: {
        orderItem: {
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            plugPrice: true,
            supplierPrice: true,
            recieved: true,
          },
        },
      },
    });

    res.status(200).json({
      message: "Returned order items fetched successfully",
      data: returnedItems,
    });
  } catch (err) {
    console.error("Get returned order items error:", err);
    res.status(500).json({ error: "Internal server error!" });
  }
};

// This function pauses an order item, deducting the amounts from plug and supplier payments, AFTER A RETURN REQUEST BY THE BUYER
export const pauseOrderItem = async (req: Request, res: Response) => {
  try {
    const { orderItemId, quantity } = req.body;


    if (!orderItemId || !quantity || quantity <= 0) {
       res
        .status(400)
        .json({ error: "orderItemId and valid quantity required" });
        return;
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });
    if (!orderItem){
      res.status(404).json({ error: "OrderItem not found" });
      return;
    }
      
    const existingPause = await prisma.pausedOrderItem.findUnique({
      where: { orderItemId },
    });
    if (existingPause){
       res.status(400).json({ error: "OrderItem already paused" });
       return;
    }
     
    const plugPrice = Number(orderItem.plugPrice ?? 0);
    const supplierPrice = Number(orderItem.supplierPrice ?? 0);
    const commission = Number(orderItem.commission ?? 0);

const plugAmount = (plugPrice - supplierPrice - commission) * quantity;
const supplierAmount = supplierPrice * quantity;    

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

       // ✅ Supplier logic only if item was received
      if (orderItem.recieved) {
      const supplierPayment = await tx.supplierPayment.findFirst({
        where: {
          orderId: orderItem.orderId,
          supplierId: orderItem.supplierId!,
          status: "LOCKED",
        },
      });

      // Deduct from that specific order payment supplierPayment for that supplier, cause the supplier 
      await tx.supplierPayment.update({
        where: {
          id: supplierPayment!.id,
        },
        data: { amount: { decrement: supplierAmount } },
      });
        }
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
       res
        .status(400)
        .json({ error: "orderItemId and valid quantity required" });
        return;
    }

    const pauseRecord = await prisma.pausedOrderItem.findUnique({
      where: { orderItemId },
    });

    if (!pauseRecord || pauseRecord.quantity < quantity) {
       res.status(400).json({ error: "Invalid unpause quantity" });
       return;
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    if (!orderItem) {
       res.status(404).json({ error: "Order item not found" });
       return;
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
       // ✅ Supplier logic only if item was received
      if (orderItem.recieved) {
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

     res
      .status(200)
      .json({ message: "Order item unpaused and payment adjusted" });
  } catch (err) {
    console.error("Unpause error:", err);
     res.status(500).json({ error: "Internal server error" });
  }
};


// This function handles returning an order item, updating paused and returned records, 
// adjusting product sold count when items are returned
export const returnOrderItem = async (req: Request, res: Response) => {
  try {
    const { orderItemId, quantity } = req.body;

    if (!orderItemId || !quantity || quantity <= 0) {
       res.status(400).json({ error: "orderItemId and valid quantity required" });
       return
    }

    const pause = await prisma.pausedOrderItem.findUnique({
      where: { orderItemId },
    });

    if (!pause || pause.quantity < quantity) {
       res
        .status(400)
        .json({ error: "OrderItem not paused or quantity exceeds pause" });
        return;
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: { productId: true }, 
    });

    if (!orderItem) {
       res.status(404).json({ error: "OrderItem not found" });
       return
    }

    await prisma.$transaction(async (tx) => {
      // 1. Record the returned item
      await tx.returnedOrderItem.create({
        data: { orderItemId, quantity },
      });

      // 2. Update or remove pause
      if (pause.quantity === quantity) {
        await tx.pausedOrderItem.delete({ where: { orderItemId } });
      } else {
        await tx.pausedOrderItem.update({
          where: { orderItemId },
          data: { quantity: { decrement: quantity } },
        });
      }

       //this check product first
      // 3. ✅ Decrement sold count on product
      try{
      await tx.product.update({
        where: { id: orderItem.productId },
        data: { sold: { decrement: quantity } },
      });
       } catch (e) {
          console.error(`Product not found, skipping update ${e}`);
        }
    });

    res.status(200).json({ message: "Order item returned successfully" });
  } catch (err) {
    console.error("Return error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};



export const markItemsReceived = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { orderItemIds } = req.body 

    if (!orderId || !orderItemIds || !Array.isArray(orderItemIds)) {
      res
        .status(400)
        .json({ error: "Order ID and orderItemIds array required" });
      return;
    }

    // Verify order exists
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Update items in batch
    await prisma.orderItem.updateMany({
      where: { id: { in: orderItemIds }, orderId },
      data: { recieved: true },
    });

    res.status(200).json({
      message: "Order items marked as received",
      data: { orderId, orderItemIds },
    });
  } catch (err) {
    console.error("Mark received error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const cancelOrder = async (req: Request, res: Response) => {
  try {
     const { orderId} = req.body;

    if (!orderId) {
      res.status(400).json({ error: "Order ID is required" });
      return;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: { orderItems: true },
    });


      // Update sold count and prob quantity
      for (const item of order.orderItems) {
        //this check product first
        try{
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
         } catch (e) {
          console.error(`Product ${item.productId} not found, skipping update ${e}`);
        }
      }

    res.status(200).json({
      message: "Order cancelled successfully",
      data: { orderId: order.id, status: order.status },
    });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
