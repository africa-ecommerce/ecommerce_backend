import {  Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";


// Comprehensive search controller for advanced filtering
export const searchController = {
  // Advanced search across products with comprehensive filters
  searchProducts: async (req: AuthRequest, res: Response) => {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

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

      // Build comprehensive where conditions
      const whereConditions: any = {};

      // Text search
      if (search) {
        whereConditions.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      // Category filter
      if (category) {
        whereConditions.category = category;
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

      // Get total count for pagination
      const totalCount = await prisma.product.count({
        where: whereConditions,
      });

      // Execute search query
      const products = await prisma.product.findMany({
        where: whereConditions,
        orderBy: {
          [sortBy]: order,
        },
        skip,
        take: limit,
        include: {
          supplier: {
            select: {
              id: true,
              businessType: true,
              user: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
      });

      // Format products for response
      const formattedProducts = products.map((product) => ({
        ...product,
        images: product.images ? JSON.parse(product.images as string) : [],
        supplier: {
          id: product.supplier.id,
          businessType: product.supplier.businessType,
          businessName: product.supplier.user.name,
          userId: product.supplier.user.id,
        },
      }));

      // Pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;


    
       res.status(200).json({
        message: "Search results fetched successfully",
        data: formattedProducts,
        meta: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
      });
      return
    } catch (error) {
      console.error("Error searching products:", error);
       res.status(500).json({
        error: "Internal server error",
      });
      return;
    }
  },

  // Search products by supplier
  searchSupplierProducts: async (req: AuthRequest, res: Response) => {
    try {
      const supplierId = req.params.supplierId;

      // Parse search parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const order =
        (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc";

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Build where conditions
      const whereConditions: any = {
        supplierId: supplierId,
      };

      // Add search filter if provided
      if (search) {
        whereConditions.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      // Add category filter if provided
      if (category) {
        whereConditions.category = category;
      }

      // Get total count
      const totalCount = await prisma.product.count({
        where: whereConditions,
      });

      // Get products
      const products = await prisma.product.findMany({
        where: whereConditions,
        orderBy: {
          [sortBy]: order,
        },
        skip,
        take: limit,
        include: {
          supplier: {
            select: {
              businessType: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Format products
      const formattedProducts = products.map((product) => ({
        ...product,
        images: product.images ? JSON.parse(product.images as string) : [],
        supplier: {
          businessType: product.supplier.businessType,
          businessName: product.supplier.user.name,
        },
      }));

      // Pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

       res.status(200).json({
        message: "Supplier products fetched successfully",
        data: formattedProducts,
        meta: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
      });
      return;
    } catch (error) {
      console.error("Error searching supplier products:", error);
       res.status(500).json({
        error: "Internal server error",
      });
      return;
    }
  },

  // Search for plugs
  searchPlugs: async (req: AuthRequest, res: Response) => {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      // Parse search parameters
      const search = req.query.search as string;
      const state = req.query.state as string;
      const niche = req.query.niche as string;
      const generalMerchant = req.query.generalMerchant === "true";

      // Build where conditions
      const whereConditions: any = {};

      // Text search
      if (search) {
        whereConditions.OR = [
          { businessName: { contains: search, mode: "insensitive" } },
          { aboutBusiness: { contains: search, mode: "insensitive" } },
          { user: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      // State filter
      if (state) {
        whereConditions.state = state;
      }

      // Niche filter
      if (niche) {
        whereConditions.niches = {
          has: niche,
        };
      }

      // General merchant filter
      if (req.query.generalMerchant !== undefined) {
        whereConditions.generalMerchant = generalMerchant;
      }

      // Get total count
      const totalCount = await prisma.plug.count({
        where: whereConditions,
      });

      // Get plugs
      const plugs = await prisma.plug.findMany({
        where: whereConditions,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              createdAt: true,
            },
          },
        },
      });

      // Pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

       res.status(200).json({
        message: "Plugs fetched successfully",
        data: plugs,
        meta: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
      });
      return;
    } catch (error) {
      console.error("Error searching plugs:", error);
       res.status(500).json({
        error: "Internal server error",
      });
      return;
      
    }
  },
};
