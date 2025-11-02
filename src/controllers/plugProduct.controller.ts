import { NextFunction, Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { formatPlugProduct } from "../helper/formatData";
import { DEFAULT_CATEGORY_RATING } from "./discover.controller";
// import { scheduleProductUpdate } from "../helper/workers/priceUpdater";

export const plugProductController = {
  // Add products to plug's inventory
  addProductsToPlug: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const products = req.body; // --------------> ADD COMMISSION AS AT TIME OF ADDING PRODUCTS
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
        return;
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

      await prisma.$transaction(async (tx) => {
        // Prepare products
        const productsToCreate = products.map((product) => ({
          originalId: product.id,
          plugId: plug.id,
          price: parseFloat(product.price), // Ensure price is stored as a number
          commission: product.commissionRate,
        }));

        // Create all product at once
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
      });

    

      res.status(201).json({
        message: `Added products to your store!`,
      });
    } catch (error) {
      next(error);
    }
  },


addProductToPlug: async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, price, commissionRate } = req.body;
    const plug = req.plug!;

    if (!id || !price || !commissionRate) {
      res.status(400).json({ error: "Please provide required fields!" });
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ error: "Provide a valid product price!" });
      return;
    }

    // Fetch supplier product
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, price: true, category: true },
    });

    if (!product) {
      res.status(404).json({ error: "Product not found!" });
      return;
    }

    // Validation: don’t allow plugging below supplier’s price
    if (parsedPrice < product.price) {
      res.status(400).json({
        error: "Price cannot be below supplier price!",
        supplierPrice: product.price,
        proposedPrice: parsedPrice,
      });
      return;
    }

    const PLUG_CATEGORY_DELTA = 0.08;
    const DEFAULT_CATEGORY_RATING = 1;
    const now = new Date();

    // === Transactional operation
    const created = await prisma.$transaction(async (tx) => {
      // 1️⃣ Upsert plug product (update if exists, else create)
      const plugProduct = await tx.plugProduct.upsert({
        where: {
          plugId_originalId: {
            plugId: plug.id,
            originalId: product.id,
          },
        },
        update: {
          price: parsedPrice,
          commission: commissionRate,
          updatedAt: now,
        },
        create: {
          originalId: product.id,
          plugId: plug.id,
          price: parsedPrice,
          commission: commissionRate,
        },
      });

      // 2️⃣ Increment original product's plug count only if it was newly created
      if (!plugProduct.createdAt || plugProduct.createdAt.getTime() === plugProduct.updatedAt.getTime()) {
        await tx.product.update({
          where: { id: product.id },
          data: { plugsCount: { increment: 1 } },
        });
      }

      // 3️⃣ Remove from accepted list (if exists)
      await tx.acceptedProduct.deleteMany({
        where: { plugId: plug.id, productId: product.id },
      });

      // 4️⃣ Upsert plug category rating
      await tx.plugCategoryRating.upsert({
        where: {
          plugId_category: {
            plugId: plug.id,
            category: product.category,
          },
        },
        update: {
          rating: { increment: PLUG_CATEGORY_DELTA },
        },
        create: {
          plugId: plug.id,
          category: product.category,
          rating: DEFAULT_CATEGORY_RATING + PLUG_CATEGORY_DELTA,
        },
      });

      return plugProduct;
    });

    res.status(201).json({
      message: "Product added successfully!",
      id: created.id,
    });
  } catch (error) {
    next(error);
  }
},

  // Get all plug products with complete details including reviews
  getPlugProducts: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const plug = req.plug!;
      const plugProducts = await prisma.plugProduct.findMany({
        where: { plugId: plug.id },
        include: {
          originalProduct: {
            include: {
              variations: true,
              reviews: {
                where: {
                  plugId: plug.id, // Only get current plug's review
                },
                select: {
                  rating: true,
                  review: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Filter out outdated ones (supplier updated price after plug last updated AND has been approved)
      const filteredProducts = plugProducts.filter(
        (pp) =>
          pp.originalProduct.priceUpdatedAt <= pp.updatedAt // if approved, must be up-to-date
      );

      const formattedProducts = filteredProducts.map((product) =>
        formatPlugProduct(product)
      );

      res.status(200).json({
        message: "Products fetched successfully!",
        data: formattedProducts,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update plug product price with deferred price update after 3 days
  updatePlugProductPrice: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const productId = req.params.productId;
      const plug = req.plug!;
      const { price, commissionRate } = req.body;

      // Find the product
      const existingProduct = await prisma.plugProduct.findFirst({
        where: {
          id: productId,
          plugId: plug.id,
        },
        include: {
          originalProduct: {
            select: {
              price: true,
            },
          }, // Include the original product to access its price
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

      const updatedProduct = await prisma.plugProduct.update({
        where: { id: productId, plugId: plug.id },
        data: {
          commission: commissionRate,
          price,
          updatedAt: new Date(),
        },
      });

      // Format response
      const formattedProduct = formatPlugProduct(updatedProduct);
      res.status(200).json({
        message: "Price updated successfully!",
        data: formattedProduct,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get outdated plug products (supplier updated price but plug has not)
  getOutdatedPlugProducts: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const plug = req.plug!;

      const plugProducts = await prisma.plugProduct.findMany({
        where: {
          plugId: plug.id,
        },
        include: {
          originalProduct: {
            include: {
              variations: true,
              reviews: {
                where: { plugId: plug.id },
                select: { rating: true, review: true, createdAt: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Only keep outdated ones
      const outdatedProducts = plugProducts.filter(
        (pp) => pp.originalProduct.priceUpdatedAt > pp.updatedAt
      );

      const formattedProducts = outdatedProducts.map((product) =>
        formatPlugProduct(product)
      );

      res.status(200).json({
        message: "Outdated products fetched successfully!",
        data: formattedProducts,
      });
    } catch (error) {
      next(error);
    }
  },

  // Remove product from plug's inventory
  removePlugProduct: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
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
            originalProduct: true,
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
      const data = result && formatPlugProduct(result);

      res.status(200).json({
        message: "Product removed successfully!",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
  // Get product by ID with complete details
  getPlugProductById: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
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
      const formattedProduct = formatPlugProduct(plugProduct);
      res.status(200).json({
        message: "Product fetched successfully!",
        data: formattedProduct,
      });
    } catch (error) {
      next(error);
    }
  },

  //REVIEWS
  // Review a product
  reviewProduct: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const plug = req.plug!;
      const { productId, rating, review } = req.body;
      // Validation
      if (!productId) {
        res.status(400).json({ error: "Product ID is required!" });
        return;
      }
      if (!rating || !review) {
        res.status(400).json({ error: "Review and rating are required!" });
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

      // Create new review
      const newReview = await prisma.review.create({
        data: {
          productId: productId,
          plugId: plug.id,
          rating: rating,
          review: review,
        },
        include: {
          plug: {
            select: {
              businessName: true,
            },
          },
        },
      });
      res.status(201).json({
        message: "Review created successfully!",
        data: newReview,
      });
    } catch (error) {
      next(error);
    }
  },
  // Delete a product review
  deleteReview: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const plug = req.plug!;
      const { productId } = req.params;
      const review = await prisma.review.findUnique({
        where: {
          productId_plugId: {
            productId: productId,
            plugId: plug.id,
          },
        },
      });

      if (!review) {
        res.status(404).json({ error: "Review not found!" });
        return;
      }
      await prisma.review.delete({
        where: {
          productId_plugId: {
            productId: productId,
            plugId: plug.id,
          },
        },
      });
      res.status(200).json({
        message: "Review deleted successfully!",
      });
    } catch (error) {
      next(error);
    }
  },
};

