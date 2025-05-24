import { Response } from "express";
import { invalidateProductCache, prisma } from "../config";
import { AuthRequest } from "../types";
import { formatPlugProductWithDetails } from "../helper/formatProduct";
import { scheduleProductUpdate } from "../helper/workers/priceUpdater";




export const plugProductController = {
  // Add products to plug's inventory
  addProductsToPlug: async (req: AuthRequest, res: Response) => {
    try {
      const products = req.body;
      const plug = req.plug!;

      // Basic validation
      if (!Array.isArray(products) || products.length === 0) {
        res.status(400).json({
          error: "Please provide a list of products!",
        });
        return;
      }

      if (products.length > 20) {
        res.status(400).json({
          error: "Please provide 20 products max at once!",
        });
        return; // Added missing return statement
      }

      // Validate prices before starting the transaction
      const invalidProducts = products.filter(
        (product) =>
          isNaN(parseFloat(product.price)) || parseFloat(product.price) < 0
      );

      if (invalidProducts.length > 0) {
        res.status(400).json({
          error: "Provide products with valid prices!",
        });
        return;
      }

      // Get unique product IDs
      const uniqueProductIds = [...new Set(products.map((p) => p.id))];

      // Fetch the original supplier products to check prices against
      const originalProducts = await prisma.product.findMany({
        where: {
          id: { in: uniqueProductIds },
        },
      });

      // Create a map of product IDs to their supplier prices for easy lookup
      const productPriceMap = new Map();
      originalProducts.forEach((product) => {
        productPriceMap.set(product.id, product.price);
      });

      // Check if any product price is less than the supplier price
      const belowSupplierPriceProducts = products.filter((product) => {
        const supplierPrice = productPriceMap.get(product.id);
        return supplierPrice && parseFloat(product.price) < supplierPrice;
      });

      if (belowSupplierPriceProducts.length > 0) {
        // Return the products with prices below supplier prices
        const belowPriceDetails = belowSupplierPriceProducts.map((product) => ({
          id: product.id,
          proposedPrice: parseFloat(product.price),
          supplierPrice: productPriceMap.get(product.id),
        }));

        res.status(400).json({
          error: "Ensure prices are not below supplier prices!",
          invalidProducts: belowPriceDetails,
        });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        // Prepare products
        const productsToCreate = products.map((product) => ({
          originalId: product.id,
          plugId: plug.id,
          price: parseFloat(product.price), // Ensure price is stored as a number
        }));

        // Create all product connections at once
        const createResult = await tx.plugProduct.createMany({
          data: productsToCreate,
          skipDuplicates: true,
        });

        // Only increment plugsCount if products were actually created
        if (createResult.count > 0) {
          await tx.product.updateMany({
            where: {
              id: { in: uniqueProductIds },
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
            originalId: { in: uniqueProductIds },
          },
          include: {
            originalProduct: {
              include: {
                variations: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        // Format each product with complete details
        const formattedProducts = createdPlugProducts.map((product) =>
          formatPlugProductWithDetails(product)
        );

        return formattedProducts;
      });

      // Invalidate cache after adding products
      invalidateProductCache();
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
        include: {
          originalProduct: {
            include: {
              variations: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Format each product with complete details
      const formattedProducts = plugProducts.map((product) =>
        formatPlugProductWithDetails(product)
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

  // Update plug product price with deferred price update after 3 days
  updatePlugProductPrice: async (req: AuthRequest, res: Response) => {
    try {
      const productId = req.params.productId;
      const plug = req.plug!;
      const { price } = req.body;

      // Find the product
      const existingProduct = await prisma.plugProduct.findFirst({
        where: {
          id: productId,
          plugId: plug.id,
        },
        include: {
          originalProduct: true, // Include the original product to access its price
        },
      });

      if (!existingProduct) {
        res
          .status(404)
          .json({ error: "Product has been discontinued by supplier!" });
        return;
      }

      // Validation
      if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        res.status(400).json({ error: "Price is invalid!" });
        return;
      }

      // Check if the new price is less than the original supplier price
      const newPrice = parseFloat(price);
      const supplierPrice = existingProduct.originalProduct.price;

      if (newPrice < supplierPrice) {
        res.status(400).json({
          error: "Price cannot be less than supplier price!",
          supplierPrice: supplierPrice,
        });
        return;
      }

      // Calculate effective date (3 days from now)
      const priceEffectiveAt = new Date();
      priceEffectiveAt.setDate(priceEffectiveAt.getDate() + 3);

      // Update with pending price and effective date
      const updatedProduct = await prisma.plugProduct.update({
        where: { id: productId, plugId: plug.id },
        data: {
          pendingPrice: parseFloat(price),
          priceEffectiveAt,
          updatedAt: new Date(),
        },
        include: {
          originalProduct: {
            include: {
              variations: true,
            },
          },
        },
      });

      // Schedule this specific product's update - this will start the scheduler
      // or adjust it based on the new timing
      await scheduleProductUpdate(productId, priceEffectiveAt);

      // Format response
      const formattedProduct = formatPlugProductWithDetails(updatedProduct);

      res.status(200).json({
        message: "Price update to be effected in 3 days!",
        data: formattedProduct,
      });
    } catch (error) {
      console.error("Error updating product price:", error);
      res.status(500).json({ error: "Internal server error!" });
    }
  },
  reviewProduct: async (req: AuthRequest, res: Response) => {
    try {
      const plug = req.plug!;
      const { productId, rating, review } = req.body;

      // Validation
      if (!productId || !rating) {
        res.status(400).json({ error: "Product ID and rating are required!" });
        return;
      }

      if (rating < 1 || rating > 5) {
        res.status(400).json({ error: "Rating must be between 1 and 5!" });
        return;
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // // Check if plug has already reviewed this product
      // const existingReview = await prisma.review.findUnique({
      //   where: {
      //     productId_plugId: {
      //       productId: productId,
      //       plugId: plug.id,
      //     },
      //   },
      // });

      // if (existingReview) {
      //   // Update existing review
      //   const updatedReview = await prisma.review.update({
      //     where: {
      //       productId_plugId: {
      //         productId: productId,
      //         plugId: plug.id,
      //       },
      //     },
      //     data: {
      //       rating: rating,
      //       review: review || null,
      //     },
      //     include: {
      //       plug: {
      //         select: {
      //           businessName: true,
      //           id: true,
      //         },
      //       },
      //     },
      //   });

      //   res.status(200).json({
      //     message: "Review updated successfully!",
      //     data: updatedReview,
      //   });
      //   return;
      // }

      // Create new review
      const newReview = await prisma.review.create({
        data: {
          productId: productId,
          plugId: plug.id,
          rating: rating,
          review: review || null,
        },
        include: {
          plug: {
            select: {
              businessName: true,
              id: true,
            },
          },
        },
      });

      res.status(201).json({
        message: "Review created successfully!",
        data: newReview,
      });
      return;
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },

  deleteReview: async (req: AuthRequest, res: Response) => {
    try {
      const plug = req.plug!;
      const { productId } = req.params;
  
      const review = await prisma.review.findUnique({
        where: {
          productId_plugId: {
            productId: productId,
            plugId: plug.id
          }
        }
      });
  
      if (!review) {
        res.status(404).json({ error: "Review not found!" });
        return;
      }
  
      await prisma.review.delete({
        where: {
          productId_plugId: {
            productId: productId,
            plugId: plug.id
          }
        }
      });
  
      res.status(200).json({
        message: "Review deleted successfully!"
      });
      return;
  
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Internal server error!" });
      return;
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
        res
          .status(404)
          .json({ error: "Product has been discontinued by supplier!" });
        return;
      }

      // Use transaction to ensure both operations complete or fail together
      const result = await prisma.$transaction(async (tx) => {
        // Delete the product from plug's inventory
        const deletedProduct = await tx.plugProduct.delete({
          where: { id: productId },
          include: {
            originalProduct: {
              include: {
                variations: true,
              },
            },
          },
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

      // Format the deleted product with complete details
      const data = result && formatPlugProductWithDetails(result);

      // Invalidate cache after removing product
      invalidateProductCache();
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
        include: {
          originalProduct: {
            include: {
              variations: true,
            },
          },
        },
      });

      if (!plugProduct) {
        res
          .status(404)
          .json({ error: "Product has been discontinued by supplier!" });
        return;
      }

      // Format the product with complete details
      const formattedProduct = formatPlugProductWithDetails(plugProduct);

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
          message: "All products removed successfully!",
          data: [],
        });
        return;
      }

      // Invalidate cache after removing all products
      invalidateProductCache();
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


