import { NextFunction, Request, Response } from "express";
import {
  BuyerInfoSchema,
  ConfirmOrderSchema,
  StageOrderSchema,
} from "../lib/zod/schema";
import { paystackSecretKey, prisma } from "../config";
import { AuthRequest } from "../types";
import { formatPlugOrders, formatSupplierOrders } from "../helper/formatData";
import { OrderStatus } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { getTerminalInfo } from "../helper/logistics";
import { successOrderMail } from "../helper/mail/order/successOrderMail";



export async function stageOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("data", req.body)
    const fieldData = StageOrderSchema.safeParse(req.body);
    if (!fieldData.success) {
       res.status(400).json({ error: "Invalid field data!" });
       return
    }

    const formattedInput = fieldData.data;

    if (!formattedInput.plugId && !formattedInput.subdomain) {
       res.status(400).json({ error: "Missing plug ID or subdomain" });
       return;
    }

    const response = await prisma.$transaction(async (tx) => {
      // Get plug
      const plug = await tx.plug.findFirst({
        where: formattedInput.plugId
          ? { id: formattedInput.plugId }
          : { subdomain: formattedInput.subdomain },
        select: { id: true, businessName: true, subdomain: true },
      });
      if (!plug) throw new Error("Plug not found");

      // ====================================
      // 1. Calculate prices per order item
      // ====================================
      let subtotal = 0;
      const orderItemsData: any[] = [];

      for (const item of formattedInput.orderItems) {
        // Plug price
        const plugProduct = await tx.plugProduct.findUnique({
          where: {
            plugId_originalId: {
              plugId: plug.id,
              originalId: item.productId,
            },
          },
          select: { price: true },
        });
        if (!plugProduct)
          throw new Error(
            `PlugProduct not found for product ${item.productId}`
          );

        // Supplier price
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, price: true, name: true, supplierId: true },
        });
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const plugPrice = plugProduct.price;
        const supplierPrice = product.price;
        const itemTotal = plugPrice * item.quantity;
        subtotal += itemTotal;

        orderItemsData.push({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          productSize: item.productSize || null,
          productColor: item.productColor || null,
          variantSize: item.variantSize || null,
          variantColor: item.variantColor || null,
          productName: product.name,
          plugPrice,
          supplierPrice,
          supplierId: product.supplierId,
          plugId: plug.id,
        });
      }

      // ====================================
      // 2. Calculate delivery fee
      // ====================================
      let deliveryFee = 0;
      let terminalAddress: string | null = null;

      if (formattedInput.deliveryType === "terminal") {
        const terminalInfo = getTerminalInfo(
          formattedInput.terminalAddress as any
        );
        deliveryFee = terminalInfo.price;
        terminalAddress = terminalInfo.address;
      } else if (formattedInput.deliveryType === "home") {
        // deliveryFee = calculateHomeDeliveryFee(
        //   formattedInput.buyerAddress || "",
        //   formattedInput.buyerState,
        //   formattedInput.buyerLga
        // );
      }

      // ====================================
      // 3. Total amount
      // ====================================
      const totalAmount = subtotal + deliveryFee;

      // ====================================
      // 4. Initialize Paystack
      // ====================================
      const paystackResponse = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formattedInput.buyerEmail,
            amount: totalAmount * 100, // in kobo
            metadata: {
              buyerName: formattedInput.buyerName,
              buyerPhone: formattedInput.buyerPhone,
              plugId: plug.id,
              orderItems: orderItemsData.map(
                (i) => `${i.productName} x${i.quantity}`
              ),
            },
          }),
        }
      );
      const paystackData = await paystackResponse.json();
      if (!paystackData.status) throw new Error("Paystack init failed");

      // ====================================
      // 5. Generate order number
      // ====================================

      // Generate order number
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const nanoid6 = customAlphabet(alphabet, 6);
      const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      const orderNumber = `ORD-${datePart}-${nanoid6()}`;

      // ====================================
      // 6. Upsert buyer
      // ====================================
      const buyerUpdateData: any = {
        name: formattedInput.buyerName,
      };

      if (formattedInput.deliveryType === "home") {
        buyerUpdateData.streetAddress = formattedInput.buyerAddress;
        buyerUpdateData.state = formattedInput.buyerState;
        buyerUpdateData.lga = formattedInput.buyerLga;
        buyerUpdateData.directions = formattedInput.buyerDirections;
      } else if (formattedInput.deliveryType === "terminal") {
        buyerUpdateData.terminalAddress = terminalAddress;
      }

      const buyer = await tx.buyer.upsert({
        where: {
          email_phone: {
            email: formattedInput.buyerEmail,
            phone: formattedInput.buyerPhone,
          },
        },
        update: buyerUpdateData,
        create: {
          name: formattedInput.buyerName,
          email: formattedInput.buyerEmail,
          phone: formattedInput.buyerPhone,
          streetAddress: formattedInput.buyerAddress,
          terminalAddress: terminalAddress,
          state: formattedInput.buyerState,
          lga: formattedInput.buyerLga,
          directions: formattedInput.buyerDirections,
        },
      });

      // ====================================
      // 7. Create order
      // ====================================
      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerId: buyer.id,
          plugId: plug.id,
          totalAmount,
          deliveryFee,
          platform: formattedInput.platform || "Unknown",
          buyerName: formattedInput.buyerName,
          buyerEmail: formattedInput.buyerEmail,
          buyerPhone: formattedInput.buyerPhone,
          buyerAddress: formattedInput.buyerAddress,
          buyerState: formattedInput.buyerState,
          buyerLga: formattedInput.buyerLga,
          buyerDirections: formattedInput.buyerDirections,
          buyerInstructions: formattedInput.buyerInstructions,
          paymentReference: paystackData.data.reference,
          terminalAddress,
          deliveryType: formattedInput.deliveryType,
          status: "STAGED",
        },
      });

      // ====================================
      // 8. Create order items
      // ====================================
      await tx.orderItem.createMany({
        data: orderItemsData.map((i) => ({
          ...i,
          orderId: order.id,
        })),
      });

      return {
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        orderNumber,
      };
    });

    res.status(201).json({ data: response });
  } catch (error) {
    next(error);
  }
}

// sold: { increment: item.quantity },  THE SOLD PRODUCT ITEM INCREASED  WHEN DELIVERED SO MAPPING THROUGH

export async function confirmOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const fieldData = ConfirmOrderSchema.safeParse(req.body);
    if (!fieldData.success) {
      res.status(400).json({ error: "Invalid field data!" });
      return;
    }

    const { reference } = fieldData.data;

    const response = await prisma.$transaction(async (tx) => {
      // Find staged order by payment reference
      const order = await tx.order.findFirst({
        where: {
          paymentReference: reference,
          status: "STAGED",
        },
        include: {
          orderItems: true,
          plug: {
            select: { businessName: true, subdomain: true },
          },
        },
      });

      if (!order) {
        throw new Error("Staged order not found or already processed");
      }

      // Verify payment with Paystack
      const verifyResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
          },
        }
      );

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify payment with Paystack");
      }

      const paymentData = await verifyResponse.json();

      if (!paymentData.status) {
        throw new Error(paymentData.message || "Payment verification failed");
      }


      if (paymentData.data.status !== "success") {
        throw new Error("Payment was not successful");
      }

      // Verify amount matches (Paystack returns in kobo)
      if (paymentData.data.amount !== order.totalAmount * 100) {
        throw new Error("Payment amount does not match order total");
      }

      // Check if another order with same reference already exists as PENDING
      const existingPendingOrder = await tx.order.findFirst({
        where: {
          paymentReference: reference,
          status: "PENDING",
        },
      });

      if (existingPendingOrder) {
        throw new Error("Order already confirmed for this payment");
      }

      // Update stock for all order items
      await Promise.all(
        order.orderItems.map(async (item) => {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (!product) throw new Error(`Product ${item.productId} not found`);

          // Update product stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: Math.max(product.stock - item.quantity, 0),
            },
          });

          if (item.variantId) {
            const variant = await tx.productVariation.findUnique({
              where: { id: item.variantId, productId: item.productId },
            });
            if (!variant)
              throw new Error(`Variant ${item.variantId} not found`);

            // Update variant stock
            await tx.productVariation.update({
              where: { id: item.variantId, productId: item.productId },
              data: { stock: Math.max(variant.stock - item.quantity, 0) },
            });
          }
        })
      );

      // Update order status from STAGED to PENDING
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PENDING" },
      });

      const plugStoreUrl = order.plug?.subdomain
        ? `https://${order.plug.subdomain}.pluggn.store`
        : null;

      try {
        await successOrderMail(
          order.buyerEmail,
          order.buyerName,
          order.plug?.businessName,
          plugStoreUrl,
          order.orderNumber,
          order.deliveryType,
          order.terminalAddress
        );
      } catch (error) {
        console.error("Failed to send success order email:", error);
      }

      return {
        plugBusinessName: order.plug?.businessName,
        plugStoreUrl,
        buyerName: order.buyerName,
        terminalAddress: order.terminalAddress,
        deliveryType: order.deliveryType,
        orderNumber: order.orderNumber,
      };
    });

    res.status(200).json({
      message: "Order placed successfully!",
      data: response,
    });
  } catch (error) {
    next(error);
  }
}
/**
 * @dev PUBLIC ENDPOINT
 */
export async function getBuyerInfo(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate input
    const fieldData = BuyerInfoSchema.safeParse(req.query);
    if (!fieldData.success) {
      res.status(400).json({
        error: "Invalid field data!",
      });
      return;
    }

    const { buyerName, buyerEmail, buyerPhone } = {
      ...fieldData.data,
      // serialize fields
      buyerName: fieldData.data.buyerName.toLocaleLowerCase().trim(),
      buyerEmail: fieldData.data.buyerEmail.toLowerCase(),
    };

    if (!buyerName || !buyerEmail || !buyerPhone) {
      res.status(400).json({
        error: "Name, email, and phone are required!",
      });
      return;
    }
    const buyer = await prisma.buyer.findUnique({
      where: {
        email_phone: {
          email: buyerEmail,
          phone: buyerPhone,
        },
      },
    });

    if (!buyer) {
      res.status(404).json({
        error: "Buyer not found!",
        data: null,
      });
      return;
    }
    res.status(200).json({
      message: "Buyer details fetched successfully!",
      data: {
        streetAddress: buyer.streetAddress,
        state: buyer.state,
        lga: buyer.lga,
        directions: buyer.directions,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPlugOrders(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const plugId = req.plug?.id!;
    const status = (req.query.orderStatus as string | undefined)?.toUpperCase();
    const where: any = { plugId };
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
    next(error);
  }
}

export async function getSupplierOrders(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const supplierId = req.supplier?.id!;
    const statusParam = (
      req.query.orderStatus as string | undefined
    )?.toUpperCase();

    //typecast statusParam to OrderStatus or undefined
    const status = statusParam as OrderStatus | undefined;

    const orderItems = await prisma.orderItem.findMany({
      where: {
        supplierId,
        ...(status ? { order: { status } } : {}),
      },
      include: {
        order: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const data = orderItems ? formatSupplierOrders(orderItems) : [];

    res.status(200).json({
      message: "Orders fetched successfully!",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export const getPlugPausedOrderItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plugId = req.plug?.id!;
    const pausedItems = await prisma.pausedOrderItem.findMany({
      where: {
        orderItem: {
          plugId,
        },
      },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
    });

    const data = pausedItems.map((p) => ({
      orderNumber: p.orderItem.order.orderNumber,
      pausedQuantity: p.quantity,
      productName: p.orderItem.productName,
      originalQuantity: p.orderItem.quantity,
      productSize: p.orderItem.productSize,
      productColor: p.orderItem.productColor,
      variantSize: p.orderItem.variantSize,
      variantColor: p.orderItem.variantColor,
    }));
    res.status(200).json({ message: "Paused order items fetched", data });
  } catch (err) {
    next(err);
  }
};
export const getSupplierPausedOrderItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplierId = req.supplier?.id;
    const pausedItems = await prisma.pausedOrderItem.findMany({
      where: {
        orderItem: {
          supplierId,
        },
      },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
    });

    const data = pausedItems.map((p) => ({
      orderNumber: p.orderItem.order.orderNumber,
      pausedQuantity: p.quantity,
      productName: p.orderItem.productName,
      originalQuantity: p.orderItem.quantity,
      productSize: p.orderItem.productSize,
      productColor: p.orderItem.productColor,
      variantSize: p.orderItem.variantSize,
      variantColor: p.orderItem.variantColor,
    }));
    res.status(200).json({ message: "Paused order items fetched", data });
  } catch (err) {
    next(err);
  }
};

export const getPlugReturnedOrderItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const plugId = req.plug?.id;
  try {
    const returnedItems = await prisma.returnedOrderItem.findMany({
      where: {
        orderItem: {
          plugId,
        },
      },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
    });

    const data = returnedItems.map((r) => ({
      orderNumber: r.orderItem.order.orderNumber,
      pausedQuantity: r.quantity,
      productName: r.orderItem.productName,
      originalQuantity: r.orderItem.quantity,
      productSize: r.orderItem.productSize,
      productColor: r.orderItem.productColor,
      variantSize: r.orderItem.variantSize,
      variantColor: r.orderItem.variantColor,
    }));

    res.status(200).json({ message: "Returned order items fetched", data });
  } catch (err) {
    next(err);
  }
};
export const getSupplierReturnedOrderItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const supplierId = req.supplier?.id;
  try {
    const returnedItems = await prisma.returnedOrderItem.findMany({
      where: {
        orderItem: {
          supplierId,
        },
      },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
    });

    const data = returnedItems.map((r) => ({
      orderNumber: r.orderItem.order.orderNumber,
      pausedQuantity: r.quantity,
      productName: r.orderItem.productName,
      originalQuantity: r.orderItem.quantity,
      productSize: r.orderItem.productSize,
      productColor: r.orderItem.productColor,
      variantSize: r.orderItem.variantSize,
      variantColor: r.orderItem.variantColor,
    }));

    res.status(200).json({ message: "Returned order items fetched", data });
  } catch (err) {
    next(err);
  }
};
