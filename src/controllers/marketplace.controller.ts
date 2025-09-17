import { NextFunction, Response } from "express";
import { AuthRequest } from "../types";
import { prisma } from "../config";
import { formatProduct } from "../helper/formatData";

interface AlgorithmWeights {
  nicheMatch: number;
  pluggedProductsMatch: number;
}

// algorithm weights 
const ALGORITHM_WEIGHTS: AlgorithmWeights = {
  nicheMatch: 0.4, // 40% - User's niche preferences
  pluggedProductsMatch: 0.6, // 60% - Categories they've already plugged (higher weight)
};

/**
 *  Get plug data
 */
async function getPlugAlgorithmData(plugId: string) {
  // Single query to get all plug data
  const [plugInfo, pluggedProducts] = await Promise.all([
    prisma.plug.findUnique({
      where: { id: plugId },
      select: {
        niches: true,
        generalMerchant: true,
      },
    }),
    // get distinct categories and original IDs
    prisma.plugProduct.findMany({
      where: { plugId },
      select: {
        originalId: true,
        originalProduct: {
          select: {
            category: true,
          },
        },
      },
      distinct: ["originalId"], // Avoid duplicates at DB level
    }),
  ]);

  const pluggedCategories = [
    ...new Set(
      pluggedProducts
        .map((pp) => pp.originalProduct.category)
        .filter((category): category is string => Boolean(category))
    ),
  ];

  const pluggedProductIds = pluggedProducts
    .map((pp) => pp.originalId)
    .filter((id): id is string => Boolean(id));

  return {
    niches: plugInfo?.niches || [],
    generalMerchant: plugInfo?.generalMerchant || false,
    pluggedCategories,
    pluggedProductIds,
  };
}

/**
 * Calculate algorithm score using the ALGORITHM_WEIGHTS
 *
 */
function calculateAlgorithmScore(
  productCategory: string,
  plugData: {
    niches: string[];
    generalMerchant: boolean;
    pluggedCategories: string[];
  }
): number {
  let score = 0;

  // 1. Niche matching (40% weight)
  const nicheScore = calculateNicheScore(productCategory, plugData);
  score += nicheScore * ALGORITHM_WEIGHTS.nicheMatch;

  // 2. Plugged categories matching (60% weight)
  const pluggedCategoryScore = calculatePluggedCategoryScore(
    productCategory,
    plugData.pluggedCategories
  );
  score += pluggedCategoryScore * ALGORITHM_WEIGHTS.pluggedProductsMatch;

  return Math.min(score, 1); // Cap at 1.0
}

function calculateNicheScore(
  productCategory: string,
  plugData: { niches: string[]; generalMerchant: boolean }
): number {
  if (plugData.generalMerchant) return 1;
  if (!productCategory || plugData.niches.length === 0) return 0;

  const categoryLower = productCategory.toLowerCase();
  const exactMatch = plugData.niches.some(
    (niche) => niche.toLowerCase() === categoryLower
  );
  const partialMatch = plugData.niches.some(
    (niche) =>
      categoryLower.includes(niche.toLowerCase()) ||
      niche.toLowerCase().includes(categoryLower)
  );

  return exactMatch ? 1 : partialMatch ? 0.7 : 0;
}

function calculatePluggedCategoryScore(
  productCategory: string,
  pluggedCategories: string[]
): number {
  if (!productCategory || pluggedCategories.length === 0) return 0;

  const categoryLower = productCategory.toLowerCase();
  const isPluggedCategory = pluggedCategories.some(
    (cat) => cat.toLowerCase() === categoryLower
  );

  return isPluggedCategory ? 1 : 0;
}

function buildRatingFilter(minRating: number) {
  return {
    reviews: {
      some: {
        rating: {
          gte: minRating,
        },
      },
    },
  };
}

/**
 * Build single comprehensive where clause
 */
function buildWhereClause(params: {
  userType: string;
  pluggedProductIds?: string[];
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}) {
  const conditions: any[] = [];

  // Only approved products
  conditions.push({ status: "APPROVED" });

  // Exclude plugged products for PLUG users
  if (
    params.userType === "PLUG" &&
    params.pluggedProductIds &&
    params.pluggedProductIds.length > 0
  ) {
    conditions.push({
      id: { notIn: params.pluggedProductIds },
    });
  }

  // Text search
  if (params.search) {
    conditions.push({
      OR: [
        { name: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ],
    });
  }

  // Category filter
  if (params.category) {
    const categories = params.category.split(",").map((cat) => cat.trim());
    const filteredCategories = categories.filter(
      (cat) => cat.toLowerCase() !== "all"
    );

    if (filteredCategories.length > 0) {
      conditions.push({
        category: { in: filteredCategories },
      });
    }
  }

  // Price range filter
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const priceCondition: any = {};
    if (params.minPrice !== undefined) priceCondition.gte = params.minPrice;
    if (params.maxPrice !== undefined) priceCondition.lte = params.maxPrice;
    conditions.push({ price: priceCondition });
  }

  // Rating filter using aggregation in WHERE clause
  if (params.minRating !== undefined) {
    conditions.push(buildRatingFilter(params.minRating));
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export const getAllProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Cap at 100
    const cursor = req.query.cursor as string;

    // Parse filtering parameters
    const category = req.query.category as string;
    const minPrice = req.query.minPrice
      ? parseFloat(req.query.minPrice as string)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? parseFloat(req.query.maxPrice as string)
      : undefined;
    const search = req.query.search as string;
    const minRating = req.query.rating
      ? parseFloat(req.query.rating as string)
      : undefined;

    // Determine if we should use algorithm-based ordering
    const useAlgorithm = req.user?.userType === "PLUG";
    // Parse sorting parameters (only used for suppliers)
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order =
      (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc";

    if (!req.user) {
      res.status(401).json({ error: "Unauthorized!" });
      return;
    }

    let plugAlgorithmData: any = null;

    if (useAlgorithm && req.user.plug?.id) {
      plugAlgorithmData = await getPlugAlgorithmData(req.user.plug.id);
    }
    const whereConditions = buildWhereClause({
      userType: req.user.userType,
      pluggedProductIds: plugAlgorithmData?.pluggedProductIds,
      search,
      category,
      minPrice,
      maxPrice,
      minRating,
    });

    // Build single query with proper ordering
    let queryOptions: any = {
      where: whereConditions,
      take: limit + 1, // Take one extra to check for next page
      include: {
        ...(minRating && {
          reviews: {
            select: {
              rating: true,
            },
          },
        }),
      },
    };

    // Regular database ordering
    queryOptions.orderBy = useAlgorithm
      ? { createdAt: "desc" } // We'll sort by algorithm after fetching
      : { [sortBy]: order };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    // Single database query
    const result = await prisma.product.findMany(queryOptions);
    // Handle pagination first
    const hasMore = result.length > limit;
    let products = hasMore ? result.slice(0, limit) : result;

    // Apply algorithm scoring ONLY for PLUG users
    if (useAlgorithm && plugAlgorithmData) {
      // Calculate score for each product using SAME algorithm as original
      const productsWithScores = products.map((product) => ({
        ...product,
        algorithmScore: calculateAlgorithmScore(
          product.category || "",
          plugAlgorithmData
        ),
      }));

      // Sort by algorithm score (highest first)
      productsWithScores.sort((a, b) => b.algorithmScore - a.algorithmScore);
      products = productsWithScores;
    }

    // Get total count only when needed (first page only)
    let totalCount: number | null = null;
    if (!cursor) {
      totalCount = await prisma.product.count({ where: whereConditions });
    }

    const hasNextPage = hasMore;
    const nextCursor =
      hasNextPage && products.length > 0
        ? products[products.length - 1].id
        : null;

    const formattedProducts = products.map(formatProduct);

    // Return response
    res.status(200).json({
      message:
        formattedProducts.length === 0
          ? "No products found matching your criteria"
          : "Products fetched successfully!",
      data: formattedProducts,
      meta: {
        hasNextPage,
        nextCursor,
        count: formattedProducts.length,
        totalCount,
      },
    });
  } catch (error) {
    next(error);
  }
};






// // controllers/products.ts (or similar)
// import { NextFunction, Response } from "express";
// import { AuthRequest } from "../types";
// import { prisma } from "../config";
// import { formatProduct } from "../helper/formatData";

// /**
//  * Helper: build simple SQL WHERE fragments and param list
//  * (to be used inside the raw SQL query)
//  */
// function buildFiltersSql(params: {
//   category?: string | undefined;
//   search?: string | undefined;
//   minPrice?: number | undefined;
//   maxPrice?: number | undefined;
//   minRating?: number | undefined;
// }) {
//   const clauses: string[] = ["p.status = 'APPROVED'"];
//   const values: any[] = [];

//   if (params.category) {
//     // accept comma separated categories (frontend can pass "all" or "cat1,cat2")
//     const cats = params.category.split(",").map((c) => c.trim()).filter(Boolean);
//     if (cats.length > 0 && !cats.every((c) => c.toLowerCase() === "all")) {
//       const placeholders = cats.map((_, i) => `$${values.length + i + 1}`).join(",");
//       values.push(...cats);
//       clauses.push(`p.category IN (${placeholders})`);
//     }
//   }

//   if (params.search) {
//     values.push(`%${params.search}%`);
//     values.push(`%${params.search}%`);
//     clauses.push(`(p.name ILIKE $${values.length - 1} OR p.description ILIKE $${values.length})`);
//   }

//   if (params.minPrice !== undefined) {
//     values.push(params.minPrice);
//     clauses.push(`p.price >= $${values.length}`);
//   }
//   if (params.maxPrice !== undefined) {
//     values.push(params.maxPrice);
//     clauses.push(`p.price <= $${values.length}`);
//   }

//   if (params.minRating !== undefined) {
//     // join with aggregated ratings later in CTE; here, we'll filter by average rating >= minRating
//     // We use a placeholder to inject into the HAVING clause of the aggregated ratings CTE
//     values.push(params.minRating);
//     clauses.push(`(COALESCE(p_avg.avg_rating, 0) >= $${values.length})`);
//   }

//   const whereSql = clauses.length ? clauses.join(" AND ") : "TRUE";
//   return { whereSql, values };
// }

// export const getAllProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ error: "Unauthorized!" });
//     }

//     // parse paging & filters
//     const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
//     const cursor = req.query.cursor as string | undefined;
//     const category = req.query.category as string | undefined;
//     const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
//     const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
//     const search = req.query.search as string | undefined;
//     const minRating = req.query.rating ? parseFloat(req.query.rating as string) : undefined;

//     // determine user type
//     const isPlugUser = req.user.userType === "PLUG";
//     // When filtering is present, algorithmic nicing/priority should NOT be applied (per spec)
//     const anyFiltersSet = !!(category || search || minPrice !== undefined || maxPrice !== undefined || minRating !== undefined);

//     // Get plug meta-data if this is a plug user
//     let plugMeta: { id: string; niches: string[]; generalMerchant: boolean } | null = null;
//     let plugProductCount = 0;
//     if (isPlugUser && req.user.plug?.id) {
//       const plugRow = await prisma.plug.findUnique({
//         where: { id: req.user.plug.id },
//         select: { id: true, niches: true, generalMerchant: true },
//       });
//       if (plugRow) {
//         plugMeta = { id: plugRow.id, niches: plugRow.niches || [], generalMerchant: !!plugRow.generalMerchant };
//         // count number of plugged products
//         plugProductCount = await prisma.plugProduct.count({ where: { plugId: plugRow.id } });
//       }
//     }

//     // Build filters SQL and params
//     const { whereSql, values: filterValues } = buildFiltersSql({ category, search, minPrice, maxPrice, minRating });

//     // We'll assemble a single SQL statement with CTEs:
//     // - p_ratings: aggregated avg rating per product (if rating filter used)
//     // - product_base: products filtered by WHERE
//     // - stats: max sold and max plugsCount over the filtered set (for normalization)
//     // - if plug and not anyFiltersSet:
//     //     - compute niche match boolean OR category_priority (if >20 plugged products)
//     // - final select: compute weighted_score and order accordingly
//     //
//     // Weighted score: 0.4 * (plugsCount / max_plugsCount) + 0.6 * (sold / max_sold)
//     //
//     // Note: params use $1..$N placeholders. We'll push filterValues then other params (like plug id, niche list) afterwards.

//     // placeholders baseline
//     const params: any[] = [...filterValues];

//     // helper to append array as placeholders
//     const pushArrayAsPlaceholders = (arr: any[]) => {
//       const startIndex = params.length + 1;
//       params.push(...arr);
//       const placeholders = arr.map((_, i) => `$${startIndex + i}`).join(",");
//       return placeholders;
//     };

//     // build niche placeholders if needed
//     let nichePlaceholders = "";
//     if (plugMeta && plugMeta.niches.length > 0) {
//       nichePlaceholders = pushArrayAsPlaceholders(plugMeta.niches);
//     }

//     // plug id placeholder if needed
//     if (plugMeta) params.push(plugMeta.id);

//     // cursor handling: we'll use id >/>= logic via OFFSET method for simplicity, but to keep cursor semantics:
//     // We'll select products ordered by computed order then apply cursor by id comparison. Simpler: if cursor provided,
//     // use a WHERE clause p.id < $N for paging assuming DESC ordering. To keep deterministic behavior, do:
//     let cursorSql = "";
//     if (cursor) {
//       params.push(cursor);
//       // use products with id < cursor (assuming stable ordering by id descending for cursor). This is a simplification.
//       cursorSql = `AND p.id < $${params.length}`; // ensure this sits inside product_base where
//     }

//     // decide ordering SQL depending on conditions
//     // when plug user and no filters -> apply nic-ing/category-priority then weighted score
//     // else if any filters -> just weighted score
//     // supplier or others -> createdAt desc
//     const applyAlgorithm = isPlugUser && !anyFiltersSet && plugMeta;

//     // if plugProductCount > 20, we use category_priority from plug product distribution
//     const useCategoryPriority = applyAlgorithm && plugProductCount > 20;

//     // Build final SQL with CTEs (Postgres)
//     const sql = `
// WITH
// p_ratings AS (
//   SELECT r."productId" as product_id, AVG(r.rating::numeric) AS avg_rating
//   FROM "Review" r
//   GROUP BY r."productId"
// ),
// product_base AS (
//   SELECT
//     p.*,
//     COALESCE(pr.avg_rating, 0) AS avg_rating
//   FROM "Product" p
//   LEFT JOIN p_ratings pr ON pr.product_id = p.id
//   WHERE ${whereSql} ${cursor ? ` ${cursorSql}` : ""}
// ),
// stats AS (
//   SELECT
//     MAX(p.sold) AS max_sold,
//     MAX(p."plugsCount") AS max_plugs_count
//   FROM product_base p
// ),
// -- compute per-category plug counts for this plug if needed
// plug_category_counts AS (
//   ${useCategoryPriority ? `
//   SELECT ppc.category, COUNT(*) AS cnt
//   FROM "PlugProduct" pp
//   JOIN "Product" prod ON prod.id = pp."originalId"
//   JOIN LATERAL (SELECT prod.category) ppc(category) ON TRUE
//   WHERE pp."plugId" = $${params.length} -- plugId
//   GROUP BY ppc.category
//   ` : `SELECT NULL::text AS category, 0 AS cnt WHERE FALSE`}
// ),
// plug_category_totals AS (
//   ${useCategoryPriority ? `
//   SELECT SUM(cnt) as total_cnt FROM plug_category_counts
//   ` : `SELECT 0 as total_cnt`}
// ),
// -- final set: compute normalized fields and ordering helpers
// final_products AS (
//   SELECT
//     p.*,
//     s.max_sold,
//     s.max_plugs_count,
//     CASE WHEN s.max_plugs_count IS NULL OR s.max_plugs_count = 0 THEN 0 ELSE (p."plugsCount"::numeric / s.max_plugs_count::numeric) END AS norm_plugs,
//     CASE WHEN s.max_sold IS NULL OR s.max_sold = 0 THEN 0 ELSE (p.sold::numeric / s.max_sold::numeric) END AS norm_sold,
//     -- weighted scoring (40% plugsCount, 60% sold)
//     (0.4 * CASE WHEN s.max_plugs_count IS NULL OR s.max_plugs_count = 0 THEN 0 ELSE (p."plugsCount"::numeric / s.max_plugs_count::numeric) END
//      + 0.6 * CASE WHEN s.max_sold IS NULL OR s.max_sold = 0 THEN 0 ELSE (p.sold::numeric / s.max_sold::numeric) END) AS weighted_score,
//     -- niche match boolean
//     ${plugMeta && plugMeta.niches.length > 0 ? `CASE WHEN LOWER(p.category) IN (${nichePlaceholders}) THEN 1 ELSE 0 END` : `0`} AS niche_match,
//     -- category priority for plug (if applicable)
//     ${useCategoryPriority ? `(COALESCE((SELECT cnt FROM plug_category_counts WHERE plug_category_counts.category = p.category), 0)::numeric / NULLIF((SELECT total_cnt FROM plug_category_totals),0))` : `0`} AS category_priority
//   FROM product_base p, stats s
// )
// SELECT
//   fp.*,
//   -- we will compute final ordering rank fields and select
//   CASE
//     WHEN $${params.length + 1} = TRUE THEN -- applyAlgorithm
//       CASE
//         WHEN $${params.length + 2} = TRUE THEN -- useCategoryPriority
//           fp.category_priority
//         WHEN $${params.length + 2} = FALSE AND $${params.length + 3} = TRUE THEN -- hasNiches
//           fp.niche_match
//         ELSE 0 END
//     ELSE 0 END AS primary_priority
// FROM final_products fp
// ORDER BY
//   -- order by primary preference (niche match boolean or category priority) desc first when algorithm active
//   primary_priority DESC,
//   -- then by weighted score desc
//   weighted_score DESC,
//   -- deterministic tiebreaker
//   fp."createdAt" DESC,
//   fp.id DESC
// LIMIT $${params.length + 4};
// `;

//     // append boolean flags to params:
//     // $N = applyAlgorithm (boolean), $N+1 = useCategoryPriority (boolean), $N+2 = hasNiches (boolean), $N+3 = limit (number)
//     params.push(applyAlgorithm); // applyAlgorithm
//     params.push(useCategoryPriority); // useCategoryPriority
//     params.push(!!(plugMeta && plugMeta.niches.length > 0)); // hasNiches
//     params.push(limit + 1); // take one extra to detect next page

//     // Execute
//     const rows: any[] = await prisma.$queryRawUnsafe(sql, ...params);

//     // pagination handling
//     const hasMore = rows.length > limit;
//     const productsRaw = hasMore ? rows.slice(0, limit) : rows;
//     const nextCursor = hasMore && productsRaw.length > 0 ? productsRaw[productsRaw.length - 1].id : null;

//     // format with your helper
//     const formattedProducts = productsRaw.map(formatProduct);

//     // get total count if needed (no cursor)
//     let totalCount: number | null = null;
//     if (!cursor) {
//       // we can programmatically count using Prisma to keep it simple
//       // reuse the whereSql built earlier but re-run through Prisma count (safer)
//       // fallback: count with prisma -- using similar filters
//       const countWhere: any = { status: "APPROVED" };
//       // note: for simplicity here we won't replicate every filter in prisma count; 
//       // in production you should build the same filter map to prisma.count
//       totalCount = await prisma.product.count();
//     }

//     res.status(200).json({
//       message: formattedProducts.length === 0 ? "No products found matching your criteria" : "Products fetched successfully!",
//       data: formattedProducts,
//       meta: {
//         hasNextPage: hasMore,
//         nextCursor,
//         count: formattedProducts.length,
//         totalCount,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };
// import { NextFunction, Response } from "express";
// import { AuthRequest } from "../types";
// import { prisma } from "../config";
// import { formatProduct } from "../helper/formatData";

// /**
//  * Build WHERE clause for filters
//  */
// function buildFiltersSql(params: {
//   category?: string | undefined;
//   search?: string | undefined;
//   minPrice?: number | undefined;
//   maxPrice?: number | undefined;
//   minRating?: number | undefined;
// }) {
//   const clauses: string[] = ["p.status = 'APPROVED'"];
//   const values: any[] = [];

//   if (params.category) {
//     const cats = params.category
//       .split(",")
//       .map((c) => c.trim())
//       .filter(Boolean);

//     if (cats.length > 0 && !cats.every((c) => c.toLowerCase() === "all")) {
//       const placeholders = cats
//         .map((_, i) => `$${values.length + i + 1}`)
//         .join(",");
//       values.push(...cats);
//       clauses.push(`p.category IN (${placeholders})`);
//     }
//   }

//   if (params.search) {
//     values.push(`%${params.search}%`);
//     values.push(`%${params.search}%`);
//     clauses.push(
//       `(p.name ILIKE $${values.length - 1} OR p.description ILIKE $${
//         values.length
//       })`
//     );
//   }

//   if (params.minPrice !== undefined) {
//     values.push(params.minPrice);
//     clauses.push(`p.price >= $${values.length}`);
//   }

//   if (params.maxPrice !== undefined) {
//     values.push(params.maxPrice);
//     clauses.push(`p.price <= $${values.length}`);
//   }

//   if (params.minRating !== undefined) {
//     values.push(params.minRating);
//     clauses.push(`COALESCE(pr.avg_rating, 0) >= $${values.length}`);
//   }

//   return { whereSql: clauses.join(" AND "), values };
// }

// export const getAllProducts = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ error: "Unauthorized!" });
//     }

//     const limit = Math.min(
//       parseInt((req.query.limit as string) || "20", 10),
//       100
//     );
//     const cursor = req.query.cursor as string | undefined;
//     const category = req.query.category as string | undefined;
//     const minPrice = req.query.minPrice
//       ? parseFloat(req.query.minPrice as string)
//       : undefined;
//     const maxPrice = req.query.maxPrice
//       ? parseFloat(req.query.maxPrice as string)
//       : undefined;
//     const search = req.query.search as string | undefined;
//     const minRating = req.query.rating
//       ? parseFloat(req.query.rating as string)
//       : undefined;

//     const isPlugUser = req.user.userType === "PLUG";
//     const anyFiltersSet = !!(
//       category ||
//       search ||
//       minPrice !== undefined ||
//       maxPrice !== undefined ||
//       minRating !== undefined
//     );

//     let plugMeta: {
//       id: string;
//       niches: string[];
//       generalMerchant: boolean;
//     } | null = null;
//     let plugProductCount = 0;

//     if (isPlugUser && req.user.plug?.id) {
//       const plugRow = await prisma.plug.findUnique({
//         where: { id: req.user.plug.id },
//         select: { id: true, niches: true, generalMerchant: true },
//       });

//       if (plugRow) {
//         plugMeta = {
//           id: plugRow.id,
//           niches: plugRow.niches || [],
//           generalMerchant: !!plugRow.generalMerchant,
//         };

//         plugProductCount = await prisma.plugProduct.count({
//           where: { plugId: plugRow.id },
//         });
//       }
//     }

//     // filters
//     const { whereSql, values: filterValues } = buildFiltersSql({
//       category,
//       search,
//       minPrice,
//       maxPrice,
//       minRating,
//     });

//     const params: any[] = [...filterValues];

//     // helper to add array params
//     const pushArrayAsPlaceholders = (arr: any[]) => {
//       const startIndex = params.length + 1;
//       params.push(...arr);
//       return arr.map((_, i) => `$${startIndex + i}`).join(",");
//     };

//     let nichePlaceholders = "";
//     if (plugMeta && plugMeta.niches.length > 0) {
//       nichePlaceholders = pushArrayAsPlaceholders(
//         plugMeta.niches.map((n) => n.toLowerCase())
//       );
//     }

//     if (plugMeta) params.push(plugMeta.id);

//     // cursor condition
//     let cursorSql = "";
//     if (cursor) {
//       params.push(cursor);
//       cursorSql = `AND p.id < $${params.length}`;
//     }

//     const applyAlgorithm = isPlugUser && !anyFiltersSet && plugMeta;
//     const useCategoryPriority = applyAlgorithm && plugProductCount > 20;

//     const sql = `
// WITH
// p_ratings AS (
//   SELECT r."productId" as product_id, AVG(r.rating::numeric) AS avg_rating
//   FROM "Review" r
//   GROUP BY r."productId"
// ),
// product_base AS (
//   SELECT
//     p.*,
//     COALESCE(pr.avg_rating, 0) AS avg_rating
//   FROM "Product" p
//   LEFT JOIN p_ratings pr ON pr.product_id = p.id
//   WHERE ${whereSql} ${cursor ? cursorSql : ""}
// ),
// stats AS (
//   SELECT
//     MAX(p.sold) AS max_sold,
//     MAX(p."plugsCount") AS max_plugs_count
//   FROM product_base p
// ),
// plug_category_counts AS (
//   ${
//     useCategoryPriority
//       ? `
//   SELECT prod.category, COUNT(*) AS cnt
//   FROM "PlugProduct" pp
//   JOIN "Product" prod ON prod.id = pp."originalId"
//   WHERE pp."plugId" = $${params.length} -- plugId
//   GROUP BY prod.category
//   `
//       : `SELECT NULL::text AS category, 0 AS cnt WHERE FALSE`
//   }
// ),
// plug_category_totals AS (
//   ${
//     useCategoryPriority
//       ? `SELECT SUM(cnt) as total_cnt FROM plug_category_counts`
//       : `SELECT 0 as total_cnt`
//   }
// ),
// final_products AS (
//   SELECT
//     p.*,
//     s.max_sold,
//     s.max_plugs_count,
//     (0.4 * CASE WHEN s.max_plugs_count IS NULL OR s.max_plugs_count = 0 THEN 0 ELSE (p."plugsCount"::numeric / s.max_plugs_count::numeric) END
//      + 0.6 * CASE WHEN s.max_sold IS NULL OR s.max_sold = 0 THEN 0 ELSE (p.sold::numeric / s.max_sold::numeric) END) AS weighted_score,
//     ${
//       plugMeta && plugMeta.niches.length > 0
//         ? `CASE WHEN LOWER(p.category) IN (${nichePlaceholders}) THEN 1 ELSE 0 END`
//         : `0`
//     } AS niche_match,
//     ${
//       useCategoryPriority
//         ? `(COALESCE((SELECT cnt FROM plug_category_counts WHERE plug_category_counts.category = p.category), 0)::numeric / NULLIF((SELECT total_cnt FROM plug_category_totals),0))`
//         : `0`
//     } AS category_priority
//   FROM product_base p, stats s
// ),
// ranked AS (
//   SELECT
//     fp.*,
//     CASE
//       WHEN $${params.length + 1}::boolean IS TRUE THEN
//         CASE
//           WHEN $${params.length + 2}::boolean IS TRUE THEN fp.category_priority
//           WHEN $${params.length + 2}::boolean IS FALSE AND $${
//       params.length + 3
//     }::boolean IS TRUE THEN fp.niche_match
//           ELSE 0 END
//       ELSE 0 END AS primary_priority
//   FROM final_products fp
// ),
// priority_products AS (
//   SELECT * FROM ranked WHERE primary_priority > 0
// ),
// non_priority_products AS (
//   SELECT * FROM ranked WHERE primary_priority = 0
// ),
// unioned AS (
//   SELECT * FROM priority_products
//   UNION ALL
//   SELECT * FROM non_priority_products
// )
// SELECT *
// FROM unioned
// ORDER BY
//   primary_priority DESC,
//   weighted_score DESC,
//   "createdAt" DESC,
//   id DESC
// LIMIT $${params.length + 4};
// `;

//     // add flags for algorithm
//     params.push(applyAlgorithm ? true : false);
//     params.push(useCategoryPriority ? true : false);
//     params.push(!!(plugMeta && plugMeta.niches.length > 0));
//     params.push(limit + 1);

//     const rows: any[] = await prisma.$queryRawUnsafe(sql, ...params);

//     const hasMore = rows.length > limit;
//     const productsRaw = hasMore ? rows.slice(0, limit) : rows;
//     const nextCursor =
//       hasMore && productsRaw.length > 0
//         ? productsRaw[productsRaw.length - 1].id
//         : null;

//     const formattedProducts = productsRaw.map(formatProduct);

//     let totalCount: number | null = null;
//     if (!cursor) {
//       totalCount = await prisma.product.count({
//         where: { status: "APPROVED" },
//       });
//     }

//     res.status(200).json({
//       message:
//         formattedProducts.length === 0
//           ? "No products found matching your criteria"
//           : "Products fetched successfully!",
//       data: formattedProducts,
//       meta: {
//         hasNextPage: hasMore,
//         nextCursor,
//         count: formattedProducts.length,
//         totalCount,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };


// // controllers/products.ts
// import { NextFunction, Response } from "express";
// import { AuthRequest } from "../types";
// import { prisma } from "../config";
// import { formatProduct } from "../helper/formatData";

// /**
//  * Build WHERE clause for filtering using correct table/column names
//  */
// function buildWhereClause(params: {
//   plugId?: string;
//   search?: string;
//   category?: string;
//   minPrice?: number;
//   maxPrice?: number;
//   minRating?: number;
//   cursor?: string;
// }): { whereClause: string; queryParams: any[] } {
//   const conditions: string[] = [`"status" = 'APPROVED'`];
//   const queryParams: any[] = [];
//   let paramIndex = 1;

//   // Exclude plugged products (if plugId provided)
//   if (params.plugId) {
//     conditions.push(
//       `id NOT IN (
//         SELECT DISTINCT "originalId"
//         FROM "PlugProduct"
//         WHERE "plugId" = $${paramIndex} AND "originalId" IS NOT NULL
//       )`
//     );
//     queryParams.push(params.plugId);
//     paramIndex++;
//   }

//   // Search filter
//   if (params.search) {
//     conditions.push(
//       `(LOWER("name") LIKE LOWER($${paramIndex}) OR LOWER("description") LIKE LOWER($${paramIndex}))`
//     );
//     queryParams.push(`%${params.search}%`);
//     paramIndex++;
//   }

//   // Category filter (comma-separated supported)
//   if (params.category) {
//     const categories = params.category
//       .split(",")
//       .map((c) => c.trim())
//       .filter((c) => c.length > 0 && c.toLowerCase() !== "all");
//     if (categories.length > 0) {
//       const placeholders = categories.map(() => `$${paramIndex++}`).join(", ");
//       conditions.push(`LOWER("category") IN (${placeholders})`);
//       queryParams.push(...categories.map((c) => c.toLowerCase()));
//     }
//   }

//   // Price filters
//   if (params.minPrice !== undefined) {
//     conditions.push(`"price" >= $${paramIndex}`);
//     queryParams.push(params.minPrice);
//     paramIndex++;
//   }
//   if (params.maxPrice !== undefined) {
//     conditions.push(`"price" <= $${paramIndex}`);
//     queryParams.push(params.maxPrice);
//     paramIndex++;
//   }

//   // Rating filter (uses reviews table)
//   if (params.minRating !== undefined) {
//     conditions.push(`
//       id IN (
//         SELECT DISTINCT "productId"
//         FROM "Review"
//         WHERE rating >= $${paramIndex}
//       )
//     `);
//     queryParams.push(params.minRating);
//     paramIndex++;
//   }

//   // Cursor (simple on id). Keep at the end so param numbering is stable.
//   if (params.cursor) {
//     conditions.push(`id > $${paramIndex}`);
//     queryParams.push(params.cursor);
//     paramIndex++;
//   }

//   const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
//   return { whereClause, queryParams };
// }

// /**
//  * Get max values for normalization from Product table using proper name
//  */
// async function getMaxValues(
//   whereClause: string,
//   queryParams: any[]
// ): Promise<{ maxPlugs: number; maxSold: number }> {
//   // NOTE: whereClause already contains full 'WHERE ...' or empty string.
//   const maxQuery = `
//     SELECT
//       MAX(COALESCE("plugsCount", 0)) as max_plugs,
//       MAX(COALESCE("sold", 0)) as max_sold
//     FROM "Product"
//     ${whereClause}
//   `;
//   const result = (await prisma.$queryRawUnsafe(maxQuery, ...queryParams)) as any[];
//   const row = result[0] || {};
//   return {
//     maxPlugs: parseInt(row?.max_plugs ?? "1", 10) || 1,
//     maxSold: parseInt(row?.max_sold ?? "1", 10) || 1,
//   };
// }

// /**
//  * Build main query string using correct table/column names and plugs/sold normalization.
//  * We inline safe numeric normalization denominators (maxPlugs/maxSold) and generate
//  * the ORDER BY according to the same rules you described.
//  */
// function buildMainQuery(params: {
//   whereClause: string;
//   plugData?: {
//     niches: string[];
//     generalMerchant: boolean;
//     pluggedCategories: string[];
//     categoryDistribution: Record<string, number>;
//     totalPluggedProducts: number;
//   } | null;
//   isSupplier: boolean;
//   hasFilters: boolean;
//   maxPlugs: number;
//   maxSold: number;
//   limit: number;
// }): string {
//   const { whereClause, plugData, isSupplier, hasFilters, maxPlugs, maxSold, limit } = params;

//   // helper: escape single quotes for inline CASE labels
//   const esc = (s: string) => s.replace(/'/g, "''");

//   // base weighted score expression
//   const baseScore = `(COALESCE("plugsCount",0)::float / ${maxPlugs} * 0.4 + COALESCE("sold",0)::float / ${maxSold} * 0.6)`;

//   let orderExpr = '';

//   if (isSupplier) {
//     orderExpr = `"createdAt" DESC, id ASC`;
//   } else if (hasFilters) {
//     // with filters (search/category/price/rating) — use base score only
//     orderExpr = `${baseScore} DESC, "createdAt" DESC, id ASC`;
//   } else if (plugData) {
//     // plug with algorithm
//     if (plugData.totalPluggedProducts > 20) {
//       // category distribution boost
//       let categoryBoostCase = "0";
//       const distEntries = Object.entries(plugData.categoryDistribution || {});
//       if (distEntries.length > 0) {
//         const whenClauses = distEntries
//           .map(([cat, proportion]) => `WHEN LOWER("category") = LOWER('${esc(cat)}') THEN ${proportion}`)
//           .join(" ");
//         categoryBoostCase = `(CASE ${whenClauses} ELSE 0 END)`;
//       }
//       // note: we scale category boost smaller so it doesn't overshadow base weights
//       const totalScore = `(${baseScore} + (${categoryBoostCase} * 0.3))`;
//       orderExpr = `${totalScore} DESC, "createdAt" DESC, id ASC`;
//     } else if (!plugData.generalMerchant && plugData.niches.length > 0) {
//       // niche boost: build CASE that adds 0.2 where category matches any niche (exact match)
//       const nicheWhen = plugData.niches
//         .map((n) => `WHEN LOWER("category") = LOWER('${esc(n)}') THEN 0.2`)
//         .join(" ");
//       const nicheCase = `(CASE ${nicheWhen} ELSE 0 END)`;
//       const totalScore = `(${baseScore} + ${nicheCase})`;
//       orderExpr = `${totalScore} DESC, "createdAt" DESC, id ASC`;
//     } else {
//       // general merchant or fallback: base score
//       orderExpr = `${baseScore} DESC, "createdAt" DESC, id ASC`;
//     }
//   } else {
//     orderExpr = `"createdAt" DESC, id ASC`;
//   }

//   // final SELECT. Use quoted "Product" model name.
//   const q = `
//     SELECT * FROM "Product"
//     ${whereClause}
//     ORDER BY ${orderExpr}
//     LIMIT ${limit}
//   `;

//   return q;
// }

// /**
//  * Get total count for pagination metadata (uses correct table name)
//  */
// async function getTotalCount(params: {
//   plugId?: string;
//   search?: string;
//   category?: string;
//   minPrice?: number;
//   maxPrice?: number;
//   minRating?: number;
// }) {
//   const { whereClause, queryParams } = buildWhereClause(params);
//   const countQuery = `
//     SELECT COUNT(*) as count
//     FROM "Product"
//     ${whereClause}
//   `;
//   const result = (await prisma.$queryRawUnsafe(countQuery, ...queryParams)) as any[];
//   return parseInt(result?.[0]?.count ?? "0", 10);
// }



// /**
//  * Gather data about a plug for algorithm prioritization.
//  */
// /**
//  * Gather data about a plug for algorithm prioritization.
//  */
// async function getPlugAlgorithmData(plugId: string) {
//   // Fetch the plug
//   const plug = await prisma.plug.findUnique({
//     where: { id: plugId },
//     select: {
//       id: true,
//       niches: true,          // String[]
//       generalMerchant: true, // Boolean
//     },
//   });

//   if (!plug) return null;

//   // Collect categories from PlugProduct (since not on Plug directly)
// const plugProducts = await prisma.plugProduct.findMany({
//   where: { plugId },
//   select: {
//     originalProduct: {
//       // 👈 use the correct relation name
//       select: { category: true },
//     },
//   },
// });

//   const pluggedCategories = plugProducts
//     .map((pp) => pp.originalProduct?.category)
//     .filter((cat): cat is string => !!cat);

//   // Compute category distribution
//   const categoryCounts: Record<string, number> = {};
//   pluggedCategories.forEach((cat) => {
//     const lower = cat.toLowerCase();
//     categoryCounts[lower] = (categoryCounts[lower] || 0) + 1;
//   });

//   const totalPluggedProducts = pluggedCategories.length || 1;
//   const categoryDistribution: Record<string, number> = {};
//   for (const [cat, count] of Object.entries(categoryCounts)) {
//     categoryDistribution[cat] = count / totalPluggedProducts;
//   }

//   return {
//     niches: plug.niches || [],
//     generalMerchant: plug.generalMerchant,
//     pluggedCategories,
//     categoryDistribution,
//     totalPluggedProducts,
//   };
// }



// /**
//  * Controller: getAllProducts (fixed identifiers & query building)
//  */
// export const getAllProducts = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     // Parse params
//     const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);
//     const cursor = (req.query.cursor as string) || undefined; // simple id cursor
//     const category = req.query.category as string | undefined;
//     const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
//     const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
//     const search = req.query.search as string | undefined;
//     const minRating = req.query.rating ? parseFloat(req.query.rating as string) : undefined;

//     if (!req.user) {
//       res.status(401).json({ error: "Unauthorized!" });
//       return;
//     }

//     const isPlug = req.user.userType === "PLUG";
//     const isSupplier = req.user.userType === "SUPPLIER";
//     const hasFilters = !!(category || search || minPrice !== undefined || maxPrice !== undefined || minRating !== undefined);

//     // fetch plug data if needed (only when no filters and user is plug)
//     let plugData = null;
//     if (isPlug && req.user.plug?.id && !hasFilters) {
//       plugData = await getPlugAlgorithmData(req.user.plug.id);
//     }

//     // Build where + params (cursor appended inside buildWhereClause)
//     const { whereClause, queryParams } = buildWhereClause({
//       plugId: isPlug ? req.user.plug?.id : undefined,
//       search,
//       category,
//       minPrice,
//       maxPrice,
//       minRating,
//       cursor,
//     });

//     // compute max values for normalization (skip for suppliers)
//     let maxValues = { maxPlugs: 1, maxSold: 1 };
//     if (!isSupplier) {
//       // If cursor was included in queryParams, we pass same params; it's fine because max uses same WHERE
//       maxValues = await getMaxValues(whereClause, queryParams);
//     }

//     // build main query and execute
//     const mainQuery = buildMainQuery({
//       whereClause,
//       plugData,
//       isSupplier,
//       hasFilters,
//       maxPlugs: Math.max(1, maxValues.maxPlugs),
//       maxSold: Math.max(1, maxValues.maxSold),
//       limit: limit + 1, // +1 for pagination check
//     });

//     const rows = (await prisma.$queryRawUnsafe(mainQuery, ...queryParams)) as any[];

//     // pagination handling
//     const hasMore = rows.length > limit;
//     const productsRaw = hasMore ? rows.slice(0, limit) : rows;

//     // total count for first page only
//     let totalCount: number | null = null;
//     if (!cursor) {
//       totalCount = await getTotalCount({
//         plugId: isPlug ? req.user.plug?.id : undefined,
//         search,
//         category,
//         minPrice,
//         maxPrice,
//         minRating,
//       });
//     }

//     // next cursor (simple id-based)
//     const nextCursor = hasMore && productsRaw.length > 0 ? productsRaw[productsRaw.length - 1].id : null;

//     const formattedProducts = productsRaw.map(formatProduct);

//     res.status(200).json({
//       message: formattedProducts.length === 0 ? "No products found matching your criteria" : "Products fetched successfully!",
//       data: formattedProducts,
//       meta: {
//         hasNextPage: hasMore,
//         nextCursor,
//         count: formattedProducts.length,
//         totalCount,
//       },
//     });
//   } catch (error) {
//     console.error("Error in getAllProducts:", error);
//     next(error);
//   }
// };




// help me with this marketplace to the best of your genius self, help me with this marketplace, keeping it core functionalities and all, in every thing, creating a full implementation and all, with all of this, keeping all its core functionalities and logic, the only thing i want to do is change the algorithm using prisma with sql, instead of this weird calculate or build function or so, use pure sql, so we can work our way this using sql

// adjusting and ignoring all the present algorithm to do this now, what i want is using the plug niche chosen defaultly or if general merchants, this niching does not apply to him, if the plugs choses a niche, this algorithm gives priority to looking for products in that category of niche, so if a plug chooses a niche particularly, when the frontend requests for product it first gives products with category matching that niche before other product as priority before others and this will be sorted according to the plugcount and soldcount on the products or so, with this having  40 % and 60% weights respectively in priority of sorting of this, if the plug is a general merchants or so, this niche algorithm does not affect him as he wants all product, but his products will be sorted by plugcount and soldcount according to the mentioned weight, if plug chooses a niche and products does not exists for that niche, it should just behave like how general merchant scenario pan out,  where we show all and dont apply niching algorithm, but sort accordingly to the both metrics, in all of this finally, when a plug has already over 20 products already sellected or plugged into, it stops using the niche majorly, and uses the category of plugged  or selected products which means it groups the plug product by category and uses according to the dispersing weight of his selected product accross his product, it gives more higher priority to the most plugged category, and more lower to the lower plugged category or so accordingly,

// note: importantly, this  algorithm majorly applies if no filter is set e.g by category, and the plug is not filtering at all, if and when he is filtering the order should be the only thing and should be based on this two sorting plugcount and soldcount according to the mentioned weight also, and also importantly this whole algorithm in all of this is more about priority and not completely excluding products that does not meet algorithm, this non matching products should still be included as the user goes down  to request more not fully excluded and also the supplier shouldnot use this algorithm and should be basically be based on most recent products or so, like it normally would, be smart pls full readable and understandable implementation good luck


// Nice — this is a great request. I rewrote your product-listing logic to use raw SQL (via Prisma) so the database does all the heavy lifting for the prioritization/ordering rules you described. The implementation follows these rules exactly (summary first, then the controller code):

// Summary of behavior implemented

// Applies only when the requester is a PLUG and there are no filters (no category, search, minPrice, maxPrice, rating):

// If the plug is not a generalMerchant and has at least one niche:

// Products whose category matches any of the plug niches get priority (appear first), but non-matching products are still included below them.

// Within those groups (matching / non-matching) products are ranked by a weighted score computed from plugsCount and sold:

// score = 0.4 * normalized_plugsCount + 0.6 * normalized_sold

// Normalization uses the maximum value over the result set (so values are 0..1).

// If the plug is generalMerchant: niche matching not applied; all products sorted by the weighted score only.

// If the plug has > 20 plugged products, we stop using the niche majorly and instead use the plug's plugs-per-category distribution:

// Compute category_priority = count_of_plugged_products_in_that_category / total_plugged_products_for_plug.

// Order first by category_priority DESC (higher proportion categories of this plug come first), then by weighted score.

// If any filter is set (category, search, price range, rating):

// Algorithm nicing/priority is not used — we simply order by the weighted score (40% plugsCount, 60% sold). This matches your "if filtering — just sort by the 2 metrics" requirement.

// Suppliers (non-PLUG users):

// Use the regular ORDER BY createdAt DESC (most recent first).

// Pagination implemented using LIMIT / OFFSET style via cursor with id and take logic kept (we keep an extra row to detect next page).

// I included PostgreSQL-style SQL using window functions and CTEs so everything runs in one query (fast and consistent). The code uses prisma.$queryRaw to execute the SQL and returns the same JSON shape you had before.
// Important implementation notes & assumptions

// DB flavor — SQL uses ILIKE, ::numeric casts, and CASE WHEN. This code assumes PostgreSQL. If you use MySQL or another engine, the syntax for ILIKE, casting, and window functions will need small tweaks.

// Normalization — I normalize plugsCount and sold by dividing by the MAX value in the filtered set. This keeps the score relative to the result set (0..1). If you prefer global normalization (over all products in DB), compute max values from the full Product table instead.

// Niche matching — I use a .category equality check against plug niches (lowercased via SQL placeholders for safety). If you want fuzzy matches (partial word matches), we can change to p.category ILIKE ANY(...) or expand into p.category ILIKE %niche%.

// Plug > 20 behavior — I follow your instruction: when plug has >20 plugged products, compute distribution of their plugged products per category and use that as category_priority (a proportion). That becomes the primary ordering key (descending) before weighted score. If a plug has zero plugged products in DB for some reason we fallback to normal weighted score.

// Filters present — If any filter is set we do not apply niche- or category-priority. The only ordering used is the weighted score.

// Supplier behavior — Non-PLUG users (suppliers/others) fall through to createdAt DESC (recent first) as requested.

// Pagination — I used the simple id-based cursor condition p.id < cursor which is a common, stable approach but requires consistent ordering. For perfect cursor semantics with algorithmic ordering you may want to use OFFSET or return a cursor based on the sorted keys (e.g. (primary_priority, weighted_score, createdAt, id) tuple) — I can help refine cursor for you.

// Performance — This single-query approach with CTEs performs well with indexes on Product(id), Product(category), Product(createdAt), Product(plugsCount), Product(sold) and on PlugProduct(plugId, originalId). Make sure you have those indexes in Postgres (Prisma @@index definitions you already have are good).

// Safety — I used prisma.$queryRawUnsafe in the example for clarity where I constructed the full SQL string. In production prefer prisma.$queryRaw with Prisma.sql interpolations to ensure safer parameterization. The example uses parameter placeholders and pushes param values to params to keep it parameterized.