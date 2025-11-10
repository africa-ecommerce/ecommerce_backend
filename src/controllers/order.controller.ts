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
    const parsed = StageOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid field data" });
      return;
    }

    const input = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Identify plug or supplier
      let plug: any = null;
      let supplier: any = null;
      let orderSource: "plug" | "supplier";

      if (input.id) {
        plug = await tx.plug.findUnique({ where: { id: input.id } });
        if (plug) orderSource = "plug";
        else {
          supplier = await tx.supplier.findUnique({ where: { id: input.id } });
          if (!supplier) throw new Error("Invalid id: not a plug or supplier");
          orderSource = "supplier";
        }
      } else if (input.subdomain) {
        plug = await tx.plug.findUnique({
          where: { subdomain: input.subdomain },
        });
        if (!plug) throw new Error("Plug not found by subdomain");
        orderSource = "plug";
      } else {
        throw new Error("Either id or subdomain must be provided");
      }

      // Buyer upsert
      const buyer = await tx.buyer.upsert({
        where: {
          email_phone: { email: input.buyerEmail, phone: input.buyerPhone },
        },
        update: {
          name: input.buyerName,
          streetAddress: input.buyerAddress || null,
          state: input.buyerState,
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

      // Group items by supplierId
      const itemsBySupplier = input.orderItems.reduce((acc, item) => {
        if (!acc[item.supplierId]) acc[item.supplierId] = [];
        acc[item.supplierId].push(item);
        return acc;
      }, {} as Record<string, typeof input.orderItems>);

      const nanoid6 = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
      const ordersToCreate = [];
      let totalPaymentAmount = 0;

      // Create an order per supplier
      for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
        let subtotal = 0;
        let deliveryFee = 0;
        const orderItemsData: any[] = [];

        for (const item of items) {
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
          let plugPrice = supplierPrice;

          if (orderSource === "plug" && plug) {
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
          }

          subtotal +=
            (orderSource === "plug" ? plugPrice : supplierPrice) *
            item.quantity;
          if (!deliveryFee) deliveryFee = item.deliveryFee;

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
            plugId: plug?.id || null,
            deliveryFee: item.deliveryFee,
            deliveryLocationId: item.deliveryLocationId || null,
            paymentMethod: item.paymentMethod,
          });
        }

        const totalAmount = subtotal + deliveryFee;
        totalPaymentAmount += totalAmount;
        const orderNumber = `ORD-${new Date()
          .toISOString()
          .slice(2, 10)
          .replace(/-/g, "")}-${nanoid6()}`;
        ordersToCreate.push({
          supplierId,
          totalAmount,
          deliveryFee,
          orderItemsData,
          orderNumber,
        });
      }

      // Determine payment type
      const hasPOD = input.orderItems.some(
        (it) => it.paymentMethod === "P_O_D"
      );
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
              amount: Math.round(totalPaymentAmount * 100),
              metadata: { id: input.id, source: orderSource },
            }),
          }
        );
        const paystackData = await paystackRes.json();
        if (!paystackData.status)
          throw new Error("Paystack initialization failed");
        paystackReference = paystackData.data.reference;
        paystackAuthUrl = paystackData.data.authorization_url;
      }

      // Create each supplier’s order
      for (const o of ordersToCreate) {
        const createdOrder = await tx.order.create({
          data: {
            orderNumber: o.orderNumber,
            buyerId: buyer.id,
            plugId: plug?.id || null,
            supplierId: o.supplierId,
            totalAmount: o.totalAmount,
            deliveryFee: o.deliveryFee,
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

        console.log("createdOrder", createdOrder);

        await tx.orderItem.createMany({
          data: o.orderItemsData.map((i) => ({
            ...i,
            orderId: createdOrder.id,
          })),
        });
      }

      // ✅ Return with businessName + storeUrl always (even for POD)
      const businessName = plug?.businessName || supplier?.businessName || "";
      const storeUrl = plug?.subdomain
        ? `https://${plug.subdomain}.pluggn.store`
        : supplier?.subdomain
        ? `https://${supplier.subdomain}.pluggn.store`
        : "";

      return hasPOD
        ? {
            message: "Orders placed successfully!",
            businessName,
            storeUrl,
          }
        : {
            authorization_url: paystackAuthUrl,
            reference: paystackReference,
            businessName,
            storeUrl,
          };
    });

    res.status(201).json({ data: result });
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
    const parsed = ConfirmOrderSchema.safeParse(req.body);
    if (!parsed.success){
    res.status(400).json({ error: "Invalid field data!" });
    return;
    }
      

    const { reference } = parsed.data;

    console.log("parsed.data", parsed.data);

    const result = await prisma.$transaction(async (tx) => {
      const stagedOrders = await tx.order.findMany({
        where: { paymentReference: reference, status: "STAGED" },
        include: {
          orderItems: true,
          plug: { select: { businessName: true, subdomain: true } },
          supplier: { select: { businessName: true, subdomain: true } },
        },
      });

      if (!stagedOrders.length)
        throw new Error("No staged orders found for reference");

      const totalExpectedAmount = stagedOrders.reduce(
        (sum, o) => sum + o.totalAmount,
        0
      );

      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${paystackSecretKey}` },
        }
      );
      const verifyData = await verifyRes.json();
      if (!verifyData.status) throw new Error("Payment verification failed");
      if (verifyData.data.status !== "success")
        throw new Error("Payment not successful");

      if (verifyData.data.amount !== Math.round(totalExpectedAmount * 100))
        throw new Error("Payment amount mismatch");

      for (const order of stagedOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PENDING" },
        });

        await Promise.all(
          order.orderItems.map(async (item) => {
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

      const firstOrder = stagedOrders[0];
      const businessName =
        firstOrder.plug?.businessName || firstOrder.supplier?.businessName;
      const storeUrl = firstOrder.plug?.subdomain
        ? `https://${firstOrder.plug.subdomain}.pluggn.store`
        : firstOrder.supplier?.subdomain
        ? `https://${firstOrder.supplier.subdomain}.pluggn.store`
        : "";

      return { businessName, storeUrl};
    });

    res
      .status(200)
      .json({ message: "Orders confirmed successfully!", data: result });
  } catch (err) {
    next(err);
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

// export const getPlugPausedOrderItems = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const plugId = req.plug?.id!;
//     const pausedItems = await prisma.pausedOrderItem.findMany({
//       where: {
//         orderItem: {
//           plugId,
//         },
//       },
//       include: {
//         orderItem: {
//           include: {
//             order: {
//               select: {
//                 orderNumber: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     const data = pausedItems.map((p) => ({
//       orderNumber: p.orderItem.order.orderNumber,
//       pausedQuantity: p.quantity,
//       productName: p.orderItem.productName,
//       originalQuantity: p.orderItem.quantity,
//       productSize: p.orderItem.productSize,
//       productColor: p.orderItem.productColor,
//       variantSize: p.orderItem.variantSize,
//       variantColor: p.orderItem.variantColor,
//     }));
//     res.status(200).json({ message: "Paused order items fetched", data });
//   } catch (err) {
//     next(err);
//   }
// };
// export const getSupplierPausedOrderItems = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const supplierId = req.supplier?.id;
//     const pausedItems = await prisma.pausedOrderItem.findMany({
//       where: {
//         orderItem: {
//           supplierId,
//         },
//       },
//       include: {
//         orderItem: {
//           include: {
//             order: {
//               select: {
//                 orderNumber: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     const data = pausedItems.map((p) => ({
//       orderNumber: p.orderItem.order.orderNumber,
//       pausedQuantity: p.quantity,
//       productName: p.orderItem.productName,
//       originalQuantity: p.orderItem.quantity,
//       productSize: p.orderItem.productSize,
//       productColor: p.orderItem.productColor,
//       variantSize: p.orderItem.variantSize,
//       variantColor: p.orderItem.variantColor,
//     }));
//     res.status(200).json({ message: "Paused order items fetched", data });
//   } catch (err) {
//     next(err);
//   }
// };

// export const getPlugReturnedOrderItems = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   const plugId = req.plug?.id;
//   try {
//     const returnedItems = await prisma.returnedOrderItem.findMany({
//       where: {
//         orderItem: {
//           plugId,
//         },
//       },
//       include: {
//         orderItem: {
//           include: {
//             order: {
//               select: {
//                 orderNumber: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     const data = returnedItems.map((r) => ({
//       orderNumber: r.orderItem.order.orderNumber,
//       pausedQuantity: r.quantity,
//       productName: r.orderItem.productName,
//       originalQuantity: r.orderItem.quantity,
//       productSize: r.orderItem.productSize,
//       productColor: r.orderItem.productColor,
//       variantSize: r.orderItem.variantSize,
//       variantColor: r.orderItem.variantColor,
//     }));

//     res.status(200).json({ message: "Returned order items fetched", data });
//   } catch (err) {
//     next(err);
//   }
// };
// export const getSupplierReturnedOrderItems = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   const supplierId = req.supplier?.id;
//   try {
//     const returnedItems = await prisma.returnedOrderItem.findMany({
//       where: {
//         orderItem: {
//           supplierId,
//         },
//       },
//       include: {
//         orderItem: {
//           include: {
//             order: {
//               select: {
//                 orderNumber: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     const data = returnedItems.map((r) => ({
//       orderNumber: r.orderItem.order.orderNumber,
//       pausedQuantity: r.quantity,
//       productName: r.orderItem.productName,
//       originalQuantity: r.orderItem.quantity,
//       productSize: r.orderItem.productSize,
//       productColor: r.orderItem.productColor,
//       variantSize: r.orderItem.variantSize,
//       variantColor: r.orderItem.variantColor,
//     }));

//     res.status(200).json({ message: "Returned order items fetched", data });
//   } catch (err) {
//     next(err);
//   }
// };
