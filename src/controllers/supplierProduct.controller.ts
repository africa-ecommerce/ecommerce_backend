import { NextFunction, Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import {
  productSchema,
  productVariationsSchema,
  updateProductSchema,
  updateProductVariationsSchema,
} from "../lib/zod/schema";
import {
  deleteImages,
  uploadMiddleware,
  uploadImages,
} from "../helper/minioObjectStore/image";
import { formatProduct } from "../helper/formatData";

// Controller methods
export const productController = {
  // Create product for a supplier --- currently commented out LEAVE AS IS
  createProduct: [
    uploadMiddleware.array("images", 3), // Allow up to 3 images
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      let imageUrls: string[] = []; // Track keys for rollback
      try {
        const supplier = req.supplier!;
        // Parse the product data from FormData
        let productData;
        try {
          productData = JSON.parse(req.body.productData);
        } catch (error) {
          res.status(400).json({ error: "Invalid field data format!" });
          return;
        }

        console.log("productData", productData);
        // Validate main product data
        const validatedData = productSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
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
              supplierId: supplier.id,
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

  // Get all products for a supplier
  getSupplierProducts: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const supplier = req.supplier!;
      // Get all products
      const products = await prisma.product.findMany({
        where: { supplierId: supplier.id },
        orderBy: { createdAt: "desc" },
        include: {
          variations: true,
          // supplier: {
          //   select: {
          //     businessName: true,
          //     pickupLocation: {
          //       select: {
          //         lga: true,
          //         state: true,
          //       },
          //     },
          //     avatar: true,
          //   },
          // },
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

  getProductById: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const productId = req.params.productId;
       console.log("yes");
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
              pickupLocation: {
                select: {
                  lga: true,
                  state: true,
                },
              },
              avatar: true,
              subscribers: true, // 👈 we need this to check if plug is subscribed
            },
          },
          variations: true,
          reviews: {
            select: {
              rating: true,
              review: true,
              createdAt: true,
              plug: {
                select: {
                  businessName: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      console.log("products", product)

      if (!product) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }
      // Format the product with images, variations, and reviews
      const formattedProduct = formatProduct(product);
      // Check if user is a plug and add isPlugged flag
      if (req.user && req.user.userType === "PLUG" && req.user.plug) {
        const plugId = req.user.plug.id;
        // Check if this product is in the plug's database
        const pluggedProduct = await prisma.plugProduct.findFirst({
          where: {
            plugId,
            originalId: productId,
          },
        });

        // 👇 Check if plug is subscribed to the supplier of the product
        const isSubscribedToSupplier =
          product.supplier.subscribers.includes(plugId);
        // Add isPlugged flag to the response
        res.status(200).json({
          message: "Product fetched successfully!",
          data: {
            ...formattedProduct,
            isPlugged: !!pluggedProduct, // Convert to boolean
            isSubscribedToSupplier,
          },
        });
        return;
      }
      // Regular response for suppliers
      res.status(200).json({
        message: "Product fetched successfully!",
        data: formattedProduct,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update product --- currently commented out LEAVE AS IS
  updateProduct: [
    uploadMiddleware.array("images", 3),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
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
          res.status(400).json({ error: "Invalid field data format!" });
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
          res.status(404).json({ error: "Product not found!" });
          return;
        }
        // Validate request body for base product data
        const validatedData = productSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          category: productData.category,
          size: productData.size,
          colors: productData.colors || [],
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
              colors: variation.colors || [],
              stock: variation.stock,
            })),
          });
        }

        // Check if price changed
        const isPriceChanged =
          existingProduct.price !== validatedData.data.price;

        // Update base product data
        const updated = await tx.product.update({
          where: { id: productId },
          data: {
            name: validatedData.data.name.trim(),
            description: validatedData.data.description,
            price: validatedData.data.price,
            category: validatedData.data.category,
            size: validatedData.data.size?.trim(),
            colors: validatedData.data.colors || [],
            status: "PENDING", // Reset to pending on update
            stock: validatedData.data.stock,
            images: JSON.stringify(updatedImages),
            updatedAt: new Date(),
            priceUpdatedAt: isPriceChanged
              ? new Date()
              : existingProduct.priceUpdatedAt,
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

  // Update only product price and stock
  // updateProductStockAndPrice: [
  //   async (req: AuthRequest, res: Response, next: NextFunction) => {
  //     try {
  //       const productId = req.params.productId;
  //       const supplier = req.supplier!;

  //       const productData = req.body;

  //       // Validate base product stock and price only
  //       const validatedData = updateProductSchema.safeParse({
  //         price: parseFloat(productData.price),
  //         stock: productData.stock,
  //       });

  //       if (!validatedData.success) {
  //         res.status(400).json({ error: "Invalid price or stock data!" });
  //         return;
  //       }

  //       // Validate variations if provided
  //       let validatedVariations: any = [];
  //       if (productData.variations && Array.isArray(productData.variations)) {
  //         const variationsResult = updateProductVariationsSchema.safeParse(
  //           productData.variations
  //         );
  //         if (!variationsResult.success) {
  //           res.status(400).json({ error: "Invalid variation data!" });
  //           return;
  //         }
  //         validatedVariations = variationsResult.data;
  //       }

  //       // Check product ownership
  //       const existingProduct = await prisma.product.findFirst({
  //         where: {
  //           id: productId,
  //           supplierId: supplier.id,
  //         },
  //       });

  //       if (!existingProduct) {
  //         res.status(404).json({ error: "Product not found!" });
  //         return;
  //       }

  //       // Update product and variations in transaction
  //       const updatedProduct = await prisma.$transaction(async (tx) => {
  //         // Update base product
  //         const updated = await tx.product.update({
  //           where: { id: productId },
  //           data: {
  //             price: validatedData.data.price,
  //             stock: validatedData.data.stock,
  //             updatedAt: new Date(),
  //           },
  //         });

  //         // Update variations if provided
  //         if (validatedVariations.length > 0) {
  //           // Delete old variations
  //           await tx.productVariation.deleteMany({ where: { productId } });

  //           // Insert updated variations
  //           await tx.productVariation.createMany({
  //             data: validatedVariations.map((variation: any) => ({
  //               productId,
  //               size: variation.size?.trim(),
  //               color: variation.color?.trim(),
  //               stock: variation.stock,
  //             })),
  //           });
  //         }

  //         return updated;
  //       });

  //       res.status(200).json({
  //         message: "Product stock and price updated successfully!",
  //         data: formatProduct(updatedProduct),
  //       });
  //     } catch (error) {
  //       next(error);
  //     }
  //   },
  // ],

  // Delete product with MinIO cleanup
  deleteProduct: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
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
};
