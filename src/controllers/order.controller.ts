import { NextFunction, Request, Response } from "express";
import { StageOrderSchema, ConfirmOrderSchema, BuyerInfoSchema } from "../lib/zod/schema";
import { frontendUrl, paystackSecretKey, prisma } from "../config";
import { customAlphabet } from "nanoid";
import { OrderStatus } from "@prisma/client";
import { successOrderMail } from "../helper/mail/order/successOrderMail";
import { AuthRequest } from "../types";
import { formatPlugOrders, formatSupplierOrders } from "../helper/formatData";

// Helper to build store url
const buildStoreUrl = (plug: any, supplier: any) =>
  plug?.subdomain
    ? `https://${plug.subdomain}.pluggn.store`
    : supplier?.subdomain
    ? `https://${supplier.subdomain}.pluggn.store`
    : "";

export async function stageOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = StageOrderSchema.safeParse(req.body);
    console.log("body", req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid field data" });
      return;
    }
    const input = parsed.data;

    // ---------- DETERMINE ORDER SOURCE (plug or supplier) UPFRONT ----------
    let plug: any = null;
    let supplierFallback: any = null;
    let orderSource: "plug" | "supplier";

    if (input.id) {
      plug = await prisma.plug.findUnique({
        where: { id: input.id },
        select: { id: true, businessName: true, subdomain: true },
      });
      if (plug) {
        orderSource = "plug";
      } else {
        supplierFallback = await prisma.supplier.findUnique({
          where: { id: input.id },
          select: { id: true, businessName: true, subdomain: true },
        });
        if (!supplierFallback) {
          res.status(400).json({ error: "Invalid id: not a plug or supplier" });
          return;
        }
        orderSource = "supplier";
      }
    } else if (input.subdomain) {
      plug = await prisma.plug.findUnique({
        where: { subdomain: input.subdomain },
        select: { id: true, businessName: true, subdomain: true },
      });
      if (plug) {
        orderSource = "plug";
      } else {
        // fallback check supplier by subdomain (if you support that)
        supplierFallback = await prisma.supplier.findUnique({
          where: { subdomain: input.subdomain },
          select: { id: true, businessName: true, subdomain: true },
        });
        if (!supplierFallback) {
          res.status(400).json({ error: "Store not found by subdomain" });
          return;
        }
        orderSource = "supplier";
      }
    } else {
      res.status(400).json({ error: "Either id or subdomain must be provided" });
      return;
    }

    // ---------- Group incoming items by supplierId ----------
    const groups = input.orderItems.reduce((acc: Record<string, any>, item) => {
      const key = item.supplierId;
      if (!acc[key]) {
        acc[key] = {
          supplierId: item.supplierId,
          paymentMethod: item.paymentMethod,
          items: [],
        };
      }
      acc[key].items.push(item);
      return acc;
    }, {} as Record<string, { supplierId: string; paymentMethod: string; items: any[] }>);

    // ---------- Fetch all products needed ----------
    const productIds = Array.from(new Set(input.orderItems.map((i: any) => i.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, name: true, supplierId: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // ---------- If plug source, fetch plugProduct prices for those productIds ----------
    const plugProductMap = new Map<string, { price: number }>();
    if (orderSource === "plug" && plug) {
      const plugProducts = await prisma.plugProduct.findMany({
        where: {
          plugId: plug.id,
          originalId: { in: productIds },
        },
        select: { originalId: true, price: true },
      });
      for (const pp of plugProducts) {
        plugProductMap.set(pp.originalId, { price: pp.price });
      }
      // Note: if a plugProduct is missing for some product, we'll throw later when computing totals
    }

    // ---------- Compute per-group totals using the correct price (plugPrice or supplier price) ----------
    let totalOnlineAmount = 0;
    let hasOnline = false;

    for (const [supplierId, group] of Object.entries(groups)) {
      let subtotal = 0;
      const firstDeliveryFee = group.items[0]?.deliveryFee ?? 0;

      for (const it of group.items) {
        const prod = productMap.get(it.productId);
        if (!prod) {
          res.status(400).json({ error: `Product ${it.productId} not found` });
          return;
        }
        

        // Choose price depending on orderSource
        let unitPrice = prod.price; // supplier price by default
        if (orderSource === "plug" && plug) {
          const pp = plugProductMap.get(it.productId);
          if (!pp) {
            // If plug source but plugProduct missing, that's a data problem — fail fast
            res.status(400).json({ error: `Plug product price not found for product ${it.productId}` });
            return;
          }
          unitPrice = pp.price;
        }

        subtotal += unitPrice * it.quantity;
      }

      const groupTotal = subtotal + firstDeliveryFee;
      if (group.paymentMethod !== "P_O_D") {
        hasOnline = true;
        totalOnlineAmount += groupTotal;
      }
    }

    // ---------- Initialize Paystack ONCE if there are any online payments ----------
    const nanoid6 = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
    const internalReference = `REF-${nanoid6()}-${Date.now()}`;

    let authorizationUrl: string | null = null;
    let paymentReference: string = internalReference; // fallback to internal ref if no Paystack init
    let accessCode: string | null = null;

    if (hasOnline && totalOnlineAmount > 0) {
      const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: input.buyerEmail,
          amount: Math.round(totalOnlineAmount * 100), // kobo
          callback_url: `${frontendUrl}/payment/callback`,
          metadata: {
            id: input.id || input.subdomain || null,
            source: "pluggn",
            platform: input.platform || "Unknown",
            timestamp: Date.now(),
            internalReference,
            buyerName: input.buyerName,
            buyerPhone: input.buyerPhone,
          },
        }),
      });

      const initJson = await initRes.json();
      if (!initJson || !initJson.status) {
        console.error("Paystack init error:", initJson);
        res.status(500).json({
          error: "Paystack initialization failed",
          details: initJson?.message || "Unknown error",
        });
        return;
      }

      authorizationUrl = initJson.data.authorization_url;
      paymentReference = initJson.data.reference;
      accessCode = initJson.data.access_code ?? null;
    }

    // ---------- Create orders inside a single transaction (use the computed paymentReference) ----------
    const txResult = await prisma.$transaction(async (tx) => {
      // Re-identify plug/supplier inside transaction (for consistent selected fields)
      let txPlug: any = null;
      let txSupplier: any = null;
      let txOrderSource: "plug" | "supplier";

      if (input.id) {
        txPlug = await tx.plug.findUnique({
          where: { id: input.id },
          select: { id: true, businessName: true, subdomain: true },
        });
        if (txPlug) txOrderSource = "plug";
        else {
          txSupplier = await tx.supplier.findUnique({
            where: { id: input.id },
            select: { id: true, businessName: true, subdomain: true },
          });
          if (!txSupplier) throw new Error("Invalid id: not a plug or supplier");
          txOrderSource = "supplier";
        }
      } else if (input.subdomain) {
        txPlug = await tx.plug.findUnique({
          where: { subdomain: input.subdomain },
          select: { id: true, businessName: true, subdomain: true },
        });
        if (txPlug) txOrderSource = "plug";
        else {
          txSupplier = await tx.supplier.findUnique({
            where: { subdomain: input.subdomain },
            select: { id: true, businessName: true, subdomain: true },
          });
          if (!txSupplier) throw new Error("Store not found by subdomain");
          txOrderSource = "supplier";
        }
      } else {
        throw new Error("Either id or subdomain must be provided");
      }

      // Upsert buyer
      const buyer = await tx.buyer.upsert({
        where: { email_phone: { email: input.buyerEmail, phone: input.buyerPhone } },
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

      const createdOrders: { id: string; orderNumber: string }[] = [];

      // For each group create an order and orderItems (again fetch product/plugProduct to ensure canonical prices)
      for (const [supplierId, group] of Object.entries(groups)) {
        let subtotal = 0;
        const orderItemsToCreate: any[] = [];
        const deliveryFee = group.items[0]?.deliveryFee ?? 0;
        const deliveryLocationId = group.items[0]?.deliveryLocationId ?? null;
        const paymentMethod = group.paymentMethod;

        for (const it of group.items) {
          const prod = await tx.product.findUnique({
            where: { id: it.productId },
            select: { id: true, price: true, name: true, supplierId: true, stock: true },
          });
          if (!prod) throw new Error(`Product ${it.productId} not found`);

          // compute plugPrice if source is plug
          let plugPrice = prod.price;
          if (txOrderSource === "plug" && txPlug) {
            const pp = await tx.plugProduct.findUnique({
              where: { plugId_originalId: { plugId: txPlug.id, originalId: it.productId } },
              select: { price: true },
            });
            if (!pp) throw new Error(`PlugProduct not found for ${it.productId}`);
            plugPrice = pp.price;
          }

          subtotal += (txOrderSource === "plug" ? plugPrice : prod.price) * it.quantity;

          orderItemsToCreate.push({
            productId: it.productId,
            variantId: it.variantId || null,
            quantity: it.quantity,
            productSize: it.productSize || null,
            productColor: it.productColor || null,
            variantSize: it.variantSize || null,
            variantColor: it.variantColor || null,
            productName: prod.name,
            plugPrice,
            supplierPrice: prod.price,
            supplierId: prod.supplierId,
            plugId: txPlug?.id || null,
          });
        }

        const totalAmount = subtotal + deliveryFee;
        const orderNumber = `ORD-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${customAlphabet(
          "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
          6
        )()}`;

        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            buyerId: buyer.id,
            plugId: txPlug?.id || null,
            supplierId,
            totalAmount,
            deliveryFee,
            deliveryLocationId,
            paymentMethod,
            paymentReference, // Use Paystack's generated reference (or internal)
            platform: input.platform || "Unknown",
            buyerName: input.buyerName,
            buyerEmail: input.buyerEmail,
            buyerPhone: input.buyerPhone,
            buyerAddress: input.buyerAddress || null,
            buyerState: input.buyerState,
            buyerLga: input.buyerLga || null,
            buyerDirections: input.buyerDirections || null,
            buyerInstructions: input.buyerInstructions || null,
            status: OrderStatus.STAGED,
          },
        });

        await tx.orderItem.createMany({
          data: orderItemsToCreate.map((oi) => ({ ...oi, orderId: createdOrder.id })),
        });

        createdOrders.push({ id: createdOrder.id, orderNumber: createdOrder.orderNumber });
      }

      return {
        authorization_url: authorizationUrl,
        reference: paymentReference,
      };
    });

    
    res.status(201).json({ data: txResult });
  } catch (err) {
    next(err);
  }
}


export async function confirmOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ConfirmOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid field data!" });
      return;
    }
    const { reference } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Find staged orders with this reference
      const stagedOrders = await tx.order.findMany({
        where: { paymentReference: reference, status: "STAGED" },
        include: {
          orderItems: true,
          plug: { select: { businessName: true, subdomain: true } },
          supplier: { select: { businessName: true, subdomain: true } },
        },
      });

      if (!stagedOrders.length) throw new Error("No staged orders found for reference");

      // Separate online and P_O_D orders
      const onlineOrders = stagedOrders.filter((o) => o.paymentMethod !== "P_O_D");
      const podOrders = stagedOrders.filter((o) => o.paymentMethod === "P_O_D");

      // If there are online orders, verify Paystack ONCE
      if (onlineOrders.length > 0) {
        const totalOnline = onlineOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${paystackSecretKey}` },
        });

        const verifyJson = await verifyRes.json();
        if (!verifyJson || !verifyJson.status) {
          throw new Error("Payment verification failed");
        }
        if (verifyJson.data.status !== "success") {
          throw new Error("Payment not successful");
        }

        // Verify amount matches (Paystack amount is in kobo)
        const paystackAmount = verifyJson.data.amount;
        const expectedAmount = Math.round(totalOnline * 100);
        
        if (paystackAmount !== expectedAmount) {
          throw new Error(
            `Payment amount mismatch: expected ${expectedAmount} kobo, got ${paystackAmount} kobo`
          );
        }
      }

      // Mark ALL orders (both online and P_O_D) as PENDING and decrement stock
      for (const order of stagedOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PENDING },
        });

        // Decrease stock for items
        for (const item of order.orderItems) {
          const product = await tx.product.findUnique({ 
            where: { id: item.productId },
            select: { id: true, stock: true }
          });
          
          if (product && product.stock !== null) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: Math.max(product.stock - item.quantity, 0) },
            });
          }

          if (item.variantId) {
            const variant = await tx.productVariation.findUnique({ 
              where: { id: item.variantId },
              select: { id: true, stock: true }
            });
            
            if (variant && variant.stock !== null) {
              await tx.productVariation.update({
                where: { id: item.variantId },
                data: { stock: Math.max(variant.stock - item.quantity, 0) },
              });
            }
          }
        }
      }

      // Return business info
      const anyOrder = stagedOrders[0];
      const businessName = anyOrder?.plug?.businessName || anyOrder?.supplier?.businessName || "";
      const storeUrl = buildStoreUrl(anyOrder?.plug, anyOrder?.supplier);

      return { 
        businessName, 
        storeUrl, 
      };
    });

    res.status(200).json({ 
      message: "Orders confirmed successfully!", 
      data: result 
    });
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
