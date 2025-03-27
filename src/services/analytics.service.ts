// src/services/analytics.service.ts
import { prisma } from "../config";

export const getSalesAnalytics = async (merchantId: string) => {
  const orders = await prisma.order.findMany({ where: { merchantId } });
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  return { totalOrders, totalRevenue };
};

export const getInventoryAnalytics = async (merchantId: string) => {
  const products = await prisma.product.findMany({ where: { merchantId } });
  // Calculate total inventory and flag low-stock products
  const totalInventory = products.reduce(
    (acc, product) => acc + product.inventory,
    0
  );
  const lowStock = products.filter((p) => p.inventory < 5);
  return { totalInventory, lowStock };
};









// import { PrismaClient } from "@prisma/client";
// import { Queue } from "bullmq";
// import { createClient } from "redis";

// const prisma = new PrismaClient();
// const redis = createClient({ url: process.env.REDIS_URL });
// const analyticsQueue = new Queue("analytics", { connection: redis });

// // Real-time event tracking
// export const trackEvent = async (eventType: string, payload: any) => {
//   await analyticsQueue.add(eventType, {
//     timestamp: new Date(),
//     ...payload,
//   });
// };

// // Aggregation worker
// export const createAnalyticsWorker = () => {
//   const worker = new Worker(
//     "analytics",
//     async (job) => {
//       switch (job.name) {
//         case "PRODUCT_VIEW":
//           await prisma.productAnalytics.upsert({
//             where: { productId: job.data.productId },
//             update: { views: { increment: 1 } },
//             create: {
//               productId: job.data.productId,
//               views: 1,
//             },
//           });
//           break;

//         case "ORDER_COMPLETED":
//           await prisma.$transaction([
//             prisma.merchantAnalytics.upsert({
//               where: { merchantId: job.data.merchantId },
//               update: {
//                 totalRevenue: { increment: job.data.amount },
//                 ordersCount: { increment: 1 },
//               },
//               create: {
//                 merchantId: job.data.merchantId,
//                 totalRevenue: job.data.amount,
//                 ordersCount: 1,
//               },
//             }),
//             prisma.customerAnalytics.upsert({
//               where: { customerId: job.data.customerId },
//               update: {
//                 lifetimeValue: { increment: job.data.amount },
//                 ordersCount: { increment: 1 },
//               },
//               create: {
//                 customerId: job.data.customerId,
//                 lifetimeValue: job.data.amount,
//                 ordersCount: 1,
//               },
//             }),
//           ]);
//           break;
//       }
//     },
//     { connection: redis }
//   );
// };
