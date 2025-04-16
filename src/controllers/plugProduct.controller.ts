import { Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { plugProductSchema } from "../lib/zod/schema";
import {
  deleteFromMinio,
  upload,
  uploadToMinio,
} from "../helper/minioObjectStore/productImage";
import { PlugProduct } from "@prisma/client";

// Helper function to format products with parsed images
const formatProductWithImages = (product: PlugProduct) => {
  return {
    ...product,
    images: product.images ? JSON.parse(product.images as string) : [],
  };
};

export const plugProductController = {
  // Add a supplier's product to plug's products
  addProductToPlug: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId;
      const plug = req.plug!;

      const transactionResult = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) return { status: 404, error: "Product not found!" };

        const existingPlugProduct = await tx.plugProduct.findFirst({
          where: {
            originalId: productId,
            plugId: plug.id,
          },
        });

        if (existingPlugProduct) {
          return { status: 409, error: "Product already added!" };
        }

        const plugProduct = await tx.plugProduct.create({
          data: {
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            images: product.images,
            originalId: product.id,
            plugId: plug.id,
          },
        });

        return {
          status: 201,
          message: "Product added successfully!",
          data: formatProductWithImages(plugProduct),
        };
      });

      if (transactionResult.error) {
        res.status(transactionResult.status).json({
          error: transactionResult.error,
        });
        return;
      }

      res.status(transactionResult.status).json({
        message: transactionResult.message,
        data: transactionResult.data,
      });
    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ error: "Internal server error!" });
    }
  },

  // Get all plug products
  getPlugProducts: async (req: AuthRequest, res: Response) => {
    try {
      const plug = req.plug!;
      const products = await prisma.plugProduct.findMany({
        where: { plugId: plug.id },
        orderBy: { createdAt: "desc" },
      });

      const formattedProducts = products.map(formatProductWithImages);

      res.status(200).json({
        message: "Products fetched successfully!",
        data: formattedProducts,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Internal server error!" });
    }
  },

  // Update a plug product
  updatePlugProduct: [
    upload.array("images", 10),
    async (req: AuthRequest, res: Response) => {
      let newImageUrls: string[] = [];
      let imagesToDelete: string[] = [];

      try {
        const productId = req.params.productId;
        const plug = req.plug!;

        const existingProduct = await prisma.plugProduct.findFirst({
          where: { id: productId, plugId: plug.id },
        });

        if (!existingProduct) {
           res.status(404).json({ error: "Product not found!" });
           return;
        }

        let productData;
        try {
          productData = JSON.parse(req.body.productData);
        } catch (error) {
           res
            .status(400)
            .json({ error: "Invalid product data format!" });
            return;
        }

        const validatedData = plugProductSchema.safeParse({
          name: productData.name,
          description: productData.description,
          price: parseFloat(productData.price),
          category: productData.category,
        });

        if (!validatedData.success) {
           res.status(400).json({ error: "Validation failed!" });
           return
        }

        const existingImages = existingProduct.images
          ? JSON.parse(existingProduct.images)
          : [];

        // Handle image uploads
        const files = req.files as Express.Multer.File[];
        if (files?.length) {
          newImageUrls = await uploadToMinio(files);
        }

        // Handle image deletions
        if (req.body.removeImages) {
          const indices = JSON.parse(req.body.removeImages);
          imagesToDelete = indices
            .filter((i: number) => i >= 0 && i < existingImages.length)
            .map((i: number) => existingImages[i]);
        }

        const updatedImages = [
          ...existingImages.filter((url: string) => !imagesToDelete.includes(url)),
          ...newImageUrls,
        ];

        const updatedProduct = await prisma.$transaction(async (tx) => {
          const updated = await tx.plugProduct.update({
            where: { id: productId },
            data: {
              ...validatedData.data,
              images: JSON.stringify(updatedImages),
              updatedAt: new Date(),
            },
          });
          return updated;
        });

        if (imagesToDelete.length > 0) {
          await deleteFromMinio(imagesToDelete);
        }

        res.status(200).json({
          message: "Product updated successfully!",
          data: formatProductWithImages(updatedProduct),
        });
      } catch (error) {
        if (newImageUrls.length > 0) {
          await deleteFromMinio(newImageUrls);
        }
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Internal server error!" });
      }
    },
  ],

  

  // Remove product from plug's inventory - cleaner implementation
  removePlugProduct: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId;
      const plug = req.plug!;

      // Use transaction to handle both database and file operations
      const result = await prisma.$transaction(async (tx) => {
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
            (img: any) => !originalImages.includes(img)
          );
        }

        // Delete the product from database
       const remainingProducts = await tx.plugProduct.delete({
          where: { id: productId },
        });

        return {imagesToDelete, remainingProducts};
      });

      // Handle case where product wasn't found
      if (result?.imagesToDelete === null) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // Delete any custom images after successful transaction
      if (result?.imagesToDelete && result?.imagesToDelete.length > 0) {
        await deleteFromMinio(result?.imagesToDelete);
      }

      const data = result?.remainingProducts &&  formatProductWithImages(result?.remainingProducts);
      res.status(200).json({
        message: "Product removed successfully!",
        data
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
          return existingImages.filter(
            (img: any) => !originalImages.includes(img)
          );
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
          deleteResult,
          customImages,
        };
      });

      // Delete images after successful transaction
      if (result.customImages && result.customImages.length > 0) {
        await deleteFromMinio(result.customImages);
     }

        res.status(result.status).json({
        message: result.message,
        data: []
      }); // ---->
      return;
    } catch (error) {
      console.error("Error removing all plug products:", error);
      res.status(500).json({ error: "Internal server error!" }); // ---->
      return;
    }
  },
};
