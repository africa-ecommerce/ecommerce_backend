import { prisma } from "../../../config";
import { Response, NextFunction, Request } from "express";
import { AuthRequest } from "../../../types";

export async function trackShareAnalytics(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { platform } = req.body;
    const userId = req.user?.id;


    console.log(platform)
    console.log(userId);
    if (!userId || !platform || typeof platform !== "string") {
       res
        .status(400)
        .json({ error: "Missing or invalid user or platform" });
        return;
    }

    const normalizedPlatform = platform.trim().toLowerCase();

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    await prisma.shareAnalytics.upsert({
      where: {
        userId_platform_date: {
          userId,
          platform: normalizedPlatform,
          date: today,
        },
      },
      update: {
        shares: { increment: 1 },
      },
      create: {
        userId,
        platform: normalizedPlatform,
        date: today,
        shares: 1,
      },
    });

     res.status(200).json({ message: "Share tracked successfully" });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/share?userId=abc123&platform=instagram&fromDate=2025-08-01&toDate=2025-08-07

export async function getShareAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, platform, fromDate, toDate } = req.query;

    const where: any = {};

    if (userId) where.userId = userId;
    if (platform) where.platform = platform;
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate as string);
      if (toDate) where.date.lte = new Date(toDate as string);
    }

    const analytics = await prisma.shareAnalytics.findMany({
      where,
      orderBy: { date: "desc" },
    });

    res.status(200).json({ analytics });
    return;
  } catch (err) {
    next(err);
  }
}
