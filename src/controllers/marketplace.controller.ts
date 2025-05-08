// import { Response } from "express";
// import { generateCacheKey, productCache } from "../config";
// import { AuthRequest } from "../types";
// import { prisma } from "../config";
// import { formatProductWithImagesAndVariations } from "../helper/formatProduct";

// interface PaginationMeta {
//   hasNextPage: boolean;
//   nextCursor: string | null;
//   count: number;
//   totalCount: number | null;
// }

// interface ProductsResponse {
//   products: any[];
//   meta: PaginationMeta;
// }

// // Get all products with efficient pagination and query optimization
// export const getAllProducts = async (req: AuthRequest, res: Response) => {
//   try {
//     // Parse pagination parameters
//     const limit = parseInt(req.query.limit as string) || 20;
//     const cursor = req.query.cursor as string;

//     // Parse sorting parameters
//     const sortBy = (req.query.sortBy as string) || "createdAt";
//     const order =
//       (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc";

//     // Parse filtering parameters
//     const category = req.query.category as string;
//     const minPrice = req.query.minPrice
//       ? parseFloat(req.query.minPrice as string)
//       : undefined;
//     const maxPrice = req.query.maxPrice
//       ? parseFloat(req.query.maxPrice as string)
//       : undefined;
//     const search = req.query.search as string;
//     const supplierIds = req.query.supplierIds as string | string[];
//     const businessType = req.query.businessType as string;
//     const createdAfter = req.query.createdAfter
//       ? new Date(req.query.createdAfter as string)
//       : undefined;
//     const createdBefore = req.query.createdBefore
//       ? new Date(req.query.createdBefore as string)
//       : undefined;

//     // Generate cache key (without cursor for page 1)
//     const cacheParams = { ...req.query, cursor: "" };

//     if (!req.user) {
//       res.status(401).json({ error: "Unauthorized!" });
//       return;
//     }
//     if (cursor) {
//       cacheParams.cursor = cursor;
//     }
//     const cacheKey = generateCacheKey(cacheParams);

//     // Try to get data from cache first
//     const cachedResult = productCache.get<ProductsResponse>(cacheKey);
//     if (cachedResult) {
//       console.log(`Cache hit for: ${cacheKey}`);

//       // Check if user is a plug and handle plugged products
//       let responseData = cachedResult.products;

//       if (req.user.userType === "PLUG") {
//         // Fetch plug's products from database for comparison
//         const pluggedProducts = await prisma.plugProduct.findMany({
//           where: {
//             plugId: req.user?.plug?.id,
//           },
//           select: {
//             originalId: true,
//           },
//         });

//         const pluggedProductIds = pluggedProducts.map((pp) => pp.originalId);

//         // Cache hit - responseData is already formatted by formatProductWithImagesAndVariations before caching
//         // Add isPlugged flag to each product
//         responseData = responseData.map((product) => ({
//           ...product,
//           isPlugged: pluggedProductIds.includes(product.id),
//         }));
//       }

//       res.status(200).json({
//         message: "Products fetched successfully!",
//         data: responseData,
//         meta: cachedResult.meta,
//         fromCache: true, // Optional flag to indicate cache hit
//       });
//       return;
//     }

//     console.log(`Cache miss for: ${cacheKey}`);

//     // Build where conditions for filtering and search
//     const whereConditions: any = {};

//     // Text search across name, description, and tags
//     if (search) {
//       whereConditions.OR = [
//         { name: { contains: search, mode: "insensitive" } },
//         { description: { contains: search, mode: "insensitive" } },
//       ];
//     }

//     // Category filter
//     if (category) {
//       // Split categories by comma and trim whitespace
//       const categories = category.split(",").map((cat) => cat.trim());

//       // Filter out "all" if other categories are present
//       const filteredCategories =
//         categories.length > 1
//           ? categories.filter((cat) => cat.toLowerCase() !== "all")
//           : categories;

//       // Only apply category filter if we have categories other than "all"
//       if (
//         !(
//           filteredCategories.length === 1 &&
//           filteredCategories[0].toLowerCase() === "all"
//         )
//       ) {
//         whereConditions.category = { in: filteredCategories };
//       }
//     }

   

//     // Price range filter
//     if (minPrice !== undefined || maxPrice !== undefined) {
//       whereConditions.price = {};
//       if (minPrice !== undefined) {
//         whereConditions.price.gte = minPrice;
//       }
//       if (maxPrice !== undefined) {
//         whereConditions.price.lte = maxPrice;
//       }
//     }

//     // Supplier filters
//     if (supplierIds) {
//       const supplierIdArray = Array.isArray(supplierIds)
//         ? supplierIds
//         : [supplierIds];
//       whereConditions.supplierId = { in: supplierIdArray };
//     }

//     // Filter by supplier's business type
//     if (businessType) {
//       whereConditions.supplier = {
//         businessType: businessType,
//       };
//     }

//     // Date range filters
//     if (createdAfter !== undefined || createdBefore !== undefined) {
//       whereConditions.createdAt = {};
//       if (createdAfter !== undefined) {
//         whereConditions.createdAt.gte = createdAfter;
//       }
//       if (createdBefore !== undefined) {
//         whereConditions.createdAt.lte = createdBefore;
//       }
//     }

//     // Build query options
//     const queryOptions: any = {
//       where: whereConditions,
//       take: limit + 1, // Take one extra to determine if there are more items
//       orderBy: {
//         [sortBy]: order,
//       },
//       include: {
//         supplier: {
//           select: {
//             businessName: true,
//             pickupLocation: true,
//             avatar: true,
//           },
//         },
//         variations: true,
//       },
//     };

//     // Add cursor for pagination if provided
//     if (cursor) {
//       queryOptions.cursor = { id: cursor };
//       queryOptions.skip = 1; // Skip the cursor
//     }

//     // Execute query with transaction for consistency
//     const result = await prisma.$transaction(async (tx) => {
//       // Execute query
//       let products = await tx.product.findMany(queryOptions);

//       // Check if we have more results
//       const hasNextPage = products.length > limit;
//       if (hasNextPage) {
//         products = products.slice(0, limit); // Remove the extra item
//       }

//       // Get the next cursor
//       const nextCursor = hasNextPage ? products[products.length - 1].id : null;

//       // Get total count (with a separate cache to avoid recounting)
//       const countCacheKey = `count:${generateCacheKey({
//         ...cacheParams,
//         cursor: undefined,
//       })}`;
//       let totalCount = productCache.get<number>(countCacheKey);

//       if (totalCount === undefined && Object.keys(whereConditions).length > 0) {
//         totalCount = await tx.product.count({ where: whereConditions });
//         productCache.set(countCacheKey, totalCount, 600); // Cache count for 10 minutes
//       }

//       // Format products for response
//       const formattedProducts = products.map(
//         formatProductWithImagesAndVariations
//       );

//       return {
//         products: formattedProducts,
//         meta: {
//           hasNextPage,
//           nextCursor,
//           count: formattedProducts.length,
//           totalCount,
//         },
//       };
//     });

//     // Check if user is a plug and handle plugged products
//     let responseData = result.products;

//     if (req.user.userType === "PLUG") {
//       // Fetch plug's products from database for comparison
//       const pluggedProducts = await prisma.plugProduct.findMany({
//         where: {
//           plugId: req.user?.plug?.id,
//         },
//         select: {
//           originalId: true,
//         },
//       });

//       const pluggedProductIds = pluggedProducts.map((pp) => pp.originalId);

//       // Add isPlugged flag to each product
//       responseData = responseData.map((product) => ({
//         ...product,
//         isPlugged: pluggedProductIds.includes(product.id),
//       }));
//     }

//     // Cache the original result without the plug-specific data
//     productCache.set(cacheKey, result);

//     res.status(200).json({
//       message: "Products fetched successfully!",
//       data: responseData,
//       meta: result.meta,
//     });
//     return;
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     res.status(500).json({ error: "Internal server error!" });
//     return;
//   }
// };


import { Response } from "express";
import { generateCacheKey, productCache } from "../config";
import { AuthRequest } from "../types";
import { prisma } from "../config";
import { formatProductWithImagesAndVariations } from "../helper/formatProduct";

interface PaginationMeta {
  hasNextPage: boolean;
  nextCursor: string | null;
  count: number;
  totalCount: number | null;
}

interface ProductsResponse {
  products: any[];
  meta: PaginationMeta;
}

// Get all products with efficient pagination and query optimization
export const getAllProducts = async (req: AuthRequest, res: Response) => {
  try {
    // Parse pagination parameters
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;

    // Parse sorting parameters
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order =
      (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc";

    // Parse filtering parameters
    const category = req.query.category as string;
    const minPrice = req.query.minPrice
      ? parseFloat(req.query.minPrice as string)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? parseFloat(req.query.maxPrice as string)
      : undefined;
    const search = req.query.search as string;
    const supplierIds = req.query.supplierIds as string | string[];
    const businessType = req.query.businessType as string;
    const createdAfter = req.query.createdAfter
      ? new Date(req.query.createdAfter as string)
      : undefined;
    const createdBefore = req.query.createdBefore
      ? new Date(req.query.createdBefore as string)
      : undefined;

    if (!req.user) {
      res.status(401).json({ error: "Unauthorized!" });
      return;
    }

    // Detect if this is a filter request by checking for filter parameters
    const hasActiveFilters = !!(
      category ||
      minPrice !== undefined ||
      maxPrice !== undefined ||
      search ||
      supplierIds ||
      businessType ||
      createdAfter !== undefined ||
      createdBefore !== undefined
    );

    // Create filter fingerprint to detect filter changes
    const filterFingerprint = JSON.stringify({
      category,
      minPrice,
      maxPrice,
      search,
      supplierIds,
      businessType,
      createdAfter,
      createdBefore,
      sortBy,
      order,
    });

    // Store the filter fingerprint in a per-session cache with session ID as key
    const sessionId = req.user.id;
    const previousFilterKey = `prevFilter:${sessionId}`;
    const previousFilter = productCache.get<string>(previousFilterKey);

    // Detect filter change by comparing with previous filter fingerprint
    const isFilterChange =
      previousFilter !== undefined && previousFilter !== filterFingerprint;

    // Store current filter for next comparison
    productCache.set(previousFilterKey, filterFingerprint, 3600); // Cache for 1 hour

    // IMPORTANT: Reset cursor if filters have changed
    let effectiveCursor = cursor;
    if (isFilterChange) {
      effectiveCursor = null; // Reset pagination when filters change
      console.log("Filter changed, resetting pagination cursor");
    }

    // Create cache params - exclude cursor if filters have changed
    const cacheParams = { ...req.query };
    if (isFilterChange) {
      delete cacheParams.cursor;
    }

    const cacheKey = generateCacheKey(cacheParams);

    // Try to get data from cache first
    const cachedResult = productCache.get<ProductsResponse>(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for: ${cacheKey}`);

      // Check if user is a plug and handle plugged products
      let responseData = cachedResult.products;

      if (req.user.userType === "PLUG") {
        // Fetch plug's products from database for comparison
        const pluggedProducts = await prisma.plugProduct.findMany({
          where: {
            plugId: req.user?.plug?.id,
          },
          select: {
            originalId: true,
          },
        });

        const pluggedProductIds = pluggedProducts.map((pp) => pp.originalId);

        // Add isPlugged flag to each product
        responseData = responseData.map((product) => ({
          ...product,
          isPlugged: pluggedProductIds.includes(product.id),
        }));
      }

      res.status(200).json({
        message: "Products fetched successfully!",
        data: responseData,
        meta: cachedResult.meta,
        fromCache: true, // Optional flag to indicate cache hit
      });
      return;
    }

    console.log(`Cache miss for: ${cacheKey}`);

    // Build where conditions for filtering and search
    const whereConditions: any = {};

    // Text search across name, description, and tags
    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (category) {
      // Split categories by comma and trim whitespace
      const categories = category.split(",").map((cat) => cat.trim());

      // Filter out "all" if other categories are present
      const filteredCategories =
        categories.length > 1
          ? categories.filter((cat) => cat.toLowerCase() !== "all")
          : categories;

      // Only apply category filter if we have categories other than "all"
      if (
        !(
          filteredCategories.length === 1 &&
          filteredCategories[0].toLowerCase() === "all"
        )
      ) {
        whereConditions.category = { in: filteredCategories };
      }
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereConditions.price = {};
      if (minPrice !== undefined) {
        whereConditions.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        whereConditions.price.lte = maxPrice;
      }
    }

    // Supplier filters
    if (supplierIds) {
      const supplierIdArray = Array.isArray(supplierIds)
        ? supplierIds
        : [supplierIds];
      whereConditions.supplierId = { in: supplierIdArray };
    }

    // Filter by supplier's business type
    if (businessType) {
      whereConditions.supplier = {
        businessType: businessType,
      };
    }

    // Date range filters
    if (createdAfter !== undefined || createdBefore !== undefined) {
      whereConditions.createdAt = {};
      if (createdAfter !== undefined) {
        whereConditions.createdAt.gte = createdAfter;
      }
      if (createdBefore !== undefined) {
        whereConditions.createdAt.lte = createdBefore;
      }
    }

    // Build query options
    const queryOptions: any = {
      where: whereConditions,
      take: limit + 1, // Take one extra to determine if there are more items
      orderBy: {
        [sortBy]: order,
      },
      include: {
        supplier: {
          select: {
            businessName: true,
            pickupLocation: true,
            avatar: true,
          },
        },
        variations: true,
      },
    };

    // Add cursor for pagination if provided AND not a filter change
    if (effectiveCursor) {
      queryOptions.cursor = { id: effectiveCursor };
      queryOptions.skip = 1; // Skip the cursor
    }

    // Execute query with transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      // Execute query
      let products = await tx.product.findMany(queryOptions);

      // Check if we have more results
      const hasNextPage = products.length > limit;
      if (hasNextPage) {
        products = products.slice(0, limit); // Remove the extra item
      }

      // Get the next cursor
      const nextCursor = hasNextPage ? products[products.length - 1].id : null;

      // Get total count (with a separate cache to avoid recounting)
      const countCacheKey = `count:${generateCacheKey({
        ...cacheParams,
        cursor: undefined,
      })}`;
      let totalCount = productCache.get<number>(countCacheKey);

      if (totalCount === undefined && Object.keys(whereConditions).length > 0) {
        totalCount = await tx.product.count({ where: whereConditions });
        productCache.set(countCacheKey, totalCount, 600); // Cache count for 10 minutes
      }

      // Format products for response
      const formattedProducts = products.map(
        formatProductWithImagesAndVariations
      );

      return {
        products: formattedProducts,
        meta: {
          hasNextPage,
          nextCursor,
          count: formattedProducts.length,
          totalCount,
        },
      };
    });

    // Check if user is a plug and handle plugged products
    let responseData = result.products;

    if (req.user.userType === "PLUG") {
      // Fetch plug's products from database for comparison
      const pluggedProducts = await prisma.plugProduct.findMany({
        where: {
          plugId: req.user?.plug?.id,
        },
        select: {
          originalId: true,
        },
      });

      const pluggedProductIds = pluggedProducts.map((pp) => pp.originalId);

      // Add isPlugged flag to each product
      responseData = responseData.map((product) => ({
        ...product,
        isPlugged: pluggedProductIds.includes(product.id),
      }));
    }

    // Cache the original result without the plug-specific data
    productCache.set(cacheKey, result, 120); // 2 minutes TTL

    // Clear loading state for empty results
    if (hasActiveFilters && responseData.length === 0) {
      res.status(200).json({
        message: "No products found matching your criteria",
        data: [],
        meta: {
          hasNextPage: false,
          nextCursor: null,
          count: 0,
          totalCount: 0,
        },
      });
      return;
    }

    res.status(200).json({
      message: "Products fetched successfully!",
      data: responseData,
      meta: result.meta,
      filterChanged: isFilterChange, // Let frontend know filters changed
    });
    return;
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error!" });
    return;
  }
};