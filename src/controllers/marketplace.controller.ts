import { Response } from "express";
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

// Simplified getAllProducts without server-side caching
export const getAllProducts = async (req: AuthRequest, res: Response) => {
  try {
    // Parse pagination parameters
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;

    // Parse sorting parameters
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order =
      (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc"; //-------------> ALGORITHM DETERMINES THIS

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
      const categories = category.split(",").map((cat) => cat.trim());
      const filteredCategories =
        categories.length > 1
          ? categories.filter((cat) => cat.toLowerCase() !== "all")
          : categories;

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

    // Add cursor for pagination if provided
    if (cursor) {
      queryOptions.cursor = { id: cursor };
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

      // Get total count only for first page or when specifically requested
      let totalCount: number | null = null;
      if (!cursor) {
        totalCount = await tx.product.count({ where: whereConditions });
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

    // Handle plug-specific logic
    let responseData = result.products;

    if (req.user.userType === "PLUG") {
      const pluggedProducts = await prisma.plugProduct.findMany({
        where: {
          plugId: req.user?.plug?.id,
        },
        select: {
          originalId: true,
        },
      });

      const pluggedProductIds = pluggedProducts.map((pp) => pp.originalId);

      responseData = responseData.map((product) => ({
        ...product,
        isPlugged: pluggedProductIds.includes(product.id),
      }));
    }

    // Always return success response
    res.status(200).json({
      message:
        responseData.length === 0
          ? "No products found matching your criteria"
          : "Products fetched successfully!",
      data: responseData,
      meta: result.meta,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error!" });
  }
};