import { NextFunction, Request, Response } from "express";
import {
  StageOrderSchema,
  ConfirmOrderSchema,
  BuyerInfoSchema,
} from "../lib/zod/schema";
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

    // ---------- DETERMINE ORDER SOURCE ----------
    let plug: any = null;
    let supplierFallback: any = null;
    let orderSource: "plug" | "supplier";

    if (input.id) {
      plug = await prisma.plug.findUnique({
        where: { id: input.id },
        select: { id: true, businessName: true, subdomain: true },
      });
      if (plug) orderSource = "plug";
      else {
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
      if (plug) orderSource = "plug";
      else {
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
      res
        .status(400)
        .json({ error: "Either id or subdomain must be provided" });
      return;
    }

    // ---------- GROUP ITEMS BY SUPPLIER ----------
    const groups = input.orderItems.reduce(
      (acc: Record<string, any>, item: any) => {
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
      },
      {}
    );

    // ---------- FETCH PRODUCTS ----------
    const productIds = Array.from(
      new Set(input.orderItems.map((i: any) => i.productId))
    );
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, name: true, supplierId: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // ---------- FETCH PLUG PRODUCTS ----------
    const plugProductMap = new Map<string, { price: number }>();
    if (orderSource === "plug" && plug) {
      const plugProducts = await prisma.plugProduct.findMany({
        where: { plugId: plug.id, originalId: { in: productIds } },
        select: { originalId: true, price: true },
      });
      for (const pp of plugProducts)
        plugProductMap.set(pp.originalId, { price: pp.price });
    }

    // ---------- COMPUTE TOTALS ----------
    let totalOnlineAmount = 0;
    let hasOnline = false;

    for (const [_, groupRaw] of Object.entries(groups)) {
      const group = groupRaw as any;
      let subtotal = 0;
      const firstDeliveryFee = group.items[0]?.deliveryFee ?? 0;

      for (const it of group.items) {
        const prod = productMap.get(it.productId);
        if (!prod) {
          res.status(400).json({ error: `Product ${it.productId} not found` });
          return;
        }

        let unitPrice = prod.price;
        if (orderSource === "plug" && plug) {
          const pp = plugProductMap.get(it.productId);
          if (!pp) {
            res.status(400).json({
              error: `Plug product price not found for ${it.productId}`,
            });
            return;
          }
          unitPrice = pp.price;
        }

        subtotal += unitPrice * it.quantity;
      }

      // If this group is pay on delivery, don't include delivery fee or subtotal in online payment
      if (group.paymentMethod !== "P_O_D") {
        hasOnline = true;
        // Include both subtotal and delivery fee (since it's online)
        totalOnlineAmount += subtotal + firstDeliveryFee;
      } else {
        // For P_O_D, do not add anything to paystack total
        // You can still log it if needed for tracking
        console.log(
          `Skipping P_O_D group ${group.supplierId} from paystack total`
        );
      }
    }

    // ---------- INITIALIZE PAYSTACK ONCE ----------
    const nanoid6 = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
    const internalReference = `REF-${nanoid6()}-${Date.now()}`;

    let authorizationUrl: string | null = null;
    let paymentReference: string = internalReference;
    let accessCode: string | null = null;

    if (hasOnline && totalOnlineAmount > 0) {
      const initRes = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: input.buyerEmail,
            amount: Math.round(totalOnlineAmount * 100),
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
        }
      );

      const initJson = await initRes.json();
      if (!initJson?.status) {
        console.error("Paystack init error:", initJson);
        res.status(500).json({ error: "Paystack initialization failed" });
        return;
      }

      authorizationUrl = initJson.data.authorization_url;
      paymentReference = initJson.data.reference;
      accessCode = initJson.data.access_code ?? null;
    }

    // ---------- CREATE ORDERS ----------
    const txResult = await prisma.$transaction(async (tx) => {
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

      for (const [_, groupRaw] of Object.entries(groups)) {
        const group = groupRaw as any;
        let subtotal = 0;
        const orderItemsToCreate: any[] = [];
        const deliveryFee = group.items[0]?.deliveryFee ?? 0;
        const deliveryLocationId = group.items[0]?.deliveryLocationId ?? null;
        const paymentMethod = group.paymentMethod;

      for (const it of group.items) {
        // Always find parent product
        const prod = await tx.product.findUnique({
          where: { id: it.productId },
          select: { id: true, name: true, price: true, supplierId: true },
        });
        if (!prod) throw new Error(`Product ${it.productId} not found`);

        let plugPrice = 0;
        if (orderSource === "plug" && plug) {
          const pp = await tx.plugProduct.findUnique({
            where: {
              plugId_originalId: {
                plugId: plug.id,
                originalId: it.productId,
              },
            },
            select: { price: true },
          });
          if (!pp) throw new Error(`PlugProduct not found for ${it.productId}`);
          plugPrice = pp.price;
        }

        // 🔍 Variant logic
        let variantData: any = null;
        if (it.variantId) {
          variantData = await tx.productVariation.findUnique({
            where: { id: it.variantId },
            select: { id: true, size: true, colors: true, stock: true },
          });
          if (!variantData) {
            throw new Error(
              `Variant ${it.variantId} not found for product ${it.productId}`
            );
          }
        }

        // Compute subtotal correctly
        const unitPrice = orderSource === "plug" ? plugPrice : prod.price;
        subtotal += unitPrice * it.quantity;

        // ✅ Push to create list with full variant info if present
        orderItemsToCreate.push({
          productId: it.productId,
          variantId: variantData?.id || null,
          quantity: it.quantity,
          productName: prod.name,
          plugPrice: plugPrice > 0 ? plugPrice : null,
          supplierPrice: prod.price,
          supplierId: prod.supplierId,
          plugId: plug?.id || null,
          productSize: variantData ? null : it.size || null, // fallback if no variant
          productColor: variantData ? null : it.color || null,
          variantSize: variantData?.size || null,
          variantColor: variantData?.colors?.[0] || null, // if color array exists
        });
      }


        const totalAmount = subtotal + deliveryFee;
        const orderNumber = `ORD-${new Date()
          .toISOString()
          .slice(2, 10)
          .replace(/-/g, "")}-${nanoid6()}`;

        // ✅ Create the order first
        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            buyerId: buyer.id,
            plugId: plug?.id || null,
            supplierId: group.supplierId,
            totalAmount,
            deliveryFee,
            deliveryLocationId,
            paymentMethod,
            paymentReference,
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

        // ✅ Then create the order items with that orderId
        await tx.orderItem.createMany({
          data: orderItemsToCreate.map((oi) => ({
            ...oi,
            orderId: createdOrder.id,
          })),
        });
      }

      return {
        authorization_url: authorizationUrl,
        reference: paymentReference,
      };
    });

    res.status(201).json({ data: txResult });
  } catch (err) {
    console.error("Route Error:", err);
    next(err);
  }
}

export async function confirmOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = ConfirmOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid field data!" });
      return;
    }

    const { reference } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Find all staged orders for this payment reference
      const stagedOrders = await tx.order.findMany({
        where: { paymentReference: reference, status: "STAGED" },
        include: {
          orderItems: true,
          plug: { select: { id: true, businessName: true, subdomain: true } },
          supplier: {
            select: { id: true, businessName: true, subdomain: true },
          },
        },
      });

      if (!stagedOrders.length)
        throw new Error("No staged orders found for reference");

      // Separate online vs POD orders
      const onlineOrders = stagedOrders.filter(
        (o) => o.paymentMethod !== "P_O_D"
      );

      // Verify paystack only if there are online orders
      if (onlineOrders.length > 0) {
        const totalOnline = onlineOrders.reduce(
          (sum, o) => sum + o.totalAmount,
          0
        );

        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${reference}`,
          { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
        );

        const verifyJson = await verifyRes.json();
        if (!verifyJson?.status) throw new Error("Payment verification failed");
        if (verifyJson.data.status !== "success")
          throw new Error("Payment was not successful");

        const paystackAmount = verifyJson.data.amount;
        const expectedAmount = Math.round(totalOnline * 100);

        if (paystackAmount !== expectedAmount) {
          throw new Error(
            `Payment amount mismatch: expected ${expectedAmount} kobo, got ${paystackAmount} kobo`
          );
        }
      }

      // Process each staged order
      for (const order of stagedOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PENDING" },
        });

        // ---- Compute supplier payout ----
        let supplierPayoutAmount = 0;

        if (order.plugId) {
          // ✅ If this was a plug order, calculate supplier payout using supplierPrice from orderItems
          supplierPayoutAmount = order.orderItems.reduce(
            (sum, item) => sum + item.supplierPrice * item.quantity,
            0
          );
        } else {
          // ✅ If supplier order directly, use the order.totalAmount (already supplier-based)
          supplierPayoutAmount = order.totalAmount;
        }

        // --- Create SupplierPayment if missing ---
        const existingSupplierPayment = await tx.supplierPayment.findFirst({
          where: { orderId: order.id, supplierId: order.supplierId! },
        });

        if (!existingSupplierPayment) {
          await tx.supplierPayment.create({
            data: {
              orderId: order.id,
              supplierId: order.supplierId!,
              amount: supplierPayoutAmount,
              // status defaults to UNPAID
            },
          });
        }

        // --- Create PlugPayment if applicable ---
        if (order.plugId) {
          const existingPlugPayment = await tx.plugPayment.findFirst({
            where: { orderId: order.id, plugId: order.plugId },
          });

          if (!existingPlugPayment) {
            await tx.plugPayment.create({
              data: {
                orderId: order.id,
                plugId: order.plugId,
                amount: order.totalAmount, // plug’s revenue including markup
                // status defaults to UNPAID
              },
            });
          }
        }
      }

      // Return store info for redirect or confirmation
      const first = stagedOrders[0];
      const businessName =
        first.plug?.businessName || first.supplier?.businessName || "";
      const storeUrl = first.plug?.subdomain
        ? `https://${first.plug.subdomain}.pluggn.store`
        : first.supplier?.subdomain
        ? `https://${first.supplier.subdomain}.pluggn.store`
        : "";

      return { businessName, storeUrl };
    });

    res.status(200).json({
      message: "Orders confirmed successfully!",
      data: result,
    });
  } catch (err) {
    console.error("ConfirmOrder Error:", err);
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

    const data = orders;
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

    // Typecast safely
    const status = statusParam as OrderStatus | undefined;

    const orders = await prisma.order.findMany({
      where: {
        supplierId,
        ...(status ? { status } : {}), // ✅ FIXED: direct match
      },
      include: {
        orderItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      message: "Orders fetched successfully!",
      data: orders,
    });
    return; // ✅ prevents TypeScript complaining about missing return
  } catch (error) {
    next(error);
  }
}



export async function processSupplierOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const supplierId = req.supplier?.id!;
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ message: "Order ID is required." });
      return;
    }

    // Fetch order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order || order.supplierId !== supplierId) {
      res.status(404).json({ message: "Order not found for this supplier." });
      return;
    }

    if (order.status !== OrderStatus.PENDING) {
      res
        .status(400)
        .json({ message: "Only pending orders can be processed." });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        if (item.quantity <= 0) continue;


        console.log("yes")
        if (item.variantId) {
          // Update the variation stock
          const variant = await tx.productVariation.findUnique({
            where: { id: item.variantId },
            select: { id: true, stock: true },
          });

           console.log("variant", variant)
          if (variant) {
           const updatedProductVariation =  await tx.productVariation.update({
              where: { id: variant.id },
              data: {
                stock: Math.max((variant.stock ?? 0) - item.quantity, 0),
              },
            });

             console.log("updatedProductVariation", updatedProductVariation)
          }

          // Optional: also increment sold on the parent product
          const parentProduct = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, sold: true },
          });

          console.log("parentProduct", parentProduct)

          if (parentProduct) {
          const updatedProduct =  await tx.product.update({
              where: { id: parentProduct.id },
              data: {
                sold: (parentProduct.sold ?? 0) + item.quantity,
              },
            });
            console.log("updatedProduct", updatedProduct)
          }
        } else {
          // No variant: update product stock and sold
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, stock: true, sold: true },
          });
          console.log("product", product)

          if (product) {
          const updated =   await tx.product.update({
              where: { id: product.id },
              data: {
                stock: Math.max((product.stock ?? 0) - item.quantity, 0),
                sold: (product.sold ?? 0) + item.quantity,
              },
            });
            console.log("updated", updated)
          }
        }
      }

      // Update order status to processed
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PROCESSED },
      });
    });

    res.status(200).json({ message: "Order processed successfully!" });
  } catch (error) {
    next(error);
  }
}

// -------------------- CANCEL SUPPLIER ORDER --------------------
export async function cancelSupplierOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const supplierId = req.supplier?.id!;
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ message: "Order ID is required." });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, supplierId: true, status: true },
    });

    if (!order || order.supplierId !== supplierId) {
      res.status(404).json({ message: "Order not found for this supplier." });
      return;
    }

    if (order.status === OrderStatus.CANCELLED) {
      res.status(400).json({ message: "Order already cancelled." });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    res.status(200).json({
      message: "Order cancelled successfully!",
    });
    return;
  } catch (error) {
    next(error);
  }
}
