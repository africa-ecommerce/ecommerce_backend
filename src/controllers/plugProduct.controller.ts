
import { Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { plugProductSchema } from "../lib/zod/schema";
import { PlugProduct } from "@prisma/client";
import { formatPlugProductWithDetails } from "../helper/formatProduct";




export const plugProductController = {
  // Add one or more customized supplier products to plug's inventory
  addProductsToPlug: async (req: AuthRequest, res: Response) => {
    try {
      const { products } = req.body; // Array of objects with productId and price from frontend
      const plug = req.plug!;

      // Basic validation
      if (!Array.isArray(products) || products.length === 0) {
        res.status(400).json({
          error: "Please provide a list of products!",
        });
        return;
      }

      // Get unique product IDs to avoid duplicating increments
      const uniqueProductIds = [...new Set(products.map((p) => p.id))];

      // Prepare products by mapping each product object to create a plug product entry
      const productsToCreate = products.map((product) => ({
        originalId: product.id, // Use the ID from the frontend
        price: product.price, // Use the price from the frontend
        plugId: plug.id, // add the plug ID
      }));

      // Create the products in the database, increment counters, and get complete details
      const result = await prisma.$transaction(async (tx) => {
        // First check which products already exist to avoid double counting
        const existingConnections = await tx.plugProduct.findMany({
          where: {
            plugId: plug.id,
            originalId: { in: uniqueProductIds },
          },
          select: { originalId: true },
        });

        const existingProductIds = existingConnections.map((c) => c.originalId);

        // Find products that need to be incremented (only new connections)
        const productsToIncrement = uniqueProductIds.filter(
          (id) => !existingProductIds.includes(id)
        );

        // Create all product connections at once
        await tx.plugProduct.createMany({
          data: productsToCreate,
          skipDuplicates: true, // Skip if the plugId + originalId combination already exists
        });

        // Increment the plugsCount for each product being newly connected
        if (productsToIncrement.length > 0) {
          await tx.product.updateMany({
            where: {
              id: { in: productsToIncrement },
            },
            data: {
              plugsCount: { increment: 1 },
            },
          });
        }

        // Return the latest products for this plug
        const createdPlugProducts = await tx.plugProduct.findMany({
          where: {
            plugId: plug.id,
            originalId: { in: products.map((p) => p.id) },
          },
          orderBy: { createdAt: "desc" },
        });

        // Format each product with complete details
        const formattedProducts = await Promise.all(
          createdPlugProducts.map((product) =>
            formatPlugProductWithDetails(product, tx)
          )
        );

        return formattedProducts;
      });

      res.status(201).json({
        message: `Added ${result.length} products to your store!`,
        data: result,
      });
      return;
    } catch (error) {
      console.error("Error adding products:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },
  // Get all plug products with complete details
  getPlugProducts: async (req: AuthRequest, res: Response) => {
    try {
      const plug = req.plug!;
      const plugProducts = await prisma.plugProduct.findMany({
        where: { plugId: plug.id },
        orderBy: { createdAt: "desc" },
      });

      // Format each product with complete details
      const formattedProducts = await Promise.all(
        plugProducts.map((product) => formatPlugProductWithDetails(product))
      );

      res.status(200).json({
        message: "Products fetched successfully!",
        data: formattedProducts,
      });
      return;
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },

  // Update plug product price or description
  updatePlugProductPrice: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId;
      const plug = req.plug!;
      const { price } = req.body;

      // Find the product
      const existingProduct = await prisma.plugProduct.findFirst({
        where: { id: productId, plugId: plug.id },
      });

      if (!existingProduct) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // Validation
      if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        res.status(400).json({ error: "Price is invalid!" });
        return;
      }

      // Calculate effective date (3 days from now)
      const priceEffectiveAt = new Date();
      priceEffectiveAt.setDate(priceEffectiveAt.getDate() + 3);

      // Update with pending price and effective date
      const updatedProduct = await prisma.plugProduct.update({
        where: { id: productId },
        data: {
          pendingPrice: parseFloat(price),
          priceEffectiveAt,
          updatedAt: new Date(),
        },
      });

      // Format response
      const formattedProduct = await formatPlugProductWithDetails(
        updatedProduct
      );

      res.status(200).json({
        message: "Price update scheduled. It will take effect in 3 days!",
        data: formattedProduct,
      });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Internal server error!" });
    }
  },

  // Remove product from plug's inventory
  removePlugProduct: async (req: AuthRequest, res: Response) => {
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
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // Use transaction to ensure both operations complete or fail together
      const result = await prisma.$transaction(async (tx) => {
        // Delete the product from plug's inventory
        const deletedProduct = await tx.plugProduct.delete({
          where: { id: productId },
        });

        // Decrement the count on the original product
        await tx.product.update({
          where: { id: deletedProduct.originalId },
          data: {
            plugsCount: {
              decrement: 1,
            },
          },
        });

        return deletedProduct;
      });

      const data = result && (await formatPlugProductWithDetails(result));

      res.status(200).json({
        message: "Product removed successfully!",
        data,
      });
      return;
    } catch (error) {
      console.error("Error removing plug product:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },
  // Get product by ID with complete details
  getPlugProductById: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId;
      const plug = req.plug!;

      // Get the plug product
      const plugProduct = await prisma.plugProduct.findFirst({
        where: {
          id: productId,
          plugId: plug.id,
        },
      });

      if (!plugProduct) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // Format the product with complete details
      const formattedProduct = await formatPlugProductWithDetails(plugProduct);

      res.status(200).json({
        message: "Product fetched successfully!",
        data: formattedProduct,
      });
      return;
    } catch (error) {
      console.error("Error fetching plug product:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },

  // Remove all products from plug's inventory
  removeAllPlugProducts: async (req: AuthRequest, res: Response) => {
    try {
      const plug = req.plug!;

      // Get the list of products to update counters before deleting
      const plugProducts = await prisma.plugProduct.findMany({
        where: { plugId: plug.id },
        select: { originalId: true },
      });

      // Get unique product IDs to update counters
      const uniqueProductIds = [
        ...new Set(plugProducts.map((p) => p.originalId)),
      ];

      // Use transaction to ensure data consistency
      const deleteResult = await prisma.$transaction(async (tx) => {
        // Decrement counts for all affected products
        if (uniqueProductIds.length > 0) {
          await tx.product.updateMany({
            where: { id: { in: uniqueProductIds } },
            data: { plugsCount: { decrement: 1 } },
          });
        }

        // Delete all products belonging to this plug
        return await tx.plugProduct.deleteMany({
          where: { plugId: plug.id },
        });
      });

      if (deleteResult.count === 0) {
        res.status(200).json({
          message: "No products to remove!",
          data: [],
        });
        return;
      }

      res.status(200).json({
        message: `Successfully removed ${deleteResult.count} products!`,
        data: [],
      });
      return;
    } catch (error) {
      console.error("Error removing all plug products:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },
};