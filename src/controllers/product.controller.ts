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




// Controller methods
export const productController = {

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
                  avatar: true
                },
              },
            },
          });

          // Format the product with images and variations
          return formatProductWithImagesAndVariations(product);
        });

       // invalidate cache after creating product
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
              avatar: true
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
      }); 
      return;
    } catch (error) {
      console.error("Error fetching supplier products:", error);
      res.status(500).json({ error: "Internal server error!" }); 
      return;
    }
  },

  

  // Update product
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
          }
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
              error: "Product validation failed!",
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
              supplier: {
                select: {
                  businessName: true,
                  pickupLocation: true,
                  avatar: true,
                },
              },
              variations: true,
            },
          });

          return updated;
        });

        // Only delete images after successful database transaction
        if (imagesToDelete.length > 0) {
          await deleteImages(imagesToDelete);
        }

        // Invalidate cache after updating product
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
        });
        return { existingImages, remainingProducts };
      });

      // Delete images after successful database transaction
      if (result?.existingImages.length > 0) {
        await deleteImages(result?.existingImages);
      }

      // Format the remaining products with images and variations
      const data =
        result?.remainingProducts &&
        formatProductWithImagesAndVariations(result?.remainingProducts);

      // Invalidate cache after deleting product
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

// Delete all products for a supplier
  deleteAllProducts: async (req: AuthRequest, res: Response) => {
    try {
      const supplier = req.supplier!;

      const result = await prisma.$transaction(async (tx) => {
        // Get all products and their images first
        const products = await tx.product.findMany({
          where: { supplierId: supplier.id },
          select: { images: true },
        });

        //  Extract all image URLs
        const allImages = products.flatMap((product) =>
          product.images ? JSON.parse(product.images) : []
        );

        // Delete all products
        const deleteResult = await tx.product.deleteMany({
          where: { supplierId: supplier.id },
          
        });

        return { count: deleteResult.count, images: allImages };
      });

      // Clean up images after successful transaction
      if (result.images.length > 0) {
        await deleteImages(result.images);
      }


      // Invalidate cache after deleting all products
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
