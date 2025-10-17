import { NextFunction, Response } from "express";
import { AuthRequest } from "../types";
import { prisma } from "../config";


//work and improve this algorithm 
export const DEFAULT_CATEGORY_RATING = 1.0;

// scoring weights — tuning knobs
const WEIGHT_PLUGSCOUNT = 0.1;
const WEIGHT_SOLD = 0.2;
const WEIGHT_RECENT = 0.06;
const WEIGHT_REVIEW = 0.05;



// penalize factor for rejected products (multiplier < 1)
export const REJECT_PENALTY_MULTIPLIER = 0.3; // 70% penalty on score if rejected

export function daysSince(date: Date | string) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

export function computeProductBaseScore(product: any, categoryRating = DEFAULT_CATEGORY_RATING) {
  // product: plugsCount, sold, createdAt, reviewsCount
  let score = 1.0;
  if (product.plugsCount && product.plugsCount > 0) {
    score += Math.log10(product.plugsCount + 1) * WEIGHT_PLUGSCOUNT;
  }
  if (product.sold && product.sold > 0) {
    score += Math.log10(product.sold + 1) * WEIGHT_SOLD;
  }
  const days = daysSince(product.createdAt);
  if (days <= 7) score += WEIGHT_RECENT;
  if (product.reviewsCount && product.reviewsCount > 0) {
    score += Math.log10(product.reviewsCount + 1) * WEIGHT_REVIEW;
  }
  // final multiplier
  return score * categoryRating;
}

export function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


/**
 * GET /discover
 * Query params:
 *   - limit (optional): number of products to return (default 20)
 *   - pool (optional): how many candidate products to sample from before ranking (default 1000)
 *
 * Behavior:
 *  - Exclude plug's own PlugProduct inventory
 *  - Exclude accepted products (AcceptedProduct)
 *  - For rejected products, apply penalty multiplier (reduce their score). They remain candidates but less likely.
 *  - Uses PlugCategoryRating for category multiplier (fall back to DEFAULT_CATEGORY_RATING).
 *  - Returns ranked + shuffled results limited to `limit`.
 */
export const discoverProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plug = req.plug!;
    const plugId = plug.id;
    const limit = Math.min(1000, parseInt(String(req.query.limit || "20"))); // safe default
    const poolSize = Math.min(5000, parseInt(String(req.query.pool || "1000"))); // candidate pool size

    // 1) excluded: plug's plugProducts (inventory)
    const plugProducts = await prisma.plugProduct.findMany({
      where: { plugId },
      select: { originalId: true },
    });
    const excludedInventory = new Set(plugProducts.map((p) => p.originalId));

    // 2) excluded accepted productIds
    const acceptedRows = await prisma.acceptedProduct.findMany({
      where: { plugId },
      select: { productId: true },
    });
    const acceptedSet = new Set(acceptedRows.map((r) => r.productId));

    // 3) rejected products for this plug (map productId -> count)
    const rejectedRows = await prisma.rejectedProduct.findMany({
      where: { plugId },
    });
    const rejectedMap = new Map<string, number>();
    for (const r of rejectedRows) rejectedMap.set(r.productId, r.count);

    // 4) fetch plug's category ratings in bulk
    const ratingsRows = await prisma.plugCategoryRating.findMany({
      where: { plugId },
    });
    const ratingMap = new Map<string, number>(
      ratingsRows.map((r) => [r.category, r.rating])
    );

    // 5) fetch candidate pool of products from DB
    // Use a reasonable filter: status = APPROVED, stock > 0, not in inventory, not in accepted
    // We'll fetch `poolSize` newest products (could be changed to other ordering)
    const excludedIds = Array.from(
      new Set([...Array.from(excludedInventory), ...Array.from(acceptedSet)])
    );

    // raw query for decent performance with reviews count
    const candidates = await prisma.$queryRawUnsafe<any[]>(`
      SELECT p.*, (SELECT COUNT(*) FROM "Review" r WHERE r."productId" = p.id) AS "reviewsCount"
      FROM "Product" p
      WHERE p."status" = 'APPROVED'
        AND COALESCE(p."stock",0) > 0
        ${
          excludedIds.length
            ? `AND p."id" NOT IN (${excludedIds
                .map((id) => `'${id}'`)
                .join(",")})`
            : ""
        }
      ORDER BY p."createdAt" DESC
      LIMIT ${poolSize};
    `);

    // 6) compute scores, apply rejection penalty if present
    const annotated = candidates.map((p) => {
      const catRating = ratingMap.get(p.category) ?? DEFAULT_CATEGORY_RATING;
      let score = computeProductBaseScore(p, catRating);

      const rejCount = rejectedMap.get(p.id) ?? 0;
      if (rejCount > 0) {
        // penalty: stronger penalty as count increases
        const penaltyMultiplier = Math.pow(
          REJECT_PENALTY_MULTIPLIER,
          Math.min(rejCount, 4)
        ); // cap exponent to avoid underflow
        score *= penaltyMultiplier;
      }

      return { product: p, score, rejectedCount: rejCount };
    });

    // 7) sort by score descending, take top `limit`, then shuffle to avoid fixed position bias
    annotated.sort((a, b) => b.score - a.score);
    const top = annotated
      .slice(0, limit)
      .map((a) => ({
        ...a.product,
        _score: a.score,
        _rejectedCount: a.rejectedCount,
      }));

    // shuffle positions so order isn't predictable (still maintains high-score items in pool)
    const result = shuffle(top);

     res.status(200).json({ count: result.length, products: result });
  } catch (err) {
    next(err);
  }
};







/**
 * POST /discover/sync
 * Body:
 * {
 *   "accepted": ["productId1", "productId2"],
 *   "rejected": ["productId3", ...],
 *   "swipesCount": 17,
 * }
 *
 * Behavior:
 * - Upsert TrackDiscovery (increment totalSwipes)
 * - Upsert AcceptedProduct for accepted list (increment count). Also remove from rejected if present or was there before in rejected.
 * - Upsert RejectedProduct for rejected (increment count).
 * - Update PlugCategoryRating small deltas
 */
export const syncDiscovery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plug = req.plug!;
    const plugId = plug.id;
    const { accepted = [], rejected = [], swipesCount = 0 } = req.body;

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // === 1. TrackDiscovery
      await tx.trackDiscovery.upsert({
        where: { plugId },
        create: {
          plugId,
          totalSwipes: swipesCount,
          lastAction: accepted.length
            ? "accepted"
            : rejected.length
            ? "rejected"
            : null,
          lastAt: now,
        },
        update: {
          totalSwipes: { increment: swipesCount },
          lastAction: accepted.length
            ? "accepted"
            : rejected.length
            ? "rejected"
            : null,
          lastAt: now,
        },
      });

      // === 2. Gather products' categories
      const allIds = Array.from(new Set([...accepted, ...rejected]));
      const productData = await tx.product.findMany({
        where: { id: { in: allIds } },
        select: { id: true, category: true },
      });
      const categoryMap = new Map(productData.map((p) => [p.id, p.category]));

      // constants
      const ACCEPT_DELTA = 0.03;
      const REJECT_DELTA = -0.02;

      // === 3. Accepted
      for (const pid of accepted) {
        const category = categoryMap.get(pid) || "unknown";
        await tx.acceptedProduct.upsert({
          where: { plugId_productId: { plugId, productId: pid } },
          create: { plugId, productId: pid, count: 1, lastAt: now },
          update: { count: { increment: 1 }, lastAt: now },
        });
        await tx.rejectedProduct.deleteMany({
          where: { plugId, productId: pid },
        });
        await tx.plugCategoryRating.upsert({
          where: { plugId_category: { plugId, category } },
          create: {
            plugId,
            category,
            rating: DEFAULT_CATEGORY_RATING + ACCEPT_DELTA,
          },
          update: { rating: { increment: ACCEPT_DELTA } },
        });
      }

      // === 4. Rejected
      for (const pid of rejected) {
        const category = categoryMap.get(pid) || "unknown";
        await tx.rejectedProduct.upsert({
          where: { plugId_productId: { plugId, productId: pid } },
          create: { plugId, productId: pid, count: 1, lastAt: now },
          update: { count: { increment: 1 }, lastAt: now },
        });

        const existing = await tx.plugCategoryRating.findUnique({
          where: { plugId_category: { plugId, category } },
        });

        const newRating = existing
          ? Math.max(0.2, existing.rating + REJECT_DELTA)
          : Math.max(0.2, DEFAULT_CATEGORY_RATING + REJECT_DELTA);

        await tx.plugCategoryRating.upsert({
          where: { plugId_category: { plugId, category } },
          create: { plugId, category, rating: newRating },
          update: { rating: newRating },
        });
      }
    });

    res
      .status(200)
      .json({
        message: "Synced",
        acceptedCount: accepted.length,
        rejectedCount: rejected.length,
      });
  } catch (err) {
    next(err);
  }
};




export const getAcceptedProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plug = req.plug!;
    const plugId = plug.id;
    const limit = parseInt(String(req.query.limit || "100")); //how  many

    const accepted = await prisma.acceptedProduct.findMany({
      where: { plugId },
      orderBy: { lastAt: "desc" },
      take: limit,
      select: { productId: true, count: true, lastAt: true },
    });
    const ids = accepted.map((a) => a.productId);
    if (!ids.length) {
     res.status(200).json({ count: 0, products: [] });
     return;
    } 

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
      },
    });

    // preserve order of accepted list: map products by id
    const map = new Map(products.map((p) => [p.id, p]));
    const ordered = accepted.map((a) => ({
      ...map.get(a.productId),
      acceptedCount: a.count,
      lastAt: a.lastAt,
    }));

    res.status(200).json({ count: ordered.length, products: ordered });
  } catch (err) {
    next(err);
  }
};