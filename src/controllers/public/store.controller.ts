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



export async function pixelStoreVisitTracker(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const subdomain = (req.query.subdomain || "")
      .toString()
      .trim()
      .toLowerCase();

    if (!subdomain) {
       res.status(400).json({ error: "Missing or invalid subdomain!" });
       return
    }

    // Try finding a plug first
    const plug = await prisma.plug.findUnique({
      where: { subdomain },
      select: { id: true },
    });

    // Try finding a supplier if no plug found
    let supplier = null;
    if (!plug) {
      supplier = await prisma.supplier.findUnique({
        where: { subdomain },
        select: { id: true },
      });

      if (!supplier) {
         res
          .status(404)
          .json({ error: "Cannot find store for this subdomain!" });
          return;
      }
    }

    // Determine what to upsert based on what was found
    const analyticsData = plug
      ? { plugId: plug.id, supplierId: null }
      : { plugId: null, supplierId: supplier!.id };

    // We need a unique key for upsert, since plugId and supplierId are unique but nullable.
    // Prisma cannot directly upsert by a composite nullable key,
    // so we must dynamically pick the right unique field.
    const whereClause = plug
      ? { plugId: plug.id }
      : { supplierId: supplier!.id };

    await prisma.storeAnalytics.upsert({
      where: whereClause,
      update: { count: { increment: 1 } },
      create: {
        ...analyticsData,
        count: 1,
      },
    });

    res.status(204).end(); // No content
  } catch (error) {
    next(error);
  }
}



// export const getSupplierStorePolicy = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {


//      const subdomain = (req.query.subdomain || "")
//        .toString()
//        .trim()
//        .toLowerCase();

//      if (!subdomain) {
//        res.status(400).json({ error: "Missing or invalid subdomain!" });
//        return;
//      }

//      const supplier = await prisma.supplier.findUnique({
//              where: { subdomain },
//              select: { id: true },
//            });

//       if (!supplier) {
//       res.status(404).json({ error: "Subdomain not found!" });
//       return;
//     }
//     const supplierId = supplier.id;

//     const supplierStorePolicy = await prisma.supplierStorePolicy.findUnique({
//       where: { supplierId },
//     });

//     if (!supplierStorePolicy) {
//       res.status(404).json({ error: "Store policy not found!" });
//       return;
//     }

//     res.status(200).json({ data: supplierStorePolicy });
//   } catch (error) {
//     next(error);
//   }
// };