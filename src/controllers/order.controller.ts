// src/controllers/order.controller.ts
import { Request, Response } from "express";
import {
  createOrder,
  getOrdersByMerchant,
  getOrderById,
  updateOrderStatus,
} from "../services/order.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const placeOrder = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const { customerName, customerEmail, items, total } = req.body;
    const order = await createOrder(
      merchantId,
      customerName,
      customerEmail,
      items,
      total
    );
    res.status(201).json({ order });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};


// export const createOrder = async (
//   req: Request<{}, {}, { items: OrderItem[] }>,
//   res: Response
// ) => {
//   try {
//     const merchantId = req.merchant!.id;
//     const { items } = req.body;

//     // Validate and reserve inventory
//     const products = await prisma.product.findMany({
//       where: { id: { in: items.map((i) => i.productId) } },
//     });

//     const inventoryErrors = [];
//     for (const item of items) {
//       const product = products.find((p) => p.id === item.productId);
//       if (!product) {
//         inventoryErrors.push(`Product ${item.productId} not found`);
//         continue;
//       }
//       if (product.inventory < item.quantity) {
//         inventoryErrors.push(`Insufficient stock for ${product.name}`);
//       }
//     }

//     if (inventoryErrors.length > 0) {
//       return res.status(400).json({ errors: inventoryErrors });
//     }

//     // Calculate total
//     const total = items.reduce((sum, item) => {
//       const product = products.find((p) => p.id === item.productId)!;
//       return sum + product.price * item.quantity;
//     }, 0);

//     // Create order record
//     const order = await prisma.order.create({
//       data: {
//         items: items.map((item) => ({
//           productId: item.productId,
//           quantity: item.quantity,
//           price: products.find((p) => p.id === item.productId)!.price,
//         })),
//         total,
//         merchantId,
//         status: "PENDING",
//       },
//     });

//     // Initiate payment
//     const paymentLink = await initFlutterwavePayment({
//       amount: total,
//       email: "", // Get from customer
//       tx_ref: order.id,
//       currency: "NGN",
//     });

//     res.status(201).json({ order, paymentLink });
//   } catch (error) {
//     console.error("[Order Creation Error]", error);
//     res.status(500).json({ error: "Order processing failed" });
//   }
// };




export const listOrders = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const orders = await getOrdersByMerchant(merchantId);
    res.json({ orders });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getOrderDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await getOrderById(id);
    // if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const changeOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await updateOrderStatus(id, status);
    res.json({ order });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
