import { NextFunction, Request, Response } from "express";
import { StageOrderSchema, ConfirmOrderSchema, BuyerInfoSchema } from "../lib/zod/schema";
import { paystackSecretKey, prisma } from "../config";
import { customAlphabet } from "nanoid";
import { OrderStatus } from "@prisma/client";
import { successOrderMail } from "../helper/mail/order/successOrderMail";
import { AuthRequest } from "../types";
import { formatPlugOrders, formatSupplierOrders } from "../helper/formatData";

export async function stageOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("body", req.body)
    const parseResult = StageOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid field data!" });
    }
    const input = parseResult.data;

    const response = await prisma.$transaction(async (tx) => {
      let plug: any = null;
      let supplier: any = null;
      let orderSource: "plug" | "supplier";

      // Determine whether id is plug or supplier
      if (input.id) {
        plug = await tx.plug.findUnique({
          where: { id: input.id },
          select: { id: true, businessName: true, subdomain: true },
        });

        if (plug) {
          orderSource = "plug";
        } else {
          supplier = await tx.supplier.findUnique({
            where: { id: input.id },
            select: { id: true, businessName: true, subdomain: true },
          });
          if (!supplier) throw new Error("Invalid id: not a plug or supplier");
          orderSource = "supplier";
        }
      } else if (input.subdomain) {
        // fallback to subdomain for plug
        plug = await tx.plug.findUnique({
          where: { subdomain: input.subdomain },
          select: { id: true, businessName: true, subdomain: true },
        });
        if (!plug) throw new Error("Plug not found by subdomain");
        orderSource = "plug";
      } else {
        throw new Error("Either id or subdomain must be provided");
      }

      // Calculate subtotal and delivery
      let subtotal = 0;
      const orderItemsData: any[] = [];
      const supplierDeliveryMap: Record<string, number> = {};

      for (const item of input.orderItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            price: true,
            name: true,
            supplierId: true,
            stock: true,
          },
        });
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const supplierPrice = product.price;
        let plugPrice = 0;

        if (orderSource === "plug") {
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
            throw new Error(`PlugProduct not found for ${item.productId}`);
          plugPrice = plugProduct.price;
          subtotal += plugPrice * item.quantity;
        } else {
          subtotal += supplierPrice * item.quantity;
        }

        // Use first delivery fee per supplier
        if (!supplierDeliveryMap[product.supplierId]) {
          supplierDeliveryMap[product.supplierId] = item.deliveryFee;
        }

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
          deliveryFee: item.deliveryFee,
          deliveryLocationId: item.deliveryLocationId || null,
          paymentMethod: item.paymentMethod,
        });
      }

      const deliveryFeeTotal = Object.values(supplierDeliveryMap).reduce(
        (a, b) => a + b,
        0
      );
      const totalAmount = subtotal + deliveryFeeTotal;
      const hasPOD = input.orderItems.some(
        (it) => it.paymentMethod === "P_O_D"
      );

      // Generate order number
      const nanoid6 = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
      const orderNumber = `ORD-${new Date()
        .toISOString()
        .slice(2, 10)
        .replace(/-/g, "")}-${nanoid6()}`;

      // Upsert buyer
      const buyer = await tx.buyer.upsert({
        where: {
          email_phone: { email: input.buyerEmail, phone: input.buyerPhone },
        },
        update: {
          name: input.buyerName,
          streetAddress: input.buyerAddress || null,
          state: input.buyerState || null,
          lga: input.buyerLga || null,
          directions: input.buyerDirections || null,
        },
        create: {
          name: input.buyerName,
          email: input.buyerEmail,
          phone: input.buyerPhone,
          streetAddress: input.buyerAddress || null,
          state: input.buyerState,
          lga: input.buyerLga || null,
          directions: input.buyerDirections || null,
        },
      });

      let paystackReference: string | null = null;
      let paystackAuthUrl: string | null = null;

      if (!hasPOD) {
        const paystackRes = await fetch(
          "https://api.paystack.co/transaction/initialize",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: input.buyerEmail,
              amount: Math.round(totalAmount * 100),
              metadata: {
                buyerName: input.buyerName,
                buyerPhone: input.buyerPhone,
                id: input.id,
                source: orderSource,
              },
            }),
          }
        );
        const paystackData = await paystackRes.json();
        if (!paystackData.status)
          throw new Error("Paystack initialization failed");
        paystackReference = paystackData.data.reference;
        paystackAuthUrl = paystackData.data.authorization_url;
      }

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerId: buyer.id,
          plugId: plug?.id || null,
          supplierId: supplier?.id || null,
          totalAmount,
          deliveryFee: deliveryFeeTotal,
          platform: input.platform || "Unknown",
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          buyerPhone: input.buyerPhone,
          buyerAddress: input.buyerAddress || null,
          buyerState: input.buyerState,
          buyerLga: input.buyerLga || null,
          buyerDirections: input.buyerDirections || null,
          buyerInstructions: input.buyerInstructions || null,
          paymentReference: paystackReference,
          status: hasPOD ? OrderStatus.PENDING : OrderStatus.STAGED,
        },
      });

      // Create order items
      await tx.orderItem.createMany({
        data: orderItemsData.map((i) => ({ ...i, orderId: order.id })),
      });

      // POD stock deduction
      if (hasPOD) {
        await Promise.all(
          orderItemsData.map(async (item) => {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });
            if (!product)
              throw new Error(`Product ${item.productId} not found`);

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: Math.max(product.stock! - item.quantity, 0) },
            });

            if (item.variantId) {
              const variant = await tx.productVariation.findUnique({
                where: { id: item.variantId },
              });
              if (variant)
                await tx.productVariation.update({
                  where: { id: item.variantId },
                  data: { stock: Math.max(variant.stock! - item.quantity, 0) },
                });
            }
          })
        );
      }

      return hasPOD
        ? { orderNumber, message: "Order placed successfully!" }
        : {
            authorization_url: paystackAuthUrl,
            reference: paystackReference,
            orderNumber,
          };
    });

    res.status(201).json({ data: response });
  } catch (err) {
    next(err);
  }
}


// sold: { increment: item.quantity },  THE SOLD PRODUCT ITEM INCREASED  WHEN DELIVERED SO MAPPING THROUGH // sold and quantity

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
        supplier: { select: { businessName: true, subdomain: true } },

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
              stock: Math.max(product.stock! - item.quantity, 0),
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
              data: { stock: Math.max(variant.stock! - item.quantity, 0) },
            });
          }
        })
      );

      // Update order status from STAGED to PENDING
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PENDING" },
      });

      const storeUrl =
        order.plug?.subdomain
          ? `https://${order.plug.subdomain}.pluggn.store`
          : order.supplier?.subdomain
          ? `https://${order.supplier.subdomain}.pluggn.store`
          : null;

          // Always get business name
      const businessName = order.plug?.businessName || order.supplier?.businessName;


      try {
      //  await successOrderMail(
      //    order.buyerEmail,
      //    order.buyerName,
      //    businessName,
      //    storeUrl,
      //    order.orderNumber
      //  );
      } catch (error) {
        console.error("Failed to send success order email:", error);
      }

      return {
        businessName,
        storeUrl,
        buyerName: order.buyerName,
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
