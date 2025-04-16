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

// Helper function to format products with parsed images
const formatProductWithImages = (product: any) => {
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
      const plug = req.plug!;

      // Basic sorting
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const order =
        (req.query.order as string)?.toLowerCase() === "asc" ? "asc" : "desc";

      // Build query options
      const queryOptions: any = {
        take: limit + 1, // Take one extra to determine if there are more items
        orderBy: {
          [sortBy]: order,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          images: true,
          supplierId: true,
          createdAt: true,
          updatedAt: true,
        },
      };

      // Add cursor for efficient pagination if provided
      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1; // Skip the cursor
      }

      // Use transaction for complex operations
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

        // Parse images and add plugStatus for each product
        const formattedProducts = await Promise.all(
          products.map(async (product) => {
            // Check if this product is already plugged by the current plug
            let plugStatus;

            if (plug.id) {
              const plugProduct = await tx.plugProduct.findFirst({
                where: {
                  originalId: product.id,
                  plugId: plug.id,
                },
                select: { id: true, status: true },
              });

              if (plugProduct) {
                plugStatus = plugProduct.status;
              }
            }

            return {
              ...product,
              images: product.images
                ? JSON.parse(product.images as string)
                : [],
              plugStatus,
            };
          })
        );

        return {
          products: formattedProducts,
          meta: {
            hasNextPage,
            nextCursor,
            count: formattedProducts.length,
          },
        };
      });

      res.status(200).json({
        message: "Products fetched successfully!",
        data: result.products,
        meta: result.meta,
      }); // ---->
      return;
    } catch (error) {
      console.error("Error fetching all products:", error);
      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },

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
      // await prisma.$transaction(async (tx) => {
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

        // Delete images after successful database transaction
        if (existingImages.length > 0) {
          await deleteFromMinio(existingImages);
        }

        res.status(200).json({
          message: "Product deleted successfully!",
          data: formatProductWithImages(remainingProducts),
        }); // ---->
        return;
      // });
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
        // data: { count: result.count },
      });
    } catch (error) {
      console.error("Error deleting all products:", error);
      res.status(500).json({ error: "Internal server error!" });
    }
  },
};
