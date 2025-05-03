// src/controllers/product.controller.ts
import { Response } from "express";
import { generateCacheKey, invalidateProductCache, prisma, productCache } from "../config";
import { AuthRequest } from "../types";
import { productSchema, productVariationsSchema } from "../lib/zod/schema";
import {
  deleteImages,
  uploadMiddleware,
  uploadImages,
} from "../helper/minioObjectStore/productImage";
import { formatProductWithImagesAndVariations } from "../helper/formatProduct";
// import { Product, ProductVariation } from "@prisma/client";




// Function to handle dimensions in a variation
// function formatDimensions(length?: number, width?: number, height?: number, unit: string = 'cm') {
//   if (length === undefined && width === undefined && height === undefined) {
//     return null;
//   }
  
//   return JSON.stringify({
//     length: length || 0,
//     width: width || 0,
//     height: height || 0,
//     unit
//   });
// }

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

// Controller methods
export const productController = {
  // Create a new product
  // createProduct: [
  //   uploadMiddleware.array("images", 3), // Allow up to 3 images
  //   async (req: AuthRequest, res: Response) => {
  //     let imageUrls: string[] = []; // Track keys for rollback

  //     try {
  //       const supplier = req.supplier!;

  //       // Parse the product data from FormData
  //       let productData;
  //       try {
  //         productData = JSON.parse(req.body.productData);
  //       } catch (error) {
  //         res.status(400).json({ error: "Invalid product data format!" }); // ---->
  //         return;
  //       }

  //       // Validate request body
  //       const validatedData = productSchema.safeParse({
  //         name: productData.name,
  //         description: productData.description,
  //         price: parseFloat(productData.price),
  //         category: productData.category,
  //       });

  //       if (!validatedData.success) {
  //         res.status(400).json({
  //           error: "Validation failed!",
  //         }); // ---->
  //         return;
  //       }

  //       // Process the request within a transaction
  //       const result = await prisma.$transaction(async (tx) => {
  //         // Upload images to MinIO
  //         const files = req.files as Express.Multer.File[];
  //         imageUrls =
  //           files && files.length > 0 ? await uploadImages(files) : [];

  //         // Create product in database using the supplier ID
  //         const product = await tx.product.create({
  //           data: {
  //             name: validatedData.data.name,
  //             description: validatedData.data.description,
  //             price: validatedData.data.price,
  //             category: validatedData.data.category,
  //             images: JSON.stringify(imageUrls), // Store URLs as JSON string
  //             supplierId: supplier.id,
  //           },
  //         });

  //         return formatProductWithImages(product);
  //       });

  //       res.status(201).json({
  //         message: "Product created successfully!",
  //         data: result,
  //       }); // ---->
  //       return;
  //     } catch (error) {
  //       console.error("Error creating product:", error);

  //       // Rollback: Delete uploaded images if transaction failed
  //       if (imageUrls.length > 0) {
  //         await deleteImages(imageUrls);
  //       }

  //       res.status(500).json({ error: "Internal server error!" }); // ---->
  //       return;
  //     }
  //   },
  // ],

  createProduct: [
    uploadMiddleware.array("images", 3), // Allow up to 3 images
    async (req: AuthRequest, res: Response) => {
      let imageUrls: string[] = []; // Track keys for rollback

      try {
        const supplier = req.supplier!;

        // Parse the product data from FormData
        let productData;
        try {
          productData = JSON.parse(req.body.productData);
        } catch (error) {
          res.status(400).json({ error: "Invalid product data format!" });
          return;
        }

        // Validate main product data
        const validatedData = productSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          category: productData.category,
          size: productData.size,
          color: productData.color,
          stock: productData.stock,
          weight: productData.weight,
          dimensions: productData.dimensions,
        });

        if (!validatedData.success) {
          res.status(400).json({
            error: "Product validation failed!",
          });
          return;
        }

        // Validate product variations if provided
        let validatedVariations: any = [];
        if (productData.variations && Array.isArray(productData.variations)) {
          const variationsResult = productVariationsSchema.safeParse(
            productData.variations
          );
          if (!variationsResult.success) {
            res.status(400).json({
              error: "Variations validation failed!",
              details: variationsResult.error.format(),
            });
            return;
          }
          validatedVariations = variationsResult.data;
        }

        // Upload images to MinIO
        const files = req.files as Express.Multer.File[];
        imageUrls = files && files.length > 0 ? await uploadImages(files) : [];

        // Process the request within a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create product in database using the supplier ID
          const product = await tx.product.create({
            data: {
              name: validatedData.data.name,
              description: validatedData.data.description,
              price: validatedData.data.price,
              category: validatedData.data.category,
              images: JSON.stringify(imageUrls), // Store URLs as JSON string
              size: validatedData.data.size,
              color: validatedData.data.color,
              stock: validatedData.data.stock,
              weight: validatedData.data.weight,
              dimensions: validatedData.data.dimensions,
              supplierId: supplier.id,
              variations: {
                create: validatedVariations.map((variation: any) => ({
                  size: variation.size,
                  color: variation.color,
                  price: variation.price,
                  stock: variation.stock,
                  weight: variation.weight,
                  dimensions: variation.dimensions,
                })),
              },
            },
            include: {
              variations: true,
              supplier: {
                select: {
                  businessName: true,
                  pickupLocation: true,
                },
              },
            },
          });

          return formatProductWithImagesAndVariations(product);
        });

        invalidateProductCache();
        res.status(201).json({
          message: "Product created successfully!",
          data: result,
        });
        return;
      } catch (error) {
        console.error("Error creating product:", error);

        // Rollback: Delete uploaded images if transaction failed
        if (imageUrls.length > 0) {
          await deleteImages(imageUrls);
        }

        res.status(500).json({ error: "Internal server error!" });
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
        include: {
          variations: true,
           supplier: {
            select: {
              businessName: true,
              pickupLocation: true,
            },
          },
        },
      });

      // Format products with parsed images
      const formattedProducts = products.map(
        formatProductWithImagesAndVariations
      );

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
  // Get product by ID
  getProductById: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId;

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          supplier: {
            select: {
              businessName: true,
              pickupLocation: true,
            },
          },
          variations: true,
        },
      });

      if (!product) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // Format the product
      const formattedProduct = formatProductWithImagesAndVariations(product);

      // Check if user is a plug and add isPlugged flag
      if (req.user && req.user.userType === "PLUG") {
        // Check if this product is in the plug's database
        const pluggedProduct = await prisma.plugProduct.findFirst({
          where: {
            plugId: req.user.id,
            id: productId,
          },
        });

        // Add isPlugged flag to the response
        res.status(200).json({
          message: "Product fetched successfully!",
          data: {
            ...formattedProduct,
            isPlugged: !!pluggedProduct, // Convert to boolean
          },
        });
        return;
      }

      // Regular response for non-plug users
      res.status(200).json({
        message: "Product fetched successfully!",
        data: formattedProduct,
      });
      return;
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },

  // Get all products with efficient pagination for infinite scrolling
  // getAllProducts: async (req: AuthRequest, res: Response) => {
  //   try {
  //     // Parse pagination parameters
  //     const limit = parseInt(req.query.limit as string) || 20;
  //     const cursor = req.query.cursor as string; // For cursor-based pagination

  //     // Parse sorting parameters
  //     const sortBy = (req.query.sortBy as string) || "createdAt";
  //     const order =
  //       (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc";

  //     // Parse filtering and search parameters
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
  //     const tags = req.query.tags as string; // For searching product tags/keywords

  //     // Build where conditions for filtering and search
  //     const whereConditions: any = {};

  //     // Text search across name, description, and tags
  //     if (search) {
  //       whereConditions.OR = [
  //         { name: { contains: search, mode: "insensitive" } },
  //         { description: { contains: search, mode: "insensitive" } },
  //         { tags: { contains: search, mode: "insensitive" } }, // Search in tags field
  //       ];
  //     }

  //     // For more advanced full-text search when available in your Postgres setup
  //     // This would use the built-in full-text search capabilities of Postgres
  //     // if (search) {
  //     //   whereConditions.OR = [
  //     //     { name: { search: search } },
  //     //     { description: { search: search } },
  //     //     { tags: { search: search } },
  //     //   ];
  //     // }

  //     // Category filter
  //     if (category) {
  //       whereConditions.category = category;
  //     }

  //     // Tags/keywords filter (exact match or array inclusion)
  //     if (tags) {
  //       whereConditions.tags = { contains: tags, mode: "insensitive" };
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

  //     // / Build query options
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
  //           },
  //         },
  //         variations: true,
  //       },
  //     };

  //     // Add cursor for efficient pagination if provided
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
  //       const nextCursor = hasNextPage
  //         ? products[products.length - 1].id
  //         : null;

  //       // Get total count when filters are applied (for analytics/UI purposes)
  //       let totalCount = null;
  //       if (Object.keys(whereConditions).length > 0) {
  //         totalCount = await tx.product.count({ where: whereConditions });
  //       }

  //       // Format products for response
  //       const formattedProducts = products.map(
  //         formatProductWithImagesAndVariations
  //       );
  //       //  const formattedProducts = products.map((product) => ({
  //       //    ...product,
  //       //    images: product.images ? JSON.parse(product.images as string) : []
  //       //   //  tags: product.tags ? JSON.parse(product.tags as string) : [],
  //       //   //  supplier: product.supplier
  //       //      ? {
  //       //          id: product.supplier.id,
  //       //          businessType: product.supplier.businessType,
  //       //          businessName: product.supplier.user.name,
  //       //          userId: product.supplier.user.id,
  //       //        }
  //       //      : null,
  //       //  }));

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

  //     res.status(200).json({
  //       message: "Products fetched successfully!",
  //       data: result.products,
  //       meta: result.meta,
  //     });
  //     return;
  //   } catch (error) {
  //     console.error("Error fetching products:", error);
  //     res.status(500).json({ error: "Internal server error!" });
  //     return;
  //   }
  // },

  // Get all products with efficient pagination and query optimization
  getAllProducts: async (req: AuthRequest, res: Response) => {
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
      const tags = req.query.tags as string;

      // Generate cache key (without cursor for page 1)
      const cacheParams = { ...req.query, cursor: "" };
      if (cursor) {
        cacheParams.cursor = cursor;
      }
      const cacheKey = generateCacheKey(cacheParams);

      // Try to get data from cache first
      const cachedResult = productCache.get<ProductsResponse>(cacheKey);
      if (cachedResult) {
        console.log(`Cache hit for: ${cacheKey}`);

        // Check if user is a plug and handle plugged products
        let responseData = cachedResult.products;
        if (req.user && req.user.userType === "PLUG") {
          // Fetch plug's products from database for comparison
          const pluggedProducts = await prisma.plugProduct.findMany({
            where: {
              plugId: req.user.id,
            },
            select: {
              id: true,
            },
          });

          const pluggedProductIds = pluggedProducts.map((pp) => pp.id);

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
          { tags: { contains: search, mode: "insensitive" } },
        ];
      }

      // Category filter
      if (category) {
        whereConditions.category = category;
      }

      // Tags/keywords filter
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
              businessName: true,
              pickupLocation: true,
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
        const nextCursor = hasNextPage
          ? products[products.length - 1].id
          : null;

        // Get total count (with a separate cache to avoid recounting)
        const countCacheKey = `count:${generateCacheKey({
          ...cacheParams,
          cursor: undefined,
        })}`;
        let totalCount = productCache.get<number>(countCacheKey);

        if (
          totalCount === undefined &&
          Object.keys(whereConditions).length > 0
        ) {
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
      if (req.user && req.user.userType === "PLUG") {
        // Fetch plug's products from database for comparison
        const pluggedProducts = await prisma.plugProduct.findMany({
          where: {
            plugId: req.user.id,
          },
          select: {
            id: true,
          },
        });

        const pluggedProductIds = pluggedProducts.map((pp) => pp.id);

        // Add isPlugged flag to each product
        responseData = responseData.map((product) => ({
          ...product,
          isPlugged: pluggedProductIds.includes(product.id),
        }));
      }

      // Cache the original result without the plug-specific data
      productCache.set(cacheKey, result);

      res.status(200).json({
        message: "Products fetched successfully!",
        data: responseData,
        meta: result.meta,
      });
      return;
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },
  // Update product
  // updateProduct: [
  //   uploadMiddleware.array("images", 3),
  //   async (req: AuthRequest, res: Response) => {
  //     let newImageUrls: string[] = [];
  //     let imagesToDelete: string[] = [];

  //     try {
  //       const productId = req.params.productId;
  //       const supplier = req.supplier!;

  //       // Parse the product data from FormData
  //       let productData;
  //       try {
  //         productData = JSON.parse(req.body.productData);
  //       } catch (error) {
  //         res.status(400).json({ error: "Invalid product data format!" }); // ---->
  //         return;
  //       }

  //       // Check if product exists and belongs to this supplier
  //       const existingProduct = await prisma.product.findFirst({
  //         where: {
  //           id: productId,
  //           supplierId: supplier.id,
  //         },
  //       });

  //       if (!existingProduct) {
  //         res.status(404).json({ error: "Product not found!" }); // ---->
  //         return;
  //       }

  //       // Validate request body
  //       const validatedData = productSchema.safeParse({
  //         name: productData.name,
  //         description: productData.description,
  //         price: parseFloat(productData.price),
  //         category: productData.category,
  //       });

  //       if (!validatedData.success) {
  //         res.status(400).json({
  //           error: "Validation failed!",
  //           details: validatedData.error.format(),
  //         }); // ---->
  //         return;
  //       }

  //       // Get existing images
  //       const existingImages = existingProduct.images
  //         ? JSON.parse(existingProduct.images as string)
  //         : [];

  //       // Upload new images first before database changes
  //       const files = req.files as Express.Multer.File[];
  //       if (files?.length) {
  //         newImageUrls = await uploadImages(files);
  //       }

  //       // Calculate images to delete
  //       if (req.body.removeImages) {
  //         const indices = JSON.parse(req.body.removeImages);
  //         imagesToDelete = indices
  //           .filter((i: any) => i >= 0 && i < existingImages.length)
  //           .map((i: any) => existingImages[i]);
  //       }

  //       // Calculate the updated images array
  //       const updatedImages = [
  //         ...existingImages.filter((url: any) => !imagesToDelete.includes(url)),
  //         ...newImageUrls,
  //       ];

  //       // Use transaction to ensure database consistency
  //       const updatedProduct = await prisma.$transaction(async (tx) => {
  //         // Update product in database
  //         const updated = await tx.product.update({
  //           where: { id: productId },
  //           data: {
  //             name: validatedData.data.name,
  //             description: validatedData.data.description,
  //             price: validatedData.data.price,
  //             category: validatedData.data.category,
  //             images: JSON.stringify(updatedImages),
  //             updatedAt: new Date(),
  //           },
  //         });

  //         return updated;
  //       });

  //       // Only delete images after successful database transaction
  //       if (imagesToDelete.length > 0) {
  //         await deleteImages(imagesToDelete);
  //       }

  //       res.status(200).json({
  //         message: "Product updated successfully!",
  //         data: formatProductWithImagesAndVariations(updatedProduct),
  //       }); // ---->
  //       return;
  //     } catch (error) {
  //       console.error("Error updating product:", error);

  //       // Rollback: Delete uploaded images if transaction failed
  //       if (newImageUrls.length > 0) {
  //         await deleteImages(newImageUrls);
  //       }

  //       res.status(500).json({ error: "Internal server error!" }); // ---->
  //       return;
  //     }
  //   },
  // ],

  updateProduct: [
    uploadMiddleware.array("images", 3),
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
          res.status(400).json({ error: "Invalid product data format!" });
          return;
        }

        // Check if product exists and belongs to this supplier
        const existingProduct = await prisma.product.findFirst({
          where: {
            id: productId,
            supplierId: supplier.id,
          },
          include: {
            variations: true,
          },
        });

        if (!existingProduct) {
          res.status(404).json({ error: "Product not found!" });
          return;
        }

        // Validate request body for base product data (now matching the createProduct fields)
        const validatedData = productSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          category: productData.category,
          size: productData.size,
          color: productData.color,
          stock: productData.stock,
          weight: productData.weight,
          dimensions: productData.dimensions,
        });

        if (!validatedData.success) {
          res.status(400).json({
            error: "Product validation failed!",
            details: validatedData.error.format(),
          });
          return;
        }

        // Validate product variations if provided
        let validatedVariations: any = [];
        if (productData.variations && Array.isArray(productData.variations)) {
          const variationsResult = productVariationsSchema.safeParse(
            productData.variations
          );
          if (!variationsResult.success) {
            res.status(400).json({
              error: "Variations validation failed!",
              details: variationsResult.error.format(),
            });
            return;
          }
          validatedVariations = variationsResult.data;
        }

        // Get existing images from database
        const existingImages = existingProduct.images
          ? JSON.parse(existingProduct.images as string)
          : [];

        // Get current images from client (what they want to keep)
        const currentImages = productData.images || [];

        // Determine which images were removed (exist in database but not in client data)
        imagesToDelete = existingImages.filter(
          (url: string) => !currentImages.includes(url)
        );

        // Upload new images first before database changes
        const files = req.files as Express.Multer.File[];
        if (files?.length) {
          newImageUrls = await uploadImages(files);
        }

        // Calculate the updated images array - current images from client plus newly uploaded ones
        const updatedImages = [...currentImages, ...newImageUrls];

        // Use transaction to ensure database consistency
        const updatedProduct = await prisma.$transaction(async (tx) => {
          // First, delete all existing variations
          await tx.productVariation.deleteMany({
            where: { productId },
          });

          // Create new variations
          if (validatedVariations.length > 0) {
            await tx.productVariation.createMany({
              data: validatedVariations.map((variation: any) => ({
                productId,
                size: variation.size,
                color: variation.color,
                price: variation.price,
                stock: variation.stock,
                weight: variation.weight,
                dimensions: variation.dimensions,
              })),
            });
          }

          // Update base product data with all fields, matching the create endpoint
          const updated = await tx.product.update({
            where: { id: productId },
            data: {
              name: validatedData.data.name,
              description: validatedData.data.description,
              price: validatedData.data.price,
              category: validatedData.data.category,
              size: validatedData.data.size,
              color: validatedData.data.color,
              stock: validatedData.data.stock,
              weight: validatedData.data.weight,
              dimensions: validatedData.data.dimensions,
              images: JSON.stringify(updatedImages),
              updatedAt: new Date(),
            },
            include: {
              variations: true,
            },
          });

          return updated;
        });

        // Only delete images after successful database transaction
        if (imagesToDelete.length > 0) {
          await deleteImages(imagesToDelete);
        }

        invalidateProductCache();

        res.status(200).json({
          message: "Product updated successfully!",
          data: formatProductWithImagesAndVariations(updatedProduct),
        });
        return;
      } catch (error) {
        console.error("Error updating product:", error);

        // Rollback: Delete uploaded images if transaction failed
        if (newImageUrls.length > 0) {
          await deleteImages(newImageUrls);
        }

        res.status(500).json({ error: "Internal server error!" });
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
        return { existingImages, remainingProducts };
      });

      // Delete images after successful database transaction
      if (result?.existingImages.length > 0) {
        await deleteImages(result?.existingImages);
      }

      const data =
        result?.remainingProducts &&
        formatProductWithImagesAndVariations(result?.remainingProducts);

      invalidateProductCache();
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
        await deleteImages(result.images);
      }

      invalidateProductCache();

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
