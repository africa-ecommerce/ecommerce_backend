// import { NextFunction, Response } from "express";
// import { prisma } from "../config";
// import { AuthRequest } from "../types";

// export async function getPlugLinkAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
//   try {
//     const plugId = req.plug?.id;

//     const EXPECTED_PLATFORMS = [
//       "whatsApp",
//       "instagram",
//       "facebook",
//       "twitter",
//       "tiktok",
//     ];
//     // Get all link IDs associated with this plug
//     const links = await prisma.link.findMany({
//       where: { plugId },
//       select: { id: true },
//     });
//     const linkIds = links.map((link) => link.id);

//     // Count ALL orders for this plug
//     const totalOrderCount = await prisma.order.count({
//       where: { plugId },
//     });

//     // If no links, return zeros for all platforms
//     if (linkIds.length === 0) {
//       const emptyStats = EXPECTED_PLATFORMS.map((platform) => ({
//         platform,
//         clicks: 0,
//         orders: 0,
//         conversionRate: 0,
//       }));
//       res.status(200).json([...emptyStats, { totalOrders: totalOrderCount }]);
//       return;
//     }

//     // Group clicks by platform
//     const clicks = await prisma.linkAnalytics.groupBy({
//       by: ["platform"],
//       where: {
//         linkId: { in: linkIds },
//         platform: { in: EXPECTED_PLATFORMS },
//       },
//       _sum: { clicks: true },
//     });

//     // Group orders by platform
//     const orders = await prisma.order.groupBy({
//       by: ["platform"],
//       where: {
//         plugId,
//         platform: { in: EXPECTED_PLATFORMS },
//       },
//       _count: { platform: true },
//     });

//     // Initialize stats for each platform
//     const platformStats = new Map<
//       string,
//       { platform: string; clicks: number; orders: number }
//     >();
//     for (const platform of EXPECTED_PLATFORMS) {
//       platformStats.set(platform, {
//         platform,
//         clicks: 0,
//         orders: 0,
//       });
//     }

//     // Populate clicks
//     for (const c of clicks) {
//       if (c.platform) {
//         const entry = platformStats.get(c.platform);
//         if (entry) entry.clicks = c._sum.clicks || 0;
//       }
//     }

//     // Populate orders
//     for (const o of orders) {
//       if (o.platform) {
//         const entry = platformStats.get(o.platform);
//         if (entry) entry.orders = o._count.platform || 0;
//       }
//     }

//     // Construct final stats
//     const result = Array.from(platformStats.values()).map((item) => ({
//       platform: item.platform,
//       clicks: item.clicks,
//       orders: item.orders,
//       conversionRate:
//         item.clicks > 0
//           ? parseFloat(((item.orders / item.clicks) * 100).toFixed(2))
//           : 0,
//     }));

//     res.status(200).json([...result, { totalOrders: totalOrderCount }]);
//   } catch (error) {
//    next(error);
//   }
// }

// export async function getPlugStoreAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
//   try {
//     const plug = req.plug;

//     if (!plug?.id) {
//       res.status(404).json({ error: "User store not found!" });
//       return;
//     }
//     const analytics = await prisma.storeAnalytics.findUnique({
//       where: { plugId: plug.id },
//       select: { count: true },
//     });
//     const visits = analytics?.count || 0;

//     // Get plugstore-specific orders
//     const orders =
//       (await prisma.order.count({
//         where: {
//           plugId: plug?.id,
//           platform: "store",
//         },
//       })) || 0;

//     // Get all orders across all platforms
//     const totalOrders =
//       (await prisma.order.count({
//         where: { plugId: plug?.id },
//       })) || 0;

//     const conversionRate =
//       visits > 0 ? parseFloat(((orders / visits) * 100).toFixed(2)) : 0;

//     res.status(200).json({
//       visits,
//       orders,
//       totalOrders,
//       conversionRate,
//     });
//   } catch (error) {
//     next(error);
//   }
// }



import { NextFunction, Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { currentUser } from "../helper/helperFunc";

/**
 * Get link analytics for both Plugs and Suppliers
 */
export async function getLinkAnalytics(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = currentUser(req); // 🧩 unified helper
    const { type, id } = user;

    const EXPECTED_PLATFORMS = [
      "whatsApp",
      "instagram",
      "facebook",
      "twitter",
      "tiktok",
    ];

    // 🔹 Get all links for this user
    const links = await prisma.link.findMany({
      where: type === "PLUG" ? { plugId: id } : { supplierId: id },
      select: { id: true },
    });

    const linkIds = links.map((l) => l.id);

    // 🔹 Count all orders belonging to this user
    const totalOrderCount = await prisma.order.count({
      where: type === "PLUG" ? { plugId: id } : { supplierId: id },
    });

    // If no links, return empty stats
    if (linkIds.length === 0) {
      const emptyStats = EXPECTED_PLATFORMS.map((platform) => ({
        platform,
        clicks: 0,
        orders: 0,
        conversionRate: 0,
      }));

      res.status(200).json([...emptyStats, { totalOrders: totalOrderCount }]);
      return;
    }

    // 🔹 Group clicks by platform
    const clicks = await prisma.linkAnalytics.groupBy({
      by: ["platform"],
      where: {
        linkId: { in: linkIds },
        platform: { in: EXPECTED_PLATFORMS },
      },
      _sum: { clicks: true },
    });

    // 🔹 Group orders by platform
    const orders = await prisma.order.groupBy({
      by: ["platform"],
      where: {
        ...(type === "PLUG" ? { plugId: id } : { supplierId: id }),
        platform: { in: EXPECTED_PLATFORMS },
      },
      _count: { platform: true },
    });

    // 🔹 Prepare platform stats
    const platformStats = new Map<
      string,
      { platform: string; clicks: number; orders: number }
    >();
    for (const p of EXPECTED_PLATFORMS) {
      platformStats.set(p, { platform: p, clicks: 0, orders: 0 });
    }

    for (const c of clicks) {
      if (c.platform) {
        const stat = platformStats.get(c.platform);
        if (stat) stat.clicks = c._sum.clicks || 0;
      }
    }

    for (const o of orders) {
      if (o.platform) {
        const stat = platformStats.get(o.platform);
        if (stat) stat.orders = o._count.platform || 0;
      }
    }

    // 🔹 Final result
    const result = Array.from(platformStats.values()).map((item) => ({
      platform: item.platform,
      clicks: item.clicks,
      orders: item.orders,
      conversionRate:
        item.clicks > 0
          ? parseFloat(((item.orders / item.clicks) * 100).toFixed(2))
          : 0,
    }));

    res.status(200).json([...result, { totalOrders: totalOrderCount }]);
  } catch (error) {
    next(error);
  }
}

/**
 * Generalized store analytics for both Plug and Supplier users
 */
export async function getStoreAnalytics(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = currentUser(req); // 🧩 unified helper
    const { type, id } = user;

    // 🔹 Store analytics
    const analytics = await prisma.storeAnalytics.findUnique({
      where: type === "PLUG" ? { plugId: id } : { supplierId: id },
      select: { count: true },
    });

    const visits = analytics?.count || 0;

    // 🔹 Orders via store
    const storeOrders = await prisma.order.count({
      where: {
        ...(type === "PLUG" ? { plugId: id } : { supplierId: id }),
        platform: "store",
      },
    });

    // 🔹 Total orders across all platforms
    const totalOrders = await prisma.order.count({
      where: type === "PLUG" ? { plugId: id } : { supplierId: id },
    });

    const conversionRate =
      visits > 0 ? parseFloat(((storeOrders / visits) * 100).toFixed(2)) : 0;

    res.status(200).json({
      visits,
      orders: storeOrders,
      totalOrders,
      conversionRate,
    });
  } catch (error) {
    next(error);
  }
}
