import { NextFunction, Response } from "express";
import { AuthRequest } from "../types";
import { prisma } from "../config";

// constants
export const DEFAULT_CATEGORY_RATING = 1.0;
const WEIGHT_PLUGSCOUNT = 0.1;
const WEIGHT_SOLD = 0.2;
const WEIGHT_RECENT = 0.06;
const WEIGHT_REVIEW = 0.05;
export const REJECT_PENALTY_MULTIPLIER = 0.3;

// --- utils ---
function daysSince(date: Date | string) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function computeProductBaseScore(
  product: any,
  categoryRating = DEFAULT_CATEGORY_RATING
) {
  let score = 1.0;
  if (product.plugsCount && product.plugsCount > 0)
    score += Math.log10(product.plugsCount + 1) * WEIGHT_PLUGSCOUNT;
  if (product.sold && product.sold > 0)
    score += Math.log10(product.sold + 1) * WEIGHT_SOLD;
  if (daysSince(product.createdAt) <= 7) score += WEIGHT_RECENT;
  if (product.reviewsCount && product.reviewsCount > 0)
    score += Math.log10(product.reviewsCount + 1) * WEIGHT_REVIEW;
  return score * categoryRating;
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// fixes BigInt serialization
function normalizeBigInt(obj: any): any {
  if (Array.isArray(obj)) return obj.map(normalizeBigInt);
  if (obj && typeof obj === "object") {
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "bigint") normalized[key] = Number(value);
      else if (typeof value === "object")
        normalized[key] = normalizeBigInt(value);
      else normalized[key] = value;
    }
    return normalized;
  }
  return obj;
}

/**
 * GET /discover
 * Paginated discovery algorithm.
 */
export const discoverProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plug = req.plug!;
    const plugId = plug.id;
    const limit = Math.min(1000, parseInt(String(req.query.limit || "20")));
    const poolSize = Math.min(5000, parseInt(String(req.query.pool || "1000")));

    // 1️⃣ excluded: plug's own products
    const plugProducts = await prisma.plugProduct.findMany({
      where: { plugId },
      select: { originalId: true },
    });
    const excludedInventory = plugProducts.map((p) => p.originalId);

    // 2️⃣ excluded: accepted
    const acceptedRows = await prisma.acceptedProduct.findMany({
      where: { plugId },
      select: { productId: true },
    });
    const acceptedIds = acceptedRows.map((r) => r.productId);

    // 3️⃣ rejected: map productId -> count
    const rejectedRows = await prisma.rejectedProduct.findMany({
      where: { plugId },
    });
    const rejectedMap = new Map<string, number>();
    for (const r of rejectedRows) rejectedMap.set(r.productId, r.count);

    // 4️⃣ category ratings
    const ratingsRows = await prisma.plugCategoryRating.findMany({
      where: { plugId },
    });
    const ratingMap = new Map<string, number>(
      ratingsRows.map((r) => [r.category, r.rating])
    );

    // 5️⃣ candidate pool query
    const excludedIds = [...excludedInventory, ...acceptedIds];
    const exclusionSql =
      excludedIds.length > 0
        ? `AND p."id" NOT IN (${excludedIds.map((id) => `'${id}'`).join(",")})`
        : "";

    const candidates = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        p.*, 
        CAST((SELECT COUNT(*) FROM "Review" r WHERE r."productId" = p.id) AS INT) AS "reviewsCount"
      FROM "Product" p
      WHERE p."status" = 'APPROVED'
        AND COALESCE(p."stock",0) > 0
        ${exclusionSql}
      ORDER BY p."createdAt" DESC
      LIMIT ${poolSize};
    `);

    // 6️⃣ score computation
    const annotated = candidates.map((p) => {
      const catRating = ratingMap.get(p.category) ?? DEFAULT_CATEGORY_RATING;
      let score = computeProductBaseScore(p, catRating);

      const rejCount = rejectedMap.get(p.id) ?? 0;
      if (rejCount > 0) {
        const penaltyMultiplier = Math.pow(
          REJECT_PENALTY_MULTIPLIER,
          Math.min(rejCount, 4)
        );
        score *= penaltyMultiplier;
      }

      return { ...p, _score: score, _rejectedCount: rejCount };
    });


    // 7️⃣ sort & shuffle
    annotated.sort((a, b) => b._score - a._score);
    const top = shuffle(annotated.slice(0, limit));


    // 8️⃣ hasNextPage detection (true if there are more than limit items available)
    const hasNextPage = annotated.length > limit;


    // 9️⃣ response — normalize and fix image arrays
    for (const p of top) {
      if (typeof p.images === "string") {
        try {
          p.images = JSON.parse(p.images);
        } catch {
          p.images = [];
          
        }
      }
    }

    res.status(200).json({
      meta: { hasNextPage },
      data: normalizeBigInt(top),
    });
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

    res.status(200).json({
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
