import { Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { plugProductSchema } from "../lib/zod/schema";
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

export const plugProductController = {
  // Add a supplier's product to plug's draft products
  addProductToPlug: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId; // The supplier's product ID
      const plug = req.plug!;

      // Define a result object to hold the transaction outcome
      let transactionResult: {
        status: number;
        message?: string;
        data?: any;
        error?: string;
      };

      // Using a transaction to ensure data consistency
      transactionResult = await prisma.$transaction(async (tx) => {
        // Check if the product exists
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          return {
            status: 404,
            error: "Product not found!",
          };
        }

        // Check if the product is already plugged by this plug
        const existingPlugProduct = await tx.plugProduct.findFirst({
          where: {
            originalId: productId,
            plugId: plug.id,
          },
        });

        if (existingPlugProduct) {
          return {
            status: 409,
            error: "Product has been plugged into!",
          };
        }

        // Add the product to the plug's draft products
        const plugProduct = await tx.plugProduct.create({
          data: {
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            images: product.images, // Copy original images
            originalId: product.id,
            plugId: plug.id,
            status: "DRAFT",
          },
        });

        return {
          status: 201,
          message: "Product already added to your draft!",
          data: formatProductWithImages(plugProduct),
        };
      });

      // Now handle the response based on the transaction result
      if (transactionResult.error) {
        res
          .status(transactionResult.status)
          .json({ error: transactionResult.error });
        return;
      }

      res.status(transactionResult.status).json({
        message: transactionResult.message,
        data: transactionResult.data,
      });
      return;
    } catch (error) {
      console.error("Error adding product to plug:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },

  // Get all draft products for a plug
  getDraftProducts: async (req: AuthRequest, res: Response) => {
    try {
      const plug = req.plug!;

      // Get all draft products
      const draftProducts = await prisma.plugProduct.findMany({
        where: {
          plugId: plug.id,
          status: "DRAFT",
        },
        orderBy: { createdAt: "desc" },
      });

      // Parse the images JSON for each product
      const formattedProducts =
        draftProducts.length > 0
          ? draftProducts.map(formatProductWithImages)
          : [];

      res.status(200).json({
        message: "Draft products fetched successfully!",
        data: formattedProducts,
      }); // ---->
      return;
    } catch (error) {
      console.error("Error fetching draft products:", error);

      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },

  // Get all published products for a plug
  getPublishedProducts: async (req: AuthRequest, res: Response) => {
    try {
      const plug = req.plug!;

      // Get all published products
      const publishedProducts = await prisma.plugProduct.findMany({
        where: {
          plugId: plug.id,
          status: "PUBLISHED",
        },
        orderBy: { createdAt: "desc" },
      });

      // Parse the images JSON for each product
      const formattedProducts =
        publishedProducts.length > 0
          ? publishedProducts.map(formatProductWithImages)
          : [];

      res.status(200).json({
        message: "Published products fetched successfully!",
        data: formattedProducts,
      }); // ---->
      return;
    } catch (error) {
      console.error("Error fetching published products:", error);
      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },

  // Update a draft product
  updateDraftProduct: [
    upload.array("images", 10),
    async (req: AuthRequest, res: Response) => {
      let newImageUrls: string[] = [];
      let imagesToDelete: string[] = [];

      try {
        const productId = req.params.productId;
        const plug = req.plug!;

        // Check if product exists and belongs to this plug
        const existingProduct = await prisma.plugProduct.findFirst({
          where: {
            id: productId,
            plugId: plug.id,
          },
        });

        if (!existingProduct) {
          res.status(404).json({ error: "Product not found!" }); // ---->
          return;
        }

        // Parse the product data from FormData
        let productData;
        try {
          productData = JSON.parse(req.body.productData);
        } catch (error) {
          res.status(400).json({ error: "Invalid product data format!" }); // ---->
          return;
        }

        // Validate request body
        const validatedData = plugProductSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          category: productData.category,
        });

        if (!validatedData.success) {
          res.status(400).json({ error: "Validation failed!" }); // ---->
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
            .filter((i) => i >= 0 && i < existingImages.length)
            .map((i) => existingImages[i]);
        }

        // Calculate the updated images array
        const updatedImages = [
          ...existingImages.filter((url) => !imagesToDelete.includes(url)),
          ...newImageUrls,
        ];

        // Use transaction to ensure database consistency
        const updatedProduct = await prisma.$transaction(async (tx) => {
          // Update product in database
          const updated = await tx.plugProduct.update({
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
        });
        return;
      } catch (error) {
        // Rollback: Delete uploaded images if database operation failed
        if (newImageUrls.length > 0) {
          await deleteFromMinio(newImageUrls);
        }
        console.error("Error updating draft product:", error);

        res.status(500).json({ error: "Internal server error!" }); // ---->
        return;
      }
    },
  ],

  // Publish draft products
  publishDraftProducts: async (req: AuthRequest, res: Response) => {
    try {
      const plug = req.plug!;
      const { productIds } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        res.status(400).json({
          error: "Please provide a valid list of products!",
        });
        return;
      }

      // Use transaction for batch update
      const publishResult = await prisma.$transaction(async (tx) => {
        return await tx.plugProduct.updateMany({
          where: {
            id: { in: productIds },
            plugId: plug.id,
            status: "DRAFT",
          },
          data: {
            status: "PUBLISHED",
            updatedAt: new Date(),
          },
        });
      });

      res.status(200).json({
        message: `Successfully published ${publishResult.count} products!`,
        data: { count: publishResult.count },
      });
      return;
    } catch (error) {
      console.error("Error publishing draft products:", error);
      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },

  // Remove product from plug's inventory - cleaner implementation
removePlugProduct: async (req: AuthRequest, res: Response) => {
  try {
    const productId = req.params.productId;
    const plug = req.plug!;
    
    // Use transaction to handle both database and file operations
    const customImages = await prisma.$transaction(async (tx) => {
      // Check if product exists and belongs to this plug
      const existingProduct = await tx.plugProduct.findFirst({
        where: {
          id: productId,
          plugId: plug.id,
        },
      });

      if (!existingProduct) {
        // We'll handle this outside the transaction
        return null;
      }

      // Find custom images that need to be deleted
      let imagesToDelete: string[] = [];

      if (existingProduct.images) {
        // Get the original product images
        const originalProduct = await tx.product.findUnique({
          where: { id: existingProduct.originalId },
        });

        const existingImages = JSON.parse(existingProduct.images as string);
        const originalImages = originalProduct?.images
          ? JSON.parse(originalProduct.images as string)
          : [];

        // Find images that were uploaded by the plug (not in original product)
        imagesToDelete = existingImages.filter(
          (img) => !originalImages.includes(img)
        );
      }

      // Delete the product from database
      await tx.plugProduct.delete({
        where: { id: productId },
      });

      return imagesToDelete;
    });
    
    // Handle case where product wasn't found
    if (customImages === null) {
      res.status(404).json({ error: "Product not found!" });
      return;
    }
    
    // Delete any custom images after successful transaction
    if (customImages.length > 0) {
      await deleteFromMinio(customImages);
    }
    
    res.status(200).json({
      message: "Product removed successfully!",
    });
  } catch (error) {
    console.error("Error removing plug product:", error);
    res.status(500).json({ error: "Internal server error!" });
  }
},

  // Get product by ID
  getPlugProductById: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId;
      const plug = req.plug!;

      // Get the product
      const product = await prisma.plugProduct.findFirst({
        where: {
          id: productId,
          plugId: plug.id,
        },
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
      console.error("Error fetching plug product:", error);
      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },

  // Remove all products from plug's inventory
  removeAllPlugProducts: async (req: AuthRequest, res: Response) => {
    try {
      const plug = req.plug!;

      // Use transaction for consistency
      const result = await prisma.$transaction(async (tx) => {
        // Find all products belonging to this plug to get their images
        const plugProducts = await tx.plugProduct.findMany({
          where: { plugId: plug.id },
          select: {
            id: true,
            images: true,
            originalId: true,
          },
        });

        if (!plugProducts.length) {
          return { status: 200, message: "No products to remove!" };
        }

        // Collect custom images to delete
        const customImagesPromises = plugProducts.map(async (product) => {
          if (!product.images) return [];

          // Get the original product images
          const originalProduct = await tx.product.findUnique({
            where: { id: product.originalId },
          });

          const existingImages = JSON.parse(product.images as string);
          const originalImages = originalProduct?.images
            ? JSON.parse(originalProduct.images as string)
            : [];

          // Find images that were uploaded by the plug (not in original product)
          return existingImages.filter((img) => !originalImages.includes(img));
        });

        const customImagesArrays = await Promise.all(customImagesPromises);
        const customImages = customImagesArrays.flat();

        // Delete all products in the transaction
        const deleteResult = await tx.plugProduct.deleteMany({
          where: { plugId: plug.id },
        });

        return {
          status: 200,
          message: `Successfully removed ${deleteResult.count} products!`,
          customImages,
        };
      });

      // Delete images after successful transaction
      if (result.customImages && result.customImages.length > 0) {
        await deleteFromMinio(result.customImages);
      }

      res.status(result.status).json({
        message: result.message,
      }); // ---->
      return;
    } catch (error) {
      console.error("Error removing all plug products:", error);
      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },
};
