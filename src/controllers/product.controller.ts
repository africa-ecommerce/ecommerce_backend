// src/controllers/product.controller.ts
import { Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { productSchema } from "../lib/zod/schema";
import {
  deleteFromMinio,
  upload,
  uploadToMinio,
} from "../helper/minioObjectStore/productImage";
import { Product } from "@prisma/client";
import { createHash } from "crypto";

// Helper function to format products with parsed images
const formatProductWithImages = (product: Product) => {
  return {
    ...product,
    images: product.images ? JSON.parse(product.images as string) : [],
  };
};

// Controller methods
export const productController = {
  // Create a new product
  createProduct: [
    upload.array("images", 10), // Allow up to 10 images
    async (req: AuthRequest, res: Response) => {
      let imageUrls: string[] = []; // Track keys for rollback

      try {
        const supplier = req.supplier!;

        // Parse the product data from FormData
        let productData;
        try {
          productData = JSON.parse(req.body.productData);
        } catch (error) {
          res.status(400).json({ error: "Invalid product data format!" }); // ---->
          return;
        }

        // Validate request body
        const validatedData = productSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          category: productData.category,
        });

        if (!validatedData.success) {
          res.status(400).json({
            error: "Validation failed!",
          }); // ---->
          return;
        }

        // Process the request within a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Upload images to MinIO
          const files = req.files as Express.Multer.File[];
          imageUrls =
            files && files.length > 0 ? await uploadToMinio(files) : [];

          // Create product in database using the supplier ID
          const product = await tx.product.create({
            data: {
              name: validatedData.data.name,
              description: validatedData.data.description,
              price: validatedData.data.price,
              category: validatedData.data.category,
              images: JSON.stringify(imageUrls), // Store URLs as JSON string
              supplierId: supplier.id,
            },
          });

          return formatProductWithImages(product);
        });

        res.status(201).json({
          message: "Product created successfully!",
          data: result,
        }); // ---->
        return;
      } catch (error) {
        console.error("Error creating product:", error);

        // Rollback: Delete uploaded images if transaction failed
        if (imageUrls.length > 0) {
          await deleteFromMinio(imageUrls);
        }

        res.status(500).json({ error: "Internal server error!" }); // ---->
        return;
      }
    },
  ],

  // Get all products for a supplier
  getSupplierProducts: async (req: AuthRequest, res: Response) => {
    try {
      const supplier = req.supplier!;

      // Get all products
      const products = await prisma.product.findMany({
        where: { supplierId: supplier.id },
        orderBy: { createdAt: "desc" },
      });

      // Format products with parsed images
      const formattedProducts = products.map(formatProductWithImages);

      console.log("supplierdata", formattedProducts);

      res.status(200).json({
        message: "Products fetched successfully!",
        data: formattedProducts,
      }); // ---->
      return;
    } catch (error) {
      console.error("Error fetching supplier products:", error);
      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },

  // Get product by ID
  getProductById: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId;

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        res.status(404).json({ error: "Product not found!" }); // ---->
        return;
      }

      res.status(200).json({
        message: "Product fetched successfully!",
        data: formatProductWithImages(product),
      }); // ---->
      return;
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },

  // Get all products with efficient pagination for infinite scrolling
  getAllProducts: async (req: AuthRequest, res: Response) => {
     try {
       // Parse pagination parameters
       const limit = parseInt(req.query.limit as string) || 20;
       const cursor = req.query.cursor as string; // For cursor-based pagination

       // Parse sorting parameters
       const sortBy = (req.query.sortBy as string) || "createdAt";
       const order =
         (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc";

       // Parse filtering and search parameters
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
       const tags = req.query.tags as string; // For searching product tags/keywords

       // Build where conditions for filtering and search
       const whereConditions: any = {};

       // Text search across name, description, and tags
       if (search) {
         whereConditions.OR = [
           { name: { contains: search, mode: "insensitive" } },
           { description: { contains: search, mode: "insensitive" } },
           { tags: { contains: search, mode: "insensitive" } }, // Search in tags field
         ];
       }

       // For more advanced full-text search when available in your Postgres setup
       // This would use the built-in full-text search capabilities of Postgres
       // if (search) {
       //   whereConditions.OR = [
       //     { name: { search: search } },
       //     { description: { search: search } },
       //     { tags: { search: search } },
       //   ];
       // }

       // Category filter
       if (category) {
         whereConditions.category = category;
       }

       // Tags/keywords filter (exact match or array inclusion)
       if (tags) {
         whereConditions.tags = { contains: tags, mode: "insensitive" };
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
       };

       // Add cursor for efficient pagination if provided
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
         const nextCursor = hasNextPage
           ? products[products.length - 1].id
           : null;

         // Get total count when filters are applied (for analytics/UI purposes)
         let totalCount = null;
         if (Object.keys(whereConditions).length > 0) {
           totalCount = await tx.product.count({ where: whereConditions });
         }

         // Format products for response
           const formattedProducts = products.map(formatProductWithImages);
        //  const formattedProducts = products.map((product) => ({
        //    ...product,
        //    images: product.images ? JSON.parse(product.images as string) : []
        //   //  tags: product.tags ? JSON.parse(product.tags as string) : [],
        //   //  supplier: product.supplier
        //      ? {
        //          id: product.supplier.id,
        //          businessType: product.supplier.businessType,
        //          businessName: product.supplier.user.name,
        //          userId: product.supplier.user.id,
        //        }
        //      : null,
        //  }));

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

       res.status(200).json({
         message: "Products fetched successfully!",
         data: result.products,
         meta: result.meta,
       });
       return;
     } catch (error) {
       console.error("Error fetching products:", error);
       res.status(500).json({ error: "Internal server error!" });
       return;
     }
  },


  // Get all products with efficient pagination and query optimization
// getAllProducts: async (req: AuthRequest, res: Response) => {
//   try {
//     // Create ETag fingerprint from query parameters for HTTP caching
//     const queryFingerprint = JSON.stringify(req.query);
//     const etag = createHash('md5').update(queryFingerprint).digest('hex');
    
//     // Check if client has this data cached (HTTP 304 handling)
//     if (req.headers['if-none-match'] === etag) {
//       res.status(304).end();
//       return;
//     }

//     // Parse pagination parameters
//     const limit = parseInt(req.query.limit as string) || 20;
//     const cursor = req.query.cursor as string; // For cursor-based pagination

//     // Parse sorting parameters
//     const sortBy = (req.query.sortBy as string) || "createdAt";
//     const order = (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc";

//     // Parse filtering and search parameters
//     const category = req.query.category as string;
//     const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
//     const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
//     const search = req.query.search as string;
//     const supplierIds = req.query.supplierIds as string | string[];
//     const businessType = req.query.businessType as string;
//     const createdAfter = req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined;
//     const createdBefore = req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined;
//     const tags = req.query.tags as string;

//     // Build where conditions for filtering and search
//     const whereConditions: any = {};

//     // Text search across name, description, and tags
//     if (search) {
//       whereConditions.OR = [
//         { name: { contains: search, mode: "insensitive" } },
//         { description: { contains: search, mode: "insensitive" } },
//         { tags: { contains: search, mode: "insensitive" } },
//       ];
//     }

//     // Apply other filters
//     if (category) whereConditions.category = category;
//     if (tags) whereConditions.tags = { contains: tags, mode: "insensitive" };
    
//     // Price range filter
//     if (minPrice !== undefined || maxPrice !== undefined) {
//       whereConditions.price = {};
//       if (minPrice !== undefined) whereConditions.price.gte = minPrice;
//       if (maxPrice !== undefined) whereConditions.price.lte = maxPrice;
//     }

//     // Supplier filters
//     if (supplierIds) {
//       const supplierIdArray = Array.isArray(supplierIds) ? supplierIds : [supplierIds];
//       whereConditions.supplierId = { in: supplierIdArray };
//     }

//     // Filter by supplier's business type
//     if (businessType) {
//       whereConditions.supplier = { businessType: businessType };
//     }

//     // Date range filters
//     if (createdAfter !== undefined || createdBefore !== undefined) {
//       whereConditions.createdAt = {};
//       if (createdAfter !== undefined) whereConditions.createdAt.gte = createdAfter;
//       if (createdBefore !== undefined) whereConditions.createdAt.lte = createdBefore;
//     }

//     // Build query options with lean supplier inclusion
//     const queryOptions: any = {
//       where: whereConditions,
//       take: limit + 1, // Take one extra to determine if there are more items
//       orderBy: {
//         [sortBy]: order,
//       },
//       include: {
//         supplier: {
//           select: {
//             id: true,
//             businessType: true,
//             user: {
//               select: {
//                 name: true,
//                 id: true,
//               },
//             },
//           },
//         },
//       },
//     };

//     // Add cursor for efficient pagination if provided
//     if (cursor) {
//       queryOptions.cursor = { id: cursor };
//       queryOptions.skip = 1; // Skip the cursor
//     }

//     // Execute query with optimization for counting
//     let products = await prisma.product.findMany(queryOptions);

//     // Check if we have more results
//     const hasNextPage = products.length > limit;
//     if (hasNextPage) {
//       products = products.slice(0, limit); // Remove the extra item
//     }

//     // Get the next cursor
//     const nextCursor = hasNextPage ? products[products.length - 1].id : null;

//     // Get total count only when needed (first page of a filtered set)
//     // To avoid unnecessary counts on every request
//     let totalCount = null;
//     if (!cursor && Object.keys(whereConditions).length > 0) {
//       // Only count on first page (no cursor) of filtered results
//       totalCount = await prisma.product.count({ where: whereConditions });
//     }

//     // Format products for response
//     const formattedProducts = products.map(formatProductWithImages);

//     // Set ETag for client-side caching
//     res.setHeader('ETag', etag);
//     res.setHeader('Cache-Control', 'private, max-age=0');

//     res.status(200).json({
//       message: "Products fetched successfully!",
//       data: formattedProducts,
//       meta: {
//         hasNextPage,
//         nextCursor,
//         count: formattedProducts.length,
//         totalCount,
//       },
//     });
//     return;
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     res.status(500).json({ error: "Internal server error!" });
//     return;
//   }
// },
  // Update product
  updateProduct: [
    upload.array("images", 10),
    async (req: AuthRequest, res: Response) => {
      let newImageUrls: string[] = [];
      let imagesToDelete: string[] = [];

      try {
        const productId = req.params.productId;
        const supplier = req.supplier!;

        // Parse the product data from FormData
        let productData;
        try {
          productData = JSON.parse(req.body.productData);
        } catch (error) {
          res.status(400).json({ error: "Invalid product data format!" }); // ---->
          return;
        }

        // Check if product exists and belongs to this supplier
        const existingProduct = await prisma.product.findFirst({
          where: {
            id: productId,
            supplierId: supplier.id,
          },
        });

        if (!existingProduct) {
          res.status(404).json({ error: "Product not found!" }); // ---->
          return;
        }

        // Validate request body
        const validatedData = productSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          category: productData.category,
        });

        if (!validatedData.success) {
          res.status(400).json({
            error: "Validation failed!",
            details: validatedData.error.format(),
          }); // ---->
          return;
        }

        // Get existing images
        const existingImages = existingProduct.images
          ? JSON.parse(existingProduct.images as string)
          : [];

        // Upload new images first before database changes
        const files = req.files as Express.Multer.File[];
        if (files?.length) {
          newImageUrls = await uploadToMinio(files);
        }

        // Calculate images to delete
        if (req.body.removeImages) {
          const indices = JSON.parse(req.body.removeImages);
          imagesToDelete = indices
            .filter((i: any) => i >= 0 && i < existingImages.length)
            .map((i: any) => existingImages[i]);
        }

        // Calculate the updated images array
        const updatedImages = [
          ...existingImages.filter((url: any) => !imagesToDelete.includes(url)),
          ...newImageUrls,
        ];

        // Use transaction to ensure database consistency
        const updatedProduct = await prisma.$transaction(async (tx) => {
          // Update product in database
          const updated = await tx.product.update({
            where: { id: productId },
            data: {
              name: validatedData.data.name,
              description: validatedData.data.description,
              price: validatedData.data.price,
              category: validatedData.data.category,
              images: JSON.stringify(updatedImages),
              updatedAt: new Date(),
            },
          });

          return updated;
        });

        // Only delete images after successful database transaction
        if (imagesToDelete.length > 0) {
          await deleteFromMinio(imagesToDelete);
        }

        res.status(200).json({
          message: "Product updated successfully!",
          data: formatProductWithImages(updatedProduct),
        }); // ---->
        return;
      } catch (error) {
        console.error("Error updating product:", error);

        // Rollback: Delete uploaded images if transaction failed
        if (newImageUrls.length > 0) {
          await deleteFromMinio(newImageUrls);
        }

        res.status(500).json({ error: "Internal server error!" }); // ---->
        return;
      }
    },
  ],

  // Delete product with MinIO cleanup
  deleteProduct: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId;
      const supplier = req.supplier!;

      // Use transaction for consistency
     const result = await prisma.$transaction(async (tx) => {
        // Check if product exists and belongs to this supplier
        const existingProduct = await prisma.product.findFirst({
          where: {
            id: productId,
            supplierId: supplier.id,
          },
        });

        if (!existingProduct) {
          res.status(404).json({ error: "Product not found!" }); // ---->
          return;
        }

        // Get existing images to clean up in MinIO
        const existingImages = existingProduct.images
          ? JSON.parse(existingProduct.images as string)
          : [];

        // Delete product from database
        const remainingProducts = await prisma.product.delete({
          where: { id: productId },
        });
        return {existingImages, remainingProducts};
      });

        // Delete images after successful database transaction
        if (result?.existingImages.length > 0) {
          await deleteFromMinio(result?.existingImages);
        }

        const data =
          result?.remainingProducts &&
          formatProductWithImages(result?.remainingProducts);

        res.status(200).json({
          message: "Product deleted successfully!",
          data,
        }); // ---->
        return;
     
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },

  // Add to product.controller.ts
  deleteAllProducts: async (req: AuthRequest, res: Response) => {
    try {
      const supplier = req.supplier!;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Get all products and their images first
        const products = await tx.product.findMany({
          where: { supplierId: supplier.id },
          select: { images: true },
        });

        // 2. Extract all image URLs
        const allImages = products.flatMap((product) =>
          product.images ? JSON.parse(product.images) : []
        );

        // 3. Delete all products
        const deleteResult = await tx.product.deleteMany({
          where: { supplierId: supplier.id },
        });

        return { count: deleteResult.count, images: allImages };
      });

      // 4. Clean up images after successful transaction
      if (result.images.length > 0) {
        await deleteFromMinio(result.images);
      }

      res.status(200).json({
        message: `Deleted ${result.count} products successfully!`,
        data: [],
      });
    } catch (error) {
      console.error("Error deleting all products:", error);
      res.status(500).json({ error: "Internal server error!" });
    }
  },
};
