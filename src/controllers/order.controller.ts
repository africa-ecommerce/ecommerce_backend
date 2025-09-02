import { NextFunction, Request, Response } from "express";
import { BuyerInfoSchema, PlaceOrderSchema } from "../lib/zod/schema";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { formatPlugOrders, formatSupplierOrders } from "../helper/formatData";
import { OrderStatus } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { getTerminalInfo } from "../helper/logistics";

export async function placeOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const {
    buyerName,
    buyerEmail,
    buyerPhone,
    buyerAddress,
    buyerState,
    buyerLga,
    buyerDirections,
    buyerInstructions,
    // buyerLatitude,
    // buyerLongitude,
    paymentMethod,
    totalAmount,
    deliveryType,
    terminalAddress,
    deliveryFee,
    plugId,
    subdomain,
    paymentReference,
    platform,
    orderItems,
  } = req.body;

  const formattedInput = {
    buyerName: buyerName?.trim(),
    buyerEmail: buyerEmail?.toLowerCase(),
    buyerPhone,
    buyerAddress: buyerAddress?.trim(),
    buyerState,
    buyerLga,
    buyerDirections: buyerDirections?.trim(),
    buyerInstructions,
    // buyerLatitude,
    // buyerLongitude,
    paymentMethod,
    totalAmount,
    deliveryFee,
    deliveryType,
    terminalAddress,
    platform: platform?.trim(),
    plugId,
    subdomain,
    orderItems,
    paymentReference,
  };

  console.log("formattedInput:", formattedInput);

  try {
    const fieldData = PlaceOrderSchema.safeParse(formattedInput);
    if (!fieldData.success) {
      res.status(400).json({ error: "Invalid field data!" });
      return;
    }

    if (!formattedInput.plugId && !formattedInput.subdomain) {
      res.status(400).json({ error: "Missing plug ID or subdomain" });
      return;
    }

    //always cross check payment reference before orders to avoid scams as it is a public endpoint  ----------------->
    if (paymentMethod !== "cash" && paymentReference) {
      const existing = await prisma.order.findFirst({
        where: { paymentReference },
      });
      if (existing) {
        res.status(400).json({
          error:
            "Payment reference has already been used. Please contact support.",
        });
        return;
      }
    }

    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const nanoid6 = customAlphabet(alphabet, 6);
    const orderNumber = `ORD-${datePart}-${nanoid6()}`;
    const fullAddress = formattedInput.terminalAddress && getTerminalInfo(formattedInput.terminalAddress);

    const response = await prisma.$transaction(async (tx) => {
      // Prepare update data based on delivery type
      const buyerUpdateData: any = {
        name: formattedInput.buyerName,
      };

      // Only update address fields if deliveryType is "home" or if they have valid values
      if (formattedInput.deliveryType === "home") {
        buyerUpdateData.streetAddress = formattedInput.buyerAddress;
        buyerUpdateData.state = formattedInput.buyerState;
        buyerUpdateData.lga = formattedInput.buyerLga;
        buyerUpdateData.directions = formattedInput.buyerDirections;
        // buyerUpdateData.latitude = formattedInput.buyerLatitude;
        // buyerUpdateData.longitude = formattedInput.buyerLongitude;
      } else if (formattedInput.deliveryType === "terminal") {
        // For terminal delivery, update terminal address and only update street address fields if they have valid values
        buyerUpdateData.terminalAddress = fullAddress;

        // if (formattedInput.buyerAddress) {
        //   buyerUpdateData.streetAddress = formattedInput.buyerAddress;
        // }
        // if (formattedInput.buyerState) {
        //   buyerUpdateData.state = formattedInput.buyerState;
        // }
        // if (formattedInput.buyerLga) {
        //   buyerUpdateData.lga = formattedInput.buyerLga;
        // }
        // if (formattedInput.buyerDirections) {
        //   buyerUpdateData.directions = formattedInput.buyerDirections;
        // }
        // if (formattedInput.buyerLatitude) {
        //   buyerUpdateData.latitude = formattedInput.buyerLatitude;
        // }
        // if (formattedInput.buyerLongitude) {
        //   buyerUpdateData.longitude = formattedInput.buyerLongitude;
        // }
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
          terminalAddress: fullAddress,
          state: formattedInput.buyerState,
          lga: formattedInput.buyerLga,
          directions: formattedInput.buyerDirections,
          // latitude: formattedInput.buyerLatitude,
          // longitude: formattedInput.buyerLongitude,
        },
      });

      const items = await Promise.all(
        formattedInput.orderItems.map(async (item: any) => {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (!product) throw new Error(`Product ${item.productId} not found`);

          //update product stocks
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: Math.max(product.stock - item.quantity, 0),
              // sold: { increment: item.quantity },  THE SOLD PRODUCT ITEM INCREASED  WHEN DELIVERED SO MAPPING THROUGH
            },
          });

          if (item.variantId) {
            const variant = await tx.productVariation.findUnique({
              where: { id: item.variantId, productId: item.productId },
            });
            if (!variant)
              throw new Error(`Variant ${item.variantId} not found`);
            //update product variant stocks
            await tx.productVariation.update({
              where: { id: item.variantId, productId: item.productId },
              data: { stock: Math.max(variant.stock - item.quantity, 0) },
            });
          }

          return {
            plugPrice: item.plugPrice,
            supplierPrice: item.supplierPrice,
            supplierId: item.supplierId,
            plugId: formattedInput.plugId,
            productId: item.productId,
            productName: product.name,
            variantId: item.variantId || null,
            quantity: item.quantity,
            productSize: item.productSize || null,
            productColor: item.productColor || null,
            variantSize: item.variantSize || null,
            variantColor: item.variantColor || null,
          };
        })
      );

      let where;
      //get plug details through plugid if plugid is sent
      if (formattedInput.plugId) {
        where = { id: formattedInput.plugId };
      }
      //get plug details if through store using subdomain
      else if (formattedInput.subdomain) {
        where = { subdomain: formattedInput.subdomain };
      }

      const plug = await tx.plug.findFirst({
        where,
        select: { id: true, businessName: true, subdomain: true },
      });

      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerId: buyer.id,
          plugId: formattedInput.plugId || plug?.id,
          totalAmount: formattedInput.totalAmount,
          deliveryFee: formattedInput.deliveryFee,
          platform: formattedInput.platform,
          buyerName: formattedInput.buyerName,
          buyerEmail: formattedInput.buyerEmail,
          buyerPhone: formattedInput.buyerPhone,
          buyerAddress: formattedInput.buyerAddress,
          buyerState: formattedInput.buyerState,
          buyerLga: formattedInput.buyerLga,
          buyerDirections: formattedInput.buyerDirections,
          // buyerLatitude: formattedInput.buyerLatitude,
          // buyerLongitude: formattedInput.buyerLongitude,
          paymentMethod: formattedInput.paymentMethod,
          buyerInstructions: formattedInput.buyerInstructions,
          paymentReference: formattedInput.paymentReference,
          terminalAddress: formattedInput.terminalAddress,
          deliveryType: formattedInput.deliveryType,
        },
      });

      await tx.orderItem.createMany({
        data: items.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      });

      return {
        plugBusinessName: plug?.businessName,
        plugStore: plug?.subdomain
          ? `https://${plug.subdomain}.pluggn.store`
          : null,
        buyerName: formattedInput.buyerName,
        paymentMethod: formattedInput.paymentMethod,
        terminalAddress: formattedInput.terminalAddress,
        deliveryType: formattedInput.deliveryType,
      };
    });

    res.status(201).json({
      message: "Order placed successfully!",
      data: response,
    });
  } catch (error) {
    next(error);
  }
}
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
