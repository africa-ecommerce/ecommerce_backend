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
