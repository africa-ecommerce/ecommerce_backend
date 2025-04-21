// import { Response } from "express";
// import { prisma } from "../config";
// import { AuthRequest } from "../types";
// import { plugProductSchema } from "../lib/zod/schema";
// import {
//   deleteFromMinio,
//   uploadToMinio,
// } from "../helper/minioObjectStore/productImage";
// import { PlugProduct } from "@prisma/client";

// // Helper function to format products with parsed images
// const formatProductWithImages = (product: PlugProduct) => {
//   return {
//     ...product,
//     images: product.images ? JSON.parse(product.images as string) : [],
//   };
// };

// export const plugProductController = {
//   // Add one or more customized supplier products to plug's inventory
//   // Only allows customizing price and description
//   addProductsToPlug: async (req: AuthRequest, res: Response) => {
//     try {
//       const { products } = req.body; // Array of product objects with modifications
//       const plug = req.plug!;
      
//       // Validate input
//       if (!Array.isArray(products) || products.length === 0) {
//         return res.status(400).json({ 
//           error: "Please provide an array of product objects" 
//         });
//       }

//       // Maximum number of products that can be added in one request
//       const MAX_PRODUCTS = 50;
//       if (products.length > MAX_PRODUCTS) {
//         return res.status(400).json({
//           error: `You can only add up to ${MAX_PRODUCTS} products at once`
//         });
//       }

//       const transactionResult = await prisma.$transaction(async (tx) => {
//         // Validate all products have originalId and fetch original products for validation
//         const originalIds = products.map(p => p.originalId);
        
//         if (originalIds.some(id => !id)) {
//           return { 
//             status: 400, 
//             error: "All product objects must include an originalId" 
//           };
//         }
        
//         // Fetch original products to verify they exist
//         const originalProducts = await tx.product.findMany({
//           where: { id: { in: originalIds } }
//         });
        
//         if (originalProducts.length !== originalIds.length) {
//           return { 
//             status: 404, 
//             error: "Some product IDs are invalid or products not found" 
//           };
//         }
        
//         // Create product validation map for reference
//         const originalProductMap = new Map(
//           originalProducts.map(p => [p.id, p])
//         );
        
//         // Validate each product with zod schema (optional but recommended)
//         const validatedProducts = [];
//         const invalidProducts = [];
        
//         for (const product of products) {
//           const originalProduct = originalProductMap.get(product.originalId);
          
//           if (!originalProduct) {
//             invalidProducts.push({
//               originalId: product.originalId,
//               errors: "Original product not found"
//             });
//             continue;
//           }
          
//           // Only allow customizing price and description
//           // Keep other fields from the original product
//           const productToValidate = {
//             name: originalProduct.name,
//             description: product.description || originalProduct.description,
//             price: parseFloat(String(product.price || originalProduct.price || 0)),
//             category: originalProduct.category,
//             images: originalProduct.images, // Keep original images
//             originalId: product.originalId,
//             plugId: plug.id
//           };
          
//           const validationResult = plugProductSchema.safeParse(productToValidate);
          
//           if (validationResult.success) {
//             validatedProducts.push(productToValidate);
//           } else {
//             invalidProducts.push({
//               originalId: product.originalId,
//               errors: validationResult.error.format()
//             });
//           }
//         }
        
//         if (validatedProducts.length === 0) {
//           return { 
//             status: 400, 
//             error: "All products failed validation", 
//             details: invalidProducts 
//           };
//         }
        
//         // Create each plug product individually to get the complete objects back
//         const createdProducts = await Promise.all(
//           validatedProducts.map(product => 
//             tx.plugProduct.create({
//               data: product
//             })
//           )
//         );

//         return {
//           status: 201,
//           message: `Added ${createdProducts.length} products to your inventory!`,
//           data: createdProducts.map(formatProductWithImages),
//           invalid: invalidProducts.length > 0 ? invalidProducts : undefined
//         };
//       });

//       if (transactionResult.error) {
//         return res.status(transactionResult.status).json({
//           error: transactionResult.error,
//           details: transactionResult.details
//         });
//       }

//       return res.status(transactionResult.status).json({
//         message: transactionResult.message,
//         data: transactionResult.data,
//         invalid: transactionResult.invalid
//       });
//     } catch (error) {
//       console.error("Error adding products:", error);
//       return res.status(500).json({ error: "Internal server error!" });
//     }
//   },

//   // Get all plug products
//   getPlugProducts: async (req: AuthRequest, res: Response) => {
//     try {
//       const plug = req.plug!;
//       const products = await prisma.plugProduct.findMany({
//         where: { plugId: plug.id },
//         orderBy: { createdAt: "desc" },
//       });

//       const formattedProducts = products.map(formatProductWithImages);

//       return res.status(200).json({
//         message: "Products fetched successfully!",
//         data: formattedProducts,
//       });
//     } catch (error) {
//       console.error("Error fetching products:", error);
//       return res.status(500).json({ error: "Internal server error!" });
//     }
//   },

//   // Update a plug product - only allow updating price and description
//   updatePlugProduct: async (req: AuthRequest, res: Response) => {
//     try {
//       const productId = req.params.productId;
//       const plug = req.plug!;

//       const existingProduct = await prisma.plugProduct.findFirst({
//         where: { id: productId, plugId: plug.id },
//       });

//       if (!existingProduct) {
//         return res.status(404).json({ error: "Product not found!" });
//       }

//       let productData;
//       try {
//         productData = typeof req.body.productData === 'string' 
//           ? JSON.parse(req.body.productData) 
//           : req.body;
//       } catch (error) {
//         return res.status(400).json({ error: "Invalid product data format!" });
//       }

//       // Only allow updating price and description
//       const updatedData = {
//         description: productData.description !== undefined 
//           ? productData.description 
//           : existingProduct.description,
//         price: productData.price !== undefined 
//           ? parseFloat(productData.price) 
//           : existingProduct.price
//       };

//       // Simple validation
//       if (typeof updatedData.description !== 'string') {
//         return res.status(400).json({ error: "Description must be a string" });
//       }
      
//       if (isNaN(updatedData.price) || updatedData.price < 0) {
//         return res.status(400).json({ error: "Price must be a valid number >= 0" });
//       }

//       const updatedProduct = await prisma.plugProduct.update({
//         where: { id: productId },
//         data: {
//           ...updatedData,
//           updatedAt: new Date(),
//         },
//       });

//       return res.status(200).json({
//         message: "Product updated successfully!",
//         data: formatProductWithImages(updatedProduct),
//       });
//     } catch (error) {
//       console.error("Error updating product:", error);
//       return res.status(500).json({ error: "Internal server error!" });
//     }
//   },

//   // Remove product from plug's inventory
//   removePlugProduct: async (req: AuthRequest, res: Response) => {
//     try {
//       const productId = req.params.productId;
//       const plug = req.plug!;

//       // Check if product exists and belongs to this plug
//       const existingProduct = await prisma.plugProduct.findFirst({
//         where: {
//           id: productId,
//           plugId: plug.id,
//         },
//       });

//       if (!existingProduct) {
//         return res.status(404).json({ error: "Product not found!" });
//       }

//       // Delete the product from database
//       await prisma.plugProduct.delete({
//         where: { id: productId },
//       });

//       return res.status(200).json({
//         message: "Product removed successfully!",
//       });
//     } catch (error) {
//       console.error("Error removing plug product:", error);
//       return res.status(500).json({ error: "Internal server error!" });
//     }
//   },

//   // Get product by ID
//   getPlugProductById: async (req: AuthRequest, res: Response) => {
//     try {
//       const productId = req.params.productId;
//       const plug = req.plug!;

//       // Get the product
//       const product = await prisma.plugProduct.findFirst({
//         where: {
//           id: productId,
//           plugId: plug.id,
//         },
//       });

//       if (!product) {
//         return res.status(404).json({ error: "Product not found!" });
//       }

//       return res.status(200).json({
//         message: "Product fetched successfully!",
//         data: formatProductWithImages(product),
//       });
//     } catch (error) {
//       console.error("Error fetching plug product:", error);
//       return res.status(500).json({ error: "Internal server error!" });
//     }
//   },

//   // Remove all products from plug's inventory
//   removeAllPlugProducts: async (req: AuthRequest, res: Response) => {
//     try {
//       const plug = req.plug!;

//       // Delete all products belonging to this plug
//       const deleteResult = await prisma.plugProduct.deleteMany({
//         where: { plugId: plug.id },
//       });

//       if (deleteResult.count === 0) {
//         return res.status(200).json({
//           message: "No products to remove!",
//           data: []
//         });
//       }

//       return res.status(200).json({
//         message: `Successfully removed ${deleteResult.count} products!`,
//         data: []
//       });
//     } catch (error) {
//       console.error("Error removing all plug products:", error);
//       return res.status(500).json({ error: "Internal server error!" });
//     }
//   },
// };






import { Response } from "express";
import { prisma } from "../config";
import { AuthRequest } from "../types";
import { plugProductSchema } from "../lib/zod/schema";
import {
  deleteFromMinio,
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
  // Add one or more customized supplier products to plug's inventory

  addProductsToPlug: async (req: AuthRequest, res: Response) => {
    try {
      const { products } = req.body; // Products data from frontend
      const plug = req.plug!;

      // Basic validation
      if (!Array.isArray(products) || products.length === 0) {
         res.status(400).json({
          error: "Please provide a list of products!",
        });
        return;
      }

      // Maximum number of products that can be added in one request
      const MAX_PRODUCTS = 50;
      if (products.length > MAX_PRODUCTS) {
         res.status(400).json({
          error: `You can only add up to ${MAX_PRODUCTS} products at once!`,
        });
        return;
      }

      // Prepare products by adding the plug ID to each product
      const productsToCreate = products.map((product) => ({
        ...product, // Use all data sent from frontend
        plugId: plug.id, // add the plug ID
      }));

      // Create the products in the database
      const result = await prisma.$transaction(async (tx) => {
        // Create all products at once
        await tx.plugProduct.createMany({
          data: productsToCreate,
        });

        // Return the latest products for this plug
        const createdProducts = await tx.plugProduct.findMany({
          where: { plugId: plug.id },
          orderBy: { createdAt: "desc" },
          take: products.length,
        });

        return createdProducts;
      });

       res.status(201).json({
        message: `Added ${result.length} products to your store!`,
        data: result.map(formatProductWithImages),
      });
      return;
    } catch (error) {
      console.error("Error adding products:", error);
       res.status(500).json({ error: "Internal server error!" });
      return;
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
      return;
    } catch (error) {
      console.error("Error fetching products:", error);
       res.status(500).json({ error: "Internal server error!" });
      return;
    }
  },

 // Simple updatePlugProduct function
updatePlugProduct: async (req: AuthRequest, res: Response) => {
  try {
    const productId = req.params.productId;
    const plug = req.plug!;
    const { price, description } = req.body;

    // Find the product
    const existingProduct = await prisma.plugProduct.findFirst({
      where: { id: productId, plugId: plug.id },
    });

    if (!existingProduct) {
       res.status(404).json({ error: "Product not found!" });
       return;
    }

    // Simple validation
    if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
       res.status(400).json({ error: "Price is invalid!" });
       return;
    }

    // Update product
    const updatedProduct = await prisma.plugProduct.update({
      where: { id: productId },
      data: {
        description: description !== undefined ? description : existingProduct.description,
        price: price !== undefined ? parseFloat(price) : existingProduct.price,
        updatedAt: new Date(),
      },
    });

     res.status(200).json({
      message: "Product updated successfully!",
      data: formatProductWithImages(updatedProduct),
    });
    return;
  } catch (error) {
    console.error("Error updating product:", error);
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
         res.status(404).json({ error: "Product not found!" });
         return;
      }

      // Delete the product from database
      await prisma.plugProduct.delete({
        where: { id: productId },
      });

       res.status(200).json({
        message: "Product removed successfully!",
      });
      return;
    } catch (error) {
      console.error("Error removing plug product:", error);
       res.status(500).json({ error: "Internal server error!" });
       return;
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
         res.status(404).json({ error: "Product not found!" });
         return;
      }

       res.status(200).json({
        message: "Product fetched successfully!",
        data: formatProductWithImages(product),
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

      // Delete all products belonging to this plug
      const deleteResult = await prisma.plugProduct.deleteMany({
        where: { plugId: plug.id },
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