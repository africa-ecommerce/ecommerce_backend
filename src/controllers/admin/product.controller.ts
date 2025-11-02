import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config";
import { AuthRequest } from "../../types";
import {
  productSchema,
  productVariationsSchema,
  approveProductSchema,
} from "../../lib/zod/schema";
import {
  deleteImages,
  uploadMiddleware,
  uploadImages,
} from "../../helper/minioObjectStore/image";
import { formatProduct } from "../../helper/formatData";
import { ProductStatus } from "@prisma/client";

export const adminProductController = {
  createProduct: [
    uploadMiddleware.array("images", 3), // Allow up to 3 images
    async (req: Request, res: Response, next: NextFunction) => {
      let imageUrls: string[] = []; // Track keys for rollback
      try {
        const supplierId = req.params.supplierId as string;
        // Parse the product data from FormData
        let productData;
        try {
          productData = JSON.parse(req.body.productData);
        } catch (error) {
          res.status(400).json({ error: "Invalid field data format!" });
          return;
        }
        // Validate main product data -------------> PUT MIN PRICE TO SELL AND MAX PRICE TO SELL
        const validatedData = productSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          minPrice: productData.minPrice,
          maxPrice: productData.maxPrice,
          category: productData.category,
          size: productData.size,
          colors: productData.colors,
          stock: productData.stock,
        });
        if (!validatedData.success) {
          res.status(400).json({
            error: "Invalid product field data!",
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
              error: "Invalid variation field data!",
            });
            return;
          }
          validatedVariations = variationsResult.data;
        }

        // Upload images to MinIO
        const files = req.files as Express.Multer.File[];
        imageUrls = files && files.length > 0 ? await uploadImages(files) : [];
        if (imageUrls.length === 0) {
          res.status(400).json({ error: "At least one image is required!" });
          return;
        }
        // Process the request within a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create product in database using the supplier ID
          const product = await tx.product.create({
            data: {
              name: validatedData.data.name.trim(),
              description: validatedData.data.description,
              price: validatedData.data.price,
              category: validatedData.data.category,
              images: JSON.stringify(imageUrls), // Store URLs as JSON string
              size: validatedData.data.size?.trim(),
              colors: validatedData.data.colors || [],
              stock: validatedData.data.stock,
              minPrice: validatedData.data.minPrice,
              maxPrice: validatedData.data.maxPrice,
              supplierId,
              variations: {
                create: validatedVariations.map((variation: any) => ({
                  size: variation.size?.trim(),
                  colors: variation.colors || [],
                  stock: variation.stock,
                })),
              },
            },
          });

          // Format the product with images and variations
          return formatProduct(product);
        });
        res.status(201).json({
          message: "Product created successfully!",
          data: result,
        });
      } catch (error) {
        // Rollback: Delete uploaded images if transaction failed
        if (imageUrls.length > 0) {
          await deleteImages(imageUrls);
        }
        next(error);
      }
    },
  ],

  // Update product
  updateProduct: [
    uploadMiddleware.array("images", 3),
    async (req: Request, res: Response, next: NextFunction) => {
      let newImageUrls: string[] = [];
      let imagesToDelete: string[] = [];
      try {
        const productId = req.params.productId;
        const supplierId = req.params.supplierId;
        // Parse the product data from FormData -------------> PUT MIN PRICE TO SELL AND MAX PRICE TO SELL
        let productData;
        try {
          productData = JSON.parse(req.body.productData);
        } catch (error) {
          res.status(400).json({ error: "Invalid field data format!" });
          return;
        }
        // Check if product exists and belongs to this supplier
        const existingProduct = await prisma.product.findFirst({
          where: {
            id: productId,
            supplierId,
          },
        });
        if (!existingProduct) {
          res.status(404).json({ error: "Product not found!" });
          return;
        }
        // Validate request body for base product data
        const validatedData = productSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          minPrice: productData.minPrice,
          maxPrice: productData.maxPrice,
          category: productData.category,
          size: productData.size,
          color: productData.color,
          stock: productData.stock,
        });

        if (!validatedData.success) {
          res.status(400).json({
            error: "Invalid product field data!",
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
              error: "Invalid variation field data!",
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
        const currentImages = productData.imageUrls || [];
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
        if (updatedImages.length === 0) {
          res.status(400).json({ error: "At least one image is required!" });
          return;
        }
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
                size: variation.size?.trim(),
                color: variation.color?.trim(),
                stock: variation.stock,
              })),
            });
          }
          // Update base product data with all fields, matching the create endpoint
          const updated = await tx.product.update({
            where: { id: productId },
            data: {
              name: validatedData.data.name.trim(),
              description: validatedData.data.description,
              price: validatedData.data.price,
              minPrice: validatedData.data.minPrice,
              maxPrice: validatedData.data.maxPrice,
              category: validatedData.data.category,
              size: validatedData.data.size?.trim(),
              colors: validatedData.data.colors,
              stock: validatedData.data.stock,
              images: JSON.stringify(updatedImages),
              updatedAt: new Date(),
            },
          });

          return updated;
        });

        // Only delete images after successful database transaction
        if (imagesToDelete.length > 0) {
          await deleteImages(imagesToDelete);
        }
        res.status(200).json({
          message: "Product updated successfully!",
          data: formatProduct(updatedProduct),
        });
      } catch (error) {
        // Rollback: Delete uploaded images if transaction failed
        if (newImageUrls.length > 0) {
          await deleteImages(newImageUrls);
        }
        next(error);
      }
    },
  ],

  // Delete product with MinIO cleanup
  deleteProduct: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.productId;
      const supplierId = req.params.supplierId;
      // Use transaction for consistency
      const result = await prisma.$transaction(async (tx) => {
        // Check if product exists and belongs to this supplier
        const existingProduct = await prisma.product.findFirst({
          where: {
            id: productId,
            supplierId: supplierId,
          },
        });

        if (!existingProduct) {
          throw new Error("NOT_FOUND");
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

      // Format the remaining products with images and variations
      const data =
        result?.remainingProducts && formatProduct(result?.remainingProducts);

      res.status(200).json({
        message: "Product deleted successfully!",
        data,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        res.status(404).json({ error: "Product not found!" });
        return;
      }
      next(error);
    }
  },

  getSupplierProducts: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const status = (
        req.query.productStatus as string | undefined
      )?.toUpperCase();
      const where: any = {};
      if (
        status &&
        Object.values(ProductStatus).includes(status as ProductStatus)
      ) {
        where.status = status as ProductStatus;
      }
      const supplierId = req.params.supplierId;
      where.supplierId = supplierId;
      // Get all products filter by product status
      const products = await prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          variations: true,
          supplier: {
            select: {
              businessName: true,
              pickupLocation: {
                select: {
                  lga: true,
                  state: true,
                },
              },
              avatar: true,
            },
          },
        },
      });

      // Format products with parsed images
      const formattedProducts = products.map(formatProduct);
      res.status(200).json({
        message: "Products fetched successfully!",
        data: formattedProducts,
      });
    } catch (error) {
      next(error);
    }
  },

  approveSupplierProducts: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const productId = req.params.productId;
      console.log("body", req.body);
      const { minPrice, maxPrice } = approveProductSchema.parse(req.body);

      // Check product
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

     
      // Validate prices
      if (minPrice < product.price) {
        res.status(400).json({
          error: "Min price cannot be less than base supplier price!",
        });
        return;
      }
      if (maxPrice <= minPrice) {
        res.status(400).json({
          error: "Max price must be greater than min price!",
        });
        return;
      }

      // Approve product
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          minPrice,
          maxPrice,
          updatedAt: new Date(),
        },
      });

      res.status(200).json({
        message: "Product approved successfully!",
      });
    } catch (error) {
      next(error);
    }
  },

  querySupplierProducts: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const productId = req.params.productId;

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

     

      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          updatedAt: new Date(),
        },
      });

      res.status(200).json({
        message: "Product queried successfully!",
      });
    } catch (error) {
      next(error);
    }
  },
};