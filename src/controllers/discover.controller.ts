import { NextFunction, Response } from "express";
import { AuthRequest } from "../types";
import { prisma } from "../config";
import { discoverCache } from "../helper/cache/discoverCache";

// --- Constants ---
export const DEFAULT_CATEGORY_RATING = 1.0;
const WEIGHT_PLUGSCOUNT = 0.1;
const WEIGHT_SOLD = 0.2;
const WEIGHT_RECENT = 0.06;
const WEIGHT_REVIEW = 0.05;
export const REJECT_PENALTY_MULTIPLIER = 0.3;

// --- Utils ---
function daysSince(date: Date | string) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function computeProductBaseScore(product: any, categoryRating = DEFAULT_CATEGORY_RATING) {
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

function normalizeBigInt(obj: any): any {
  if (Array.isArray(obj)) return obj.map(normalizeBigInt);
  if (obj && typeof obj === "object") {
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "bigint") normalized[key] = Number(value);
      else if (typeof value === "object") normalized[key] = normalizeBigInt(value);
      else normalized[key] = value;
    }
    return normalized;
  }
  return obj;
}

// 🔒 Simple in-memory lock to prevent concurrent stack builds
const stackLocks = new Set<string>();

// 🚀 MAIN ENDPOINT
export const discoverProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plug = req.plug!;
    const plugId = String(plug.id); // Ensure consistent cache key type
    const page = parseInt(String(req.query.page || "1"));
    const limit = Math.min(100, parseInt(String(req.query.limit || "20")));
    const cacheKey = `discover_stack_${plugId}`;
    console.log("plugid", plugId);
    console.log("cacheKey", cacheKey);

    // --- 1️⃣ Try cache first ---
    let cachedStack = discoverCache.get<{ ids: string[]; createdAt: number }>(cacheKey);

     console.log("cachedStack", cachedStack);

    if (!cachedStack) {
      // prevent concurrent rebuilds
      if (stackLocks.has(cacheKey)) {
        console.log("⏳ Waiting for ongoing stack build:", plugId);
        let retries = 0;
        while (!discoverCache.get(cacheKey) && retries < 20) {
          await new Promise((r) => setTimeout(r, 300));
          retries++;
        }
        cachedStack = discoverCache.get(cacheKey);
      }

      // if still not cached, generate new stack
      if (!cachedStack) {
        stackLocks.add(cacheKey);
        console.log("🧠 Generating new discovery stack for plug:", plugId);

        // --- Exclusions ---
        const plugProducts = await prisma.plugProduct.findMany({
          where: { plugId },
          select: { originalId: true },
        });
        const excludedInventory = plugProducts.map((p) => p.originalId);

        const acceptedRows = await prisma.acceptedProduct.findMany({
          where: { plugId },
          select: { productId: true },
        });
        const acceptedIds = acceptedRows.map((r) => r.productId);

        const rejectedRows = await prisma.rejectedProduct.findMany({
          where: { plugId },
        });
        const rejectedMap = new Map<string, number>();
        for (const r of rejectedRows) rejectedMap.set(r.productId, r.count);

        const ratingsRows = await prisma.plugCategoryRating.findMany({
          where: { plugId },
        });
        const ratingMap = new Map<string, number>(
          ratingsRows.map((r) => [r.category, r.rating])
        );

        const excludedIds = [...excludedInventory, ...acceptedIds];
        const exclusionSql =
          excludedIds.length > 0
            ? `AND p."id" NOT IN (${excludedIds.map((id) => `'${id}'`).join(",")})`
            : "";

        // --- Count + Pool size ---
        const totalCountResult = await prisma.$queryRawUnsafe<{ count: number }[]>(`
          SELECT COUNT(*)::int AS count
          FROM "Product" p
          WHERE p."status" = 'APPROVED'
            AND COALESCE(p."stock",0) > 0
            ${exclusionSql};
        `);
        const totalCount = totalCountResult[0]?.count ?? 0;

        let poolSize = 250 + Math.floor(Math.random() * 100);
        if (totalCount > 1000)
          poolSize = 400 + Math.floor(Math.random() * 100);
        else if (totalCount < 300) poolSize = Math.min(200, totalCount);

        // --- Fetch candidate pool ---
        const candidates = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            p.*, 
            CAST((SELECT COUNT(*) FROM "Review" r WHERE r."productId" = p.id) AS INT) AS "reviewsCount"
          FROM "Product" p
          WHERE p."status" = 'APPROVED'
            AND COALESCE(p."stock",0) > 0
            ${exclusionSql}
          ORDER BY p."createdAt" DESC, RANDOM()
          LIMIT ${poolSize};
        `);

        // --- Compute scores ---
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
          return { ...p, _score: score };
        });

        annotated.sort((a, b) => b._score - a._score);
        const top100 = shuffle(annotated.slice(0, 100));

        // --- Cache the stack (IDs only) ---
        discoverCache.set(cacheKey, {
          ids: top100.map((p) => p.id),
          createdAt: Date.now(),
        });

        cachedStack = discoverCache.get(cacheKey)!;
        stackLocks.delete(cacheKey);
      }
    }

    // --- 2️⃣ Paginate from cached stack ---
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedIds = cachedStack.ids.slice(start, end);

    if (paginatedIds.length === 0) {
       res.status(200).json({
        meta: {
          totalCount: cachedStack.ids.length,
          limit,
          page,
          hasNextPage: false,
          cacheCreatedAt: cachedStack.createdAt,
        },
        data: [],
      });
      return;
    }

    // --- 3️⃣ Fetch actual products for this page ---
    const products = await prisma.product.findMany({
      where: { id: { in: paginatedIds } },
    });

    // parse images safely
    for (const p of products) {
      if (typeof p.images === "string") {
        try {
          (p as any).images = JSON.parse(p.images);
        } catch {
          (p as any).images = [];
        }
      }
    }

    // --- 4️⃣ Respond ---
    res.status(200).json({
      meta: {
        totalCount: cachedStack.ids.length,
        limit,
        page,
        hasNextPage: end < cachedStack.ids.length,
        cacheCreatedAt: cachedStack.createdAt,
      },
      data: normalizeBigInt(products),
    });
  } catch (err) {
    console.error("discoverProducts error:", err);
    next(err);
  }
};












// import { NextFunction, Response } from "express";
// import { AuthRequest } from "../types";
// import { prisma } from "../config";

// // constants
// export const DEFAULT_CATEGORY_RATING = 1.0;
// const WEIGHT_PLUGSCOUNT = 0.1;
// const WEIGHT_SOLD = 0.2;
// const WEIGHT_RECENT = 0.06;
// const WEIGHT_REVIEW = 0.05;
// export const REJECT_PENALTY_MULTIPLIER = 0.3;

// // --- utils ---
// function daysSince(date: Date | string) {
//   return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
// }

// function computeProductBaseScore(product: any, categoryRating = DEFAULT_CATEGORY_RATING) {
//   let score = 1.0;
//   if (product.plugsCount && product.plugsCount > 0)
//     score += Math.log10(product.plugsCount + 1) * WEIGHT_PLUGSCOUNT;
//   if (product.sold && product.sold > 0)
//     score += Math.log10(product.sold + 1) * WEIGHT_SOLD;
//   if (daysSince(product.createdAt) <= 7) score += WEIGHT_RECENT;
//   if (product.reviewsCount && product.reviewsCount > 0)
//     score += Math.log10(product.reviewsCount + 1) * WEIGHT_REVIEW;
//   return score * categoryRating;
// }

// function shuffle<T>(arr: T[]) {
//   for (let i = arr.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [arr[i], arr[j]] = [arr[j], arr[i]];
//   }
//   return arr;
// }

// function normalizeBigInt(obj: any): any {
//   if (Array.isArray(obj)) return obj.map(normalizeBigInt);
//   if (obj && typeof obj === "object") {
//     const normalized: any = {};
//     for (const [key, value] of Object.entries(obj)) {
//       if (typeof value === "bigint") normalized[key] = Number(value);
//       else if (typeof value === "object")
//         normalized[key] = normalizeBigInt(value);
//       else normalized[key] = value;
//     }
//     return normalized;
//   }
//   return obj;
// }

// // 🚀 MAIN ENDPOINT
// export const discoverProducts = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const plug = req.plug!;
//     const plugId = plug.id;

//     const limit = Math.min(100, parseInt(String(req.query.limit || "20")));

//     // 1️⃣ Exclude plug's own products
//     const plugProducts = await prisma.plugProduct.findMany({
//       where: { plugId },
//       select: { originalId: true },
//     });

//     const excludedInventory = plugProducts.map((p) => p.originalId);

//     // 2️⃣ Exclude accepted products
//     const acceptedRows = await prisma.acceptedProduct.findMany({
//       where: { plugId },
//       select: { productId: true },
//     });
//     const acceptedIds = acceptedRows.map((r) => r.productId);

//     // 3️⃣ Rejected penalties
//     const rejectedRows = await prisma.rejectedProduct.findMany({
//       where: { plugId },
//     });
//     const rejectedMap = new Map<string, number>();
//     for (const r of rejectedRows) rejectedMap.set(r.productId, r.count);

//     // 4️⃣ Category ratings
//     const ratingsRows = await prisma.plugCategoryRating.findMany({
//       where: { plugId },
//     });
//     const ratingMap = new Map<string, number>(
//       ratingsRows.map((r) => [r.category, r.rating])
//     );

//     // 5️⃣ Exclusion list
//     const excludedIds = [...excludedInventory, ...acceptedIds];
//     const exclusionSql =
//       excludedIds.length > 0
//         ? `AND p."id" NOT IN (${excludedIds.map((id) => `'${id}'`).join(",")})`
//         : "";

//     // 6️⃣ Total count (to dynamically size the pool)
//     const totalCountResult = await prisma.$queryRawUnsafe<{ count: number }[]>(`
//       SELECT COUNT(*)::int AS count
//       FROM "Product" p
//       WHERE p."status" = 'APPROVED'
//         AND COALESCE(p."stock",0) > 0
//         ${exclusionSql};
//     `);
//     const totalCount = totalCountResult[0]?.count ?? 0;
//         console.log("totalCount", totalCount)


//     // ⚙️ Dynamic + Random Pool Size
//     let poolSize = 250 + Math.floor(Math.random() * 100); // 250–350 baseline
//     if (totalCount > 1000) poolSize = 400 + Math.floor(Math.random() * 100); // up to 500
//     else if (totalCount < 300) poolSize = Math.min(200, totalCount); // smaller DBs


//     // 7️⃣ Fetch a semi-random pool of products
//     const candidates = await prisma.$queryRawUnsafe<any[]>(`
//       SELECT 
//         p.*, 
//         CAST((SELECT COUNT(*) FROM "Review" r WHERE r."productId" = p.id) AS INT) AS "reviewsCount"
//       FROM "Product" p
//       WHERE p."status" = 'APPROVED'
//         AND COALESCE(p."stock",0) > 0
//         ${exclusionSql}
//       ORDER BY p."createdAt" DESC, RANDOM()
//       LIMIT ${poolSize};
//     `);

//     // 8️⃣ Compute scores
//     const annotated = candidates.map((p) => {
//       const catRating = ratingMap.get(p.category) ?? DEFAULT_CATEGORY_RATING;
//       let score = computeProductBaseScore(p, catRating);

//       const rejCount = rejectedMap.get(p.id) ?? 0;
//       if (rejCount > 0) {
//         const penaltyMultiplier = Math.pow(
//           REJECT_PENALTY_MULTIPLIER,
//           Math.min(rejCount, 4)
//         );
//         score *= penaltyMultiplier;
//       }

//       return { ...p, _score: score, _rejectedCount: rejCount };
//     });

//     // 9️⃣ Sort & shuffle top results
//     annotated.sort((a, b) => b._score - a._score);
//     const top = shuffle(annotated.slice(0, limit));

//     // 🔟 Parse images safely
//     for (const p of top) {
//       if (typeof p.images === "string") {
//         try {
//           p.images = JSON.parse(p.images);
//         } catch {
//           p.images = [];
//         }
//       }
//     }

//     // 11️⃣ Response (meta for pagination/UI)
//     res.status(200).json({
//       meta: {
//         totalCount,
//         poolSize,
//         limit,
//         hasNextPage: totalCount > limit,
//       },
//       data: normalizeBigInt(top),
//     });
//   } catch (err) {
//     console.error("discoverProducts error:", err);
//     next(err);
//   }
// };



/**
 * POST /discover/sync
 * Body:
 * {
 *   "accepted": ["productId1", "productId2"],
 *   "rejected": ["productId3", ...],
 *   "swipesCount": 17,
 * }
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

    // === 1. Fetch product categories (read-only, safe outside tx)
    const allIds = Array.from(new Set([...accepted, ...rejected]));
    const productData = allIds.length
      ? await prisma.product.findMany({
          where: { id: { in: allIds } },
          select: { id: true, category: true },
        })
      : [];
    const categoryMap = new Map(productData.map((p) => [p.id, p.category]));

    const ACCEPT_DELTA = 0.03;
    const REJECT_DELTA = -0.02;

    // === 2. TrackDiscovery update (not critical, fire-and-forget style)
    await prisma.trackDiscovery.upsert({
      where: { plugId },
      create: {
        plugId,
        totalSwipes: swipesCount,
        lastAt: now,
      },
      update: {
        totalSwipes: { increment: swipesCount },
        lastAt: now,
      },
    });

    // === 3. Process accepted products
    const acceptedPromises = accepted.map(async (pid: any) => {
      const category = categoryMap.get(pid) || "unknown";

      // upsert accepted
      await prisma.acceptedProduct.upsert({
        where: { plugId_productId: { plugId, productId: pid } },
        create: { plugId, productId: pid, count: 1, lastAt: now },
        update: { count: { increment: 1 }, lastAt: now },
      });

      // cleanup from rejected if previously rejected
      await prisma.rejectedProduct.deleteMany({
        where: { plugId, productId: pid },
      });

      // bump category rating
      await prisma.plugCategoryRating.upsert({
        where: { plugId_category: { plugId, category } },
        create: {
          plugId,
          category,
          rating: DEFAULT_CATEGORY_RATING + ACCEPT_DELTA,
        },
        update: { rating: { increment: ACCEPT_DELTA } },
      });
    });

    // === 4. Process rejected products
    const rejectedPromises = rejected.map(async (pid: any) => {
      const category = categoryMap.get(pid) || "unknown";

      await prisma.rejectedProduct.upsert({
        where: { plugId_productId: { plugId, productId: pid } },
        create: { plugId, productId: pid, count: 1, lastAt: now },
        update: { count: { increment: 1 }, lastAt: now },
      });

      // cleanup from accepted if previously accepted
      await prisma.acceptedProduct.deleteMany({
        where: { plugId, productId: pid },
      });

      // adjust category rating
      const existing = await prisma.plugCategoryRating.findUnique({
        where: { plugId_category: { plugId, category } },
      });

      const newRating = existing
        ? Math.max(0.2, existing.rating + REJECT_DELTA)
        : Math.max(0.2, DEFAULT_CATEGORY_RATING + REJECT_DELTA);

      await prisma.plugCategoryRating.upsert({
        where: { plugId_category: { plugId, category } },
        create: { plugId, category, rating: newRating },
        update: { rating: newRating },
      });
    });

    // Run all in parallel (independent, fast)
    await Promise.allSettled([...acceptedPromises, ...rejectedPromises]);

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
    const limit = parseInt(String(req.query.limit)); //how many

    const accepted = await prisma.acceptedProduct.findMany({
      where: { plugId },
      orderBy: { lastAt: "desc" },
      // take: limit,
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
        minPrice: true,
        maxPrice: true,
      },
    });

    // Parse images safely
    for (const p of products) {
      if (typeof p.images === "string") {
        try {
          p.images = JSON.parse(p.images);
        } catch {
          p.images = [] as any;
        }
      }
    }

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




/**
 * DELETE /api/accepted
 * Body:
 * {
 *   "productIds": ["productId1", "productId2", ...]
 * }
 *
 * Works for:
 * - Single delete: one productId in array
 * - Bulk delete: many productIds
 * - Delete all: if productIds = []
 */
export const deleteAcceptedProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const plug = req.plug!;
    const plugId = plug.id;
    const { productIds = [] } = req.body as { productIds?: string[] };

    // 🧩 If empty array, delete ALL accepted products for this plug
    let deletedCount = 0;

    if (!Array.isArray(productIds)) {
       res.status(400).json({ error: "invalid field data!" });
       return
    }

    if (productIds.length === 0) {
      const result = await prisma.acceptedProduct.deleteMany({
        where: { plugId },
      });
      deletedCount = result.count;
    } else {
      const result = await prisma.acceptedProduct.deleteMany({
        where: {
          plugId,
          productId: { in: productIds },
        },
      });
      deletedCount = result.count;
    }

    res.status(200).json({
      message:
        deletedCount > 0
          ? `${deletedCount} accepted product(s) deleted!`
          : "No matching products found!",
      deletedCount,
    });
  } catch (err) {
    next(err);
  }
};
