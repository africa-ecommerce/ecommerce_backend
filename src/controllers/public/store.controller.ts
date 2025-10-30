import { NextFunction, Request, Response } from "express";
import { getStoreConfigFromMinio } from "../../helper/minioObjectStore/storeConfig";
import { prisma } from "../../config";

export const getStoreConfig = async (req: Request, res: Response, next: NextFunction) => {
  const subdomain = (req.query.subdomain || "").toString().trim().toLowerCase();
  if (!subdomain) {
    res.status(400).json({ error: "Missing or invalid field data!" });
    return;
  }

  try {
    const config = await getStoreConfigFromMinio(subdomain);
    if (!config) {
      res.status(404).json({ error: "No config found for store!" });
      return;
    }
    res.status(200).json(config);
  } catch (error) {
    next(error);
  }
};

export const verifySubdomain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const subdomain = (req.query.subdomain || "").toString().trim().toLowerCase();

  if (!subdomain) {
    res.status(400).json({ error: "Missing or invalid field data!" });
    return;
  }

  try {
    // Check both Plug and Supplier in parallel
    const [plug, supplier] = await Promise.all([
      prisma.plug.findUnique({
        where: { subdomain },
        select: { subdomain: true },
      }),
      prisma.supplier.findUnique({
        where: { subdomain },
        select: { subdomain: true },
      }),
    ]);

    const exists = !!plug?.subdomain || !!supplier?.subdomain;

    res.status(200).json({ exists });
  } catch (error) {
    next(error);
  }
};



export async function pixelStoreVisitTracker(req: Request, res: Response, next: NextFunction) {
  try {
    const subdomain = (req.query.subdomain || "")
      .toString()
      .trim()
      .toLowerCase();

      if (!subdomain) {
        res.status(400).json({ error: "Missing or invalid field data!" });
        return;
      }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

        const plug = await prisma.plug.findUnique({
          where: { subdomain },
          select: { id: true },
        });

        if (!plug) {
          res.status(404).json({ error: "Cannot find store for this subdomain!" });
          return;
        }
    // Try to update if exists or create a new record
    await prisma.storeAnalytics.upsert({
      where: { plugId: plug.id },
      update: { count: { increment: 1 } },
      create: {
        plugId: plug.id,
        count: 1,
      },
    });

    // Send minimal response
    res.status(204).end(); // No content
  } catch (error) {
    next(error);
  }
}