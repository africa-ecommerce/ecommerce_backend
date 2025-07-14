import { NextFunction, Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";

export async function getPlugLinkAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plugId = req.plug?.id;

    const EXPECTED_PLATFORMS = [
      "whatsApp",
      "instagram",
      "facebook",
      "twitter",
      "tiktok",
    ];
    // Get all link IDs associated with this plug
    const links = await prisma.link.findMany({
      where: { plugId },
      select: { id: true },
    });
    const linkIds = links.map((link) => link.id);

    // Count ALL orders for this plug
    const totalOrderCount = await prisma.order.count({
      where: { plugId },
    });

    // If no links, return zeros for all platforms
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

    // Group clicks by platform
    const clicks = await prisma.linkAnalytics.groupBy({
      by: ["platform"],
      where: {
        linkId: { in: linkIds },
        platform: { in: EXPECTED_PLATFORMS },
      },
      _sum: { clicks: true },
    });

    // Group orders by platform
    const orders = await prisma.order.groupBy({
      by: ["platform"],
      where: {
        plugId,
        platform: { in: EXPECTED_PLATFORMS },
      },
      _count: { platform: true },
    });

    // Initialize stats for each platform
    const platformStats = new Map<
      string,
      { platform: string; clicks: number; orders: number }
    >();
    for (const platform of EXPECTED_PLATFORMS) {
      platformStats.set(platform, {
        platform,
        clicks: 0,
        orders: 0,
      });
    }

    // Populate clicks
    for (const c of clicks) {
      if (c.platform) {
        const entry = platformStats.get(c.platform);
        if (entry) entry.clicks = c._sum.clicks || 0;
      }
    }

    // Populate orders
    for (const o of orders) {
      if (o.platform) {
        const entry = platformStats.get(o.platform);
        if (entry) entry.orders = o._count.platform || 0;
      }
    }

    // Construct final stats
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

export async function getPlugStoreAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plug = req.plug;

    if (!plug?.subdomain) {
      res.status(404).json({ error: "User store not found!" });
      return;
    }
    const analytics = await prisma.storeAnalytics.findUnique({
      where: { subdomain: plug?.subdomain },
      select: { count: true },
    });
    const visits = analytics?.count || 0;

    // Get store-specific orders
    const orders =
      (await prisma.order.count({
        where: {
          plugId: plug?.id,
          platform: "store",
        },
      })) || 0;

    // Get all orders across all platforms
    const totalOrders =
      (await prisma.order.count({
        where: { plugId: plug?.id },
      })) || 0;

    const conversionRate =
      visits > 0 ? parseFloat(((orders / visits) * 100).toFixed(2)) : 0;

    res.status(200).json({
      visits,
      orders,
      totalOrders,
      conversionRate,
    });
  } catch (error) {
    next(error);
  }
}
