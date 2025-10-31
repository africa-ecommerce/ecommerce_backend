// import { NextFunction, Request, Response } from "express";
// import { prisma } from "../../config";
// import { formatPlugProduct } from "../../helper/formatData";

// export const getProductById = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { plugId, productId } = req.params;
//     if (!plugId || !productId) {
//       res.status(400).json({ error: "Missing or invalid field data!" });
//       return;
//     }

//     const product = await prisma.plugProduct.findFirst({
//       where: {
//         id: productId,
//         plugId: plugId,
//       },
//       include: {
//         originalProduct: {
//           include: {
//             variations: true,
//             supplier: {
//               select: {
//                 id: true,
//                 // pickupLocation: true
                
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!product) {
//       res.status(404).json({ error: "Product not found!" });
//       return;
//     }
   

//     // Outdated check
//     if (
//       product.originalProduct.priceUpdatedAt > product.updatedAt &&
//       product.originalProduct.status == "APPROVED"
//     ) {

//       res.status(404).json({ error: "Product not found!" });
//       return;
//     }

//     const formattedProduct = formatPlugProduct(product);
//     res.status(200).json({
//       message: "Product fetched successfully!",
//       data: formattedProduct,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Get all store products
// export const getStoreProducts = async (req: Request, res: Response, next: NextFunction) => {
//   const subdomain = (req.query.subdomain || "").toString().trim().toLowerCase();

//   if (!subdomain) {
//     res.status(400).json({ error: "Missing or invalid field data!" });
//     return;
//   }
//   try {
//     const plug = await prisma.plug.findUnique({
//       where: { subdomain },
//       select: { id: true },
//     });

//     if (!plug) {
//       res.status(404).json({ error: "Subdomain not found!" });
//       return;
//     }

//     const plugProducts = await prisma.plugProduct.findMany({
//       where: { plugId: plug.id,  },
//       include: {
//         originalProduct: {
//           include: { variations: true },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     // Filter out outdated ones (supplier updated price after plug last updated AND has been approved)
//    const filteredProducts = plugProducts.filter(
//      (pp) =>
//        pp.originalProduct.status !== "APPROVED" || // keep if not approved yet
//        pp.originalProduct.priceUpdatedAt <= pp.updatedAt // if approved, must be up-to-date
//    );

//     const formattedProducts = filteredProducts.map((product) =>
//       formatPlugProduct(product)
//     );

//     res.status(200).json({
//       message: "Products fetched successfully!",
//       data: formattedProducts,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const getStoreProductById = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { productId } = req.params;
//     const subdomain = (req.query.subdomain || "")
//       .toString()
//       .trim()
//       .toLowerCase();


//     if (!subdomain || !productId) {
//       res.status(400).json({ error: "Missing or invalid field data!" });
//       return;
//     }

//     const plug = await prisma.plug.findUnique({
//       where: { subdomain },
//       select: { id: true },
//     });


//     if (!plug) {
//       res.status(404).json({ error: "Cannot find store for this subdomain!" });
//       return;
//     }

//     const product = await prisma.plugProduct.findFirst({
//       where: {
//         id: productId,
//         plugId: plug.id,
//       },
//       include: {
//         originalProduct: {
//           include: {
//             variations: true,
//             supplier: {
//               select: {
//                 id: true,
//                 // pickupLocation: true
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!product) {
//       res.status(404).json({ error: "Product not found!" });
//       return;
//     }

    
//     // Check if outdated
//     if (
//       product.originalProduct.priceUpdatedAt > product.updatedAt &&
//       product.originalProduct.status == "APPROVED"
//     ) {
//       res.status(404).json({ error: "Product not found!" });
//       return;
//     }

//     const formattedProduct = formatPlugProduct(product);
//     res.status(200).json({
//       message: "Product fetched successfully!",
//       data: formattedProduct,
//     });
//   } catch (error) {
//     next(error);
//   }
// };




import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config";
import {
  formatPlugProduct,
  formatSupplierProduct,
} from "../../helper/formatData";

// ✅ Get products for a public store (either Plug or Supplier)
export const getStoreProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const subdomain = (req.query.subdomain || "").toString().trim().toLowerCase();

  if (!subdomain) {
    res.status(400).json({ error: "Missing or invalid subdomain!" });
    return;
  }

  try {
    // 🧩 Check both plug & supplier tables for subdomain
    const [plug, supplier] = await Promise.all([
      prisma.plug.findUnique({ where: { subdomain }, select: { id: true } }),
      prisma.supplier.findUnique({
        where: { subdomain },
        select: { id: true },
      }),
    ]);
    
    if (!plug && !supplier) {
      res.status(404).json({ error: "Subdomain not found!" });
      return;
    }

    // 🧱 Plug store
    if (plug) {
      const plugProducts = await prisma.plugProduct.findMany({
        where: { plugId: plug.id },
        include: {
          originalProduct: {
            include: {
              variations: true,
              supplier: {
                select: { id: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Only show products that are still valid for plugs
      const filteredProducts = plugProducts.filter(
        (pp) =>
          pp.originalProduct.status === "APPROVED" &&
          pp.originalProduct.priceUpdatedAt <= pp.updatedAt
      );

      const formattedProducts = filteredProducts.map((p) =>
        formatPlugProduct(p)
      );

      res.status(200).json({
        message: "Plug store products fetched successfully!",
        data: formattedProducts,
      });
      return;
    }

    // 🧱 Supplier store
    if (supplier) {
      const supplierProducts = await prisma.product.findMany({
        where: { supplierId: supplier.id, status: "APPROVED" },
        include: {
          variations: true,
          supplier: { select: { id: true } },
          reviews: true,
        },
        orderBy: { createdAt: "desc" },
      });
     
      const formattedProducts = supplierProducts.map((p) =>
        formatSupplierProduct(p)
      );
      
      res.status(200).json({
        message: "Supplier store products fetched successfully!",
        data: formattedProducts,
      });
    }
  } catch (error) {
    next(error);
  }
};

// ✅ Get single product by ID (for plug or supplier store)
export const getStoreProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId } = req.params;
    const subdomain = (req.query.subdomain || "")
      .toString()
      .trim()
      .toLowerCase();

    if (!subdomain || !productId) {
      res.status(400).json({ error: "Missing or invalid field data!" });
      return;
    }

    // 🧩 Identify store type
    const [plug, supplier] = await Promise.all([
      prisma.plug.findUnique({ where: { subdomain }, select: { id: true } }),
      prisma.supplier.findUnique({
        where: { subdomain },
        select: { id: true },
      }),
    ]);

    if (!plug && !supplier) {
      res.status(404).json({ error: "Store not found for this subdomain!" });
      return;
    }

    // 🧱 Plug store product
    if (plug) {
      const plugProduct = await prisma.plugProduct.findFirst({
        where: { id: productId, plugId: plug.id },
        include: {
          originalProduct: {
            include: {
              variations: true,
              supplier: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (
        !plugProduct ||
        plugProduct.originalProduct.status !== "APPROVED" ||
        plugProduct.originalProduct.priceUpdatedAt > plugProduct.updatedAt
      ) {
        res.status(404).json({ error: "Product not found or unavailable!" });
        return;
      }

      const formattedProduct = formatPlugProduct(plugProduct);
      res.status(200).json({
        message: "Plug product fetched successfully!",
        data: formattedProduct,
      });
      return;
    }

    // 🧱 Supplier store product
    if (supplier) {
      const supplierProduct = await prisma.product.findFirst({
        where: { id: productId, supplierId: supplier.id, status: "APPROVED" },
        include: {
          variations: true,
          supplier: { select: { id: true } },
          reviews: true,
        },
      });

      if (!supplierProduct) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      const formattedProduct = formatSupplierProduct(supplierProduct);
      res.status(200).json({
        message: "Supplier product fetched successfully!",
        data: formattedProduct,
      });
      return;
    }
  } catch (error) {
    next(error);
  }
};



export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, productId } = req.params;
    if (!id || !productId) {
      res.status(400).json({ error: "Missing or invalid field data!" });
      return;
    }

    // Determine whether plugId is actually a Plug or a Supplier id
    const [plug, supplier] = await Promise.all([
      prisma.plug.findUnique({ where: { id }, select: { id: true } }),
      prisma.supplier.findUnique({
        where: { id },
        select: { id: true },
      }),
    ]);

    if (!plug && !supplier) {
      res.status(404).json({ error: "Owner not found!" });
      return;
    }

    // CASE 1: Plug product (plugProduct)
    if (plug) {
      const plugProduct = await prisma.plugProduct.findFirst({
        where: {
          id: productId,
          plugId: plug.id,
        },
        include: {
          originalProduct: {
            include: {
              variations: true,
              supplier: {
                select: {
                  id: true,
                },
              },
              reviews: true,
            },
          },
        },
      });

      if (!plugProduct) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // Outdated check: supplier changed price after plug last updated and original product is APPROVED
      if (
        plugProduct.originalProduct.priceUpdatedAt > plugProduct.updatedAt &&
        plugProduct.originalProduct.status === "APPROVED"
      ) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      const formatted = formatPlugProduct(plugProduct);
      res.status(200).json({
        message: "Product fetched successfully!",
        data: formatted,
      });
      return;
    }

    // CASE 2: Supplier product (Product table)
    if (supplier) {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          supplierId: supplier.id,
        },
        include: {
          variations: true,
          supplier: {
            select: {
              id: true,
            },
          },
          reviews: true,
        },
      });

      if (!product) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // Ensure supplier product is APPROVED (same safety as other supplier endpoints)
      if (product.status !== "APPROVED") {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      const formatted = formatSupplierProduct(product);
      res.status(200).json({
        message: "Product fetched successfully!",
        data: formatted,
      });
      return;
    }
  } catch (error) {
    next(error);
  }
};


