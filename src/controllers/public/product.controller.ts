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
        where: { supplierId: supplier.id },
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

// ✅ Get single product by ID (for public plug or supplier store)
export const getStoreProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId } = req.params;
    const subdomain = (req.query.subdomain || "").toString().trim().toLowerCase();

    if (!subdomain || !productId) {
      res.status(400).json({ error: "Missing or invalid field data!" });
      return;
    }

    // 🧩 Identify store type
    const [plug, supplier] = await Promise.all([
      prisma.plug.findUnique({ where: { subdomain }, select: { id: true } }),
      prisma.supplier.findUnique({ where: { subdomain }, select: { id: true } }),
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
              supplier: { select: { id: true } },
              reviews: true,
            },
          },
        },
      });

      if (
        !plugProduct ||
        plugProduct.originalProduct.priceUpdatedAt > plugProduct.updatedAt
      ) {
        res.status(404).json({ error: "Product not found or unavailable!" });
        return;
      }

      // ✅ Fetch supplier's channel policy (only required fields)
      const supplierChannelPolicy = await prisma.channel.findFirst({
        where: {
          supplierId: plugProduct.originalProduct.supplierId,
          disabled: false,
        },
        select: {
          payOnDelivery: true,
          returnPolicy: true,
          returnWindow: true,
          returnPolicyTerms: true,
          refundPolicy: true,
          returnShippingFee: true,
          supplierShare: true,
           deliveryLocations: {
            select: {
              id: true,
              state: true,
              lgas: true,
              fee: true,
              duration: true
            },
          },
        },
      });

      const formattedProduct = formatPlugProduct(plugProduct);

      res.status(200).json({
        message: "Plug product fetched successfully!",
        data: {
          ...formattedProduct,
          ...(supplierChannelPolicy || {}),
        },
      });
      return;
    }

    // 🧱 Supplier store product
    if (supplier) {
      const supplierProduct = await prisma.product.findFirst({
        where: { id: productId, supplierId: supplier.id },
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

      const supplierPolicy = await prisma.supplierStorePolicy.findUnique({
        where: { supplierId: supplier.id },
        select: {
          payOnDelivery: true,
          returnPolicy: true,
          returnWindow: true,
          returnPolicyTerms: true,
          refundPolicy: true,
          returnShippingFee: true,
          supplierShare: true,
          deliveryLocations: {
            select: {
              id: true,
              state: true,
              lgas: true,
              fee: true,
              duration: true,
            },
          },
        },
      });

      const formattedProduct = formatSupplierProduct(supplierProduct);

      res.status(200).json({
        message: "Supplier product fetched successfully!",
        data: {
          ...formattedProduct,
          ...(supplierPolicy || {}),
        },
      });
      return;
    }
  } catch (error) {
    next(error);
  }
};



// ✅ Get product by ID for internal use (Plug or Supplier)
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

    // Identify whether ID belongs to a plug or supplier
    const [plug, supplier] = await Promise.all([
      prisma.plug.findUnique({ where: { id }, select: { id: true } }),
      prisma.supplier.findUnique({ where: { id }, select: { id: true } }),
    ]);

    if (!plug && !supplier) {
      res.status(404).json({ error: "Owner not found!" });
      return;
    }

    // 🧱 Plug product case
    if (plug) {
      const plugProduct = await prisma.plugProduct.findFirst({
        where: { id: productId, plugId: plug.id },
        include: {
          originalProduct: {
            include: {
              variations: true,
              supplier: { select: { id: true } },
              reviews: true,
            },
          },
        },
      });

      if (
        !plugProduct ||
        plugProduct.originalProduct.priceUpdatedAt > plugProduct.updatedAt
      ) {
        res.status(404).json({ error: "Product not found or unavailable!" });
        return;
      }

      // ✅ Fetch supplier channel policy + delivery locations
      const supplierChannelPolicy = await prisma.channel.findFirst({
        where: {
          supplierId: plugProduct.originalProduct.supplierId,
          disabled: false,
        },
        select: {
          payOnDelivery: true,
          returnPolicy: true,
          returnWindow: true,
          returnPolicyTerms: true,
          refundPolicy: true,
          returnShippingFee: true,
          supplierShare: true,
          phone: true,
          whatsapp: true,
          telegram: true,
          instagram: true,
          deliveryLocations: {
            select: {
              id: true,
              state: true,
              lgas: true,
              fee: true,
              duration: true
            },
          },
        },
      });

      const formatted = formatPlugProduct(plugProduct);

      res.status(200).json({
        message: "Product fetched successfully!",
        data: {
          ...formatted,
          ...(supplierChannelPolicy || {}),
          deliveryLocations: supplierChannelPolicy?.deliveryLocations || [],
        },
      });
      return;
    }

    // 🧱 Supplier product case
    if (supplier) {
      const product = await prisma.product.findFirst({
        where: { id: productId, supplierId: supplier.id },
        include: {
          variations: true,
          supplier: { select: { id: true } },
          reviews: true,
        },
      });

      if (!product) {
        res.status(404).json({ error: "Product not found!" });
        return;
      }

      // ✅ Fetch store policy + store delivery locations
      const supplierPolicy = await prisma.supplierStorePolicy.findUnique({
        where: { supplierId: supplier.id },
        select: {
          payOnDelivery: true,
          returnPolicy: true,
          returnWindow: true,
          returnPolicyTerms: true,
          refundPolicy: true,
          returnShippingFee: true,
          supplierShare: true,
          deliveryLocations: {
            select: {
              id: true,
              state: true,
              lgas: true,
              fee: true,
              duration: true,
            },
          },
        },
      });

      const formatted = formatSupplierProduct(product);

      res.status(200).json({
        message: "Product fetched successfully!",
        data: {
          ...formatted,
          ...(supplierPolicy || {}),
          deliveryLocations: supplierPolicy?.deliveryLocations || [],
        },
      });
      return;
    }
  } catch (error) {
    next(error);
  }
};