// src/controllers/analytics.controller.ts
import { Request, Response } from "express";
import {
  getSalesAnalytics,
  getInventoryAnalytics,
} from "../services/analytics.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const salesAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const analytics = await getSalesAnalytics(merchantId);
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const inventoryAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.merchant.id;
    const analytics = await getInventoryAnalytics(merchantId);
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};








// export const getMerchantInsights = async (req: Request, res: Response) => {
//   const merchantId = req.merchant!.id;

//   const [sales, customers, inventory] = await Promise.all([
//     prisma.merchantAnalytics.findUnique({
//       where: { merchantId },
//       select: { totalRevenue: true, ordersCount: true },
//     }),
//     prisma.customerAnalytics.findMany({
//       where: { merchantId },
//       orderBy: { lifetimeValue: "desc" },
//       take: 10,
//     }),
//     prisma.productAnalytics.findMany({
//       where: { product: { merchantId } },
//       include: { product: true },
//       orderBy: { views: "desc" },
//       take: 5,
//     }),
//   ]);

//   res.json({
//     totalRevenue: sales?.totalRevenue || 0,
//     averageOrderValue: sales ? sales.totalRevenue / sales.ordersCount : 0,
//     topCustomers: customers,
//     popularProducts: inventory,
//   });
// };
