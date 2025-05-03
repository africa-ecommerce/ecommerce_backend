
import { Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { plugProductSchema } from "../lib/zod/schema";
import { PlugProduct } from "@prisma/client";
import { formatPlugProductWithDetails } from "../helper/formatProduct";
import { scheduleProductUpdate } from "../helper/workers/priceUpdater";




export const plugProductController = {
  // Add one or more customized supplier products to plug's inventory
  // addProductsToPlug: async (req: AuthRequest, res: Response) => {
  //   try {
  //     const { products } = req.body; // Array of objects with productId and price from frontend
  //     const plug = req.plug!;

  //     // Basic validation
  //     if (!Array.isArray(products) || products.length === 0) {
  //       res.status(400).json({
  //         error: "Please provide a list of products!",
  //       });
  //       return;
  //     }

  //     // Get unique product IDs to avoid duplicating increments
  //     const uniqueProductIds = [...new Set(products.map((p) => p.id))];

  //     // Prepare products by mapping each product object to create a plug product entry
  //     const productsToCreate = products.map((product) => ({
  //       originalId: product.id, // Use the ID from the frontend
  //       price: product.price, // Use the price from the frontend
  //       plugId: plug.id, // add the plug ID
  //     }));

  //     // Create the products in the database, increment counters, and get complete details
  //     const result = await prisma.$transaction(async (tx) => {
  //       // First check which products already exist to avoid double counting
  //       const existingConnections = await tx.plugProduct.findMany({
  //         where: {
  //           plugId: plug.id,
  //           originalId: { in: uniqueProductIds },
  //         },
  //         select: { originalId: true },
  //       });

  //       const existingProductIds = existingConnections.map((c) => c.originalId);

  //       // Find products that need to be incremented (only new connections)
  //       const productsToIncrement = uniqueProductIds.filter(
  //         (id) => !existingProductIds.includes(id)
  //       );

  //       // Create all product connections at once
  //       await tx.plugProduct.createMany({
  //         data: productsToCreate,
  //         skipDuplicates: true, // Skip if the plugId + originalId combination already exists
  //       });

  //       // Increment the plugsCount for each product being newly connected
  //       if (productsToIncrement.length > 0) {
  //         await tx.product.updateMany({
  //           where: {
  //             id: { in: productsToIncrement },
  //           },
  //           data: {
  //             plugsCount: { increment: 1 },
  //           },
  //         });
  //       }

  //       // Return the latest products for this plug
  //       const createdPlugProducts = await tx.plugProduct.findMany({
  //         where: {
  //           plugId: plug.id,
  //           originalId: { in: products.map((p) => p.id) },
  //         },
  //         orderBy: { createdAt: "desc" },
  //       });

  //       // Format each product with complete details
  //       const formattedProducts = await Promise.all(
  //         createdPlugProducts.map((product) =>
  //           formatPlugProductWithDetails(product, tx)
  //         )
  //       );

  //       return formattedProducts;
  //     });

  //     res.status(201).json({
  //       message: `Added ${result.length} products to your store!`,
  //       data: result,
  //     });
  //     return;
  //   } catch (error) {
  //     console.error("Error adding products:", error);
  //     res.status(500).json({ error: "Internal server error!" });
  //     return;
  //   }
  // },

//   addProductsToPlug: async (req: AuthRequest, res: Response) => {
//   try {
//     const  products  = req.body; // Array of objects with productId and price from frontend
//     const plug = req.plug!;

//     // Basic validation
//     if (!Array.isArray(products) || products.length === 0) {
//       res.status(400).json({
//         error: "Please provide a list of products!",
//       });
//       return;
//     }

//     // Get unique product IDs to avoid duplicating increments
//     // const uniqueProductIds = [...new Set(products.map((p) => p.id))];

//     // Create the products in the database, increment counters, and get complete details
//     const result = await prisma.$transaction(async (tx) => {
//       // Check which products already exist to avoid double counting
//       // const existingConnections = await tx.plugProduct.findMany({
//       //   where: {
//       //     plugId: plug.id,
//       //     originalId: { in: uniqueProductIds },
//       //   },
//       //   select: { originalId: true },
//       // });

//       // const existingProductIds = existingConnections.map((c) => c.originalId);

//       // // Find products that need to be incremented (only new connections)
//       // const productsToIncrement = uniqueProductIds.filter(
//       //   (id) => !existingProductIds.includes(id)
//       // );
      
//       // // Only fetch minimal product details needed for creation
//       // // We don't need to fetch full product details with variations here
//       // const productNamesMap = productsToIncrement.length > 0 
//       //   ? await tx.product.findMany({
//       //       where: {
//       //         id: { in: uniqueProductIds },
//       //       },
//       //       select: {
//       //         id: true,
//       //         name: true,
//       //       },
//       //     }).then(products => 
//       //       new Map(products.map(p => [p.id, p.name]))
//       //     )
//       //   : new Map();

//       // Prepare products by mapping each product object to create a plug product entry
//       const productsToCreate = products.map((product) => ({
//         originalId: product.id,
//         plugId: plug.id,
//         // name: productNamesMap.get(product.id) || "Unknown Product",
//         price: product.price,
//       }));

//       // Create all product connections at once
//       await tx.plugProduct.createMany({
//         data: productsToCreate,
//         skipDuplicates: true, // Skip if the plugId + originalId combination already exists
//       });

//       // Increment the plugsCount for each product being newly connected
//       // if (productsToIncrement.length > 0) {
//         await tx.product.updateMany({
//           where: {
//             id: { in: productsToCreate. },
//           },
//           data: {
//             plugsCount: { increment: 1 },
//           },
//         });
//       // }

//       // Return the latest products for this plug
//       const createdPlugProducts = await tx.plugProduct.findMany({
//         where: {
//           plugId: plug.id,
//           originalId: { in: products.map((p) => p.id) },
//         },
//         orderBy: { createdAt: "desc" },
//       });

//       // Format each product with complete details
//       // We rely on formatPlugProductWithDetails to fetch full product details
//       const formattedProducts = await Promise.all(
//         createdPlugProducts.map((product) =>
//           formatPlugProductWithDetails(product, tx)
//         )
//       );

//       return formattedProducts;
//     });

//     res.status(201).json({
//       message: `Added ${result.length} products to your store!`,
//       data: result,
//     });
//     return;
//   } catch (error) {
//     console.error("Error adding products:", error);
//     res.status(500).json({ error: "Internal server error!" });
//     return;
//   }
// },

//  addProductsToPlug: async (req: AuthRequest, res: Response) => {
//   try {
//     const products = req.body;
//     const plug = req.plug!;

//     // Basic validation
//     if (!Array.isArray(products) || products.length === 0) {
//       return res.status(400).json({
//         error: "Please provide a list of products!",
//       });
//     }

//     // Get unique product IDs
//     const uniqueProductIds = [...new Set(products.map((p) => p.id))];

//     const result = await prisma.$transaction(async (tx) => {
//       // Get existing products in one query
//       const existingConnections = await tx.plugProduct.findMany({
//         where: {
//           plugId: plug.id,
//           originalId: { in: uniqueProductIds },
//         },
//         select: { originalId: true },
//       });
      
//       const existingProductIds = existingConnections.map(c => c.originalId);
      
//       // Filter out products that already exist
//       const newProductIds = uniqueProductIds.filter(id => !existingProductIds.includes(id));
      
//       // If no new products, just return existing ones
//       if (newProductIds.length === 0) {
//         const existingPlugProducts = await tx.plugProduct.findMany({
//           where: {
//             plugId: plug.id,
//             originalId: { in: uniqueProductIds },
//           },
//           orderBy: { createdAt: "desc" },
//         });
        
//         const formattedProducts = await Promise.all(
//           existingPlugProducts.map((product) =>
//             formatPlugProductWithDetails(product, tx)
//           )
//         );
        
//         return formattedProducts;
//       }
      
//       // // Fetch product names only for new products
//       // const productDetails = await tx.product.findMany({
//       //   where: {
//       //     id: { in: newProductIds },
//       //   },
//       //   select: {
//       //     id: true,
//       //     name: true,
//       //   },
//       // });
      
//       // const productNamesMap = new Map(productDetails.map(p => [p.id, p.name]));

//       // Prepare only new products to create
//       const productsToCreate = products
//         .filter(product => newProductIds.includes(product.id))
//         .map((product) => ({
//           originalId: product.id,
//           plugId: plug.id,
//           // name: productNamesMap.get(product.id) || "Unknown Product",
//           price: product.price,
//         }));

//       // Only create connections for new products
//       if (productsToCreate.length > 0) {
//         await tx.plugProduct.createMany({
//           data: productsToCreate,
//         });
        
//         // Increment plugsCount for new products only
//         await tx.product.updateMany({
//           where: {
//             id: { in: newProductIds },
//           },
//           data: {
//             plugsCount: { increment: 1 },
//           },
//         });
//       }

//       // Return all products for this plug (new and existing)
//       const updatedPlugProducts = await tx.plugProduct.findMany({
//         where: {
//           plugId: plug.id,
//           originalId: { in: uniqueProductIds },
//         },
//         orderBy: { createdAt: "desc" },
//       });

//       const formattedProducts = await Promise.all(
//         updatedPlugProducts.map((product) =>
//           formatPlugProductWithDetails(product, tx)
//         )
//       );

//       return formattedProducts;
//     });

//     return res.status(201).json({
//       message: `Added ${result.length} products to your store!`,
//       data: result,
//     });
//   } catch (error) {
//     console.error("Error adding products:", error);
//     return res.status(500).json({ error: "Internal server error!" });
//   }
// },


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
    }

    // Validate prices before starting the transaction
    const invalidProducts = products.filter(
      (product) =>
        isNaN(parseFloat(product.price)) || parseFloat(product.price) < 0
    );

    if (invalidProducts.length > 0) {
       res.status(400).json({
        error: "Some products have invalid prices!"
      });
      return;
    }

    // Get unique product IDs
    const uniqueProductIds = [...new Set(products.map((p) => p.id))];

    const result = await prisma.$transaction(async (tx) => {
      // Prepare products
      const productsToCreate = products.map((product) => ({
        originalId: product.id,
        plugId: plug.id,
        price: product.price,
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
      const formattedProducts = 
        plugProducts.map((product) => formatPlugProductWithDetails(product))
      

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
      const  price  = req.body;

      // Find the product
      const now = Date.now();
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


     


      // Schedule this specific product's update
      await scheduleProductUpdate(productId, priceEffectiveAt);

      // Format response
      const formattedProduct =  formatPlugProductWithDetails(
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

      const data = result &&  formatPlugProductWithDetails(result);

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
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // Format the product with complete details
      const formattedProduct =  formatPlugProductWithDetails(plugProduct);

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