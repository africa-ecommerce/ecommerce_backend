import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config";
import { formatPlugProduct } from "../../helper/formatData";

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { plugId, productId } = req.params;
    if (!plugId || !productId) {
      res.status(400).json({ error: "Missing or invalid field data!" });
      return;
    }
    const product = await prisma.plugProduct.findFirst({
      where: { id: productId, plugId: plugId },
      include: {
        originalProduct: {
          include: {
            variations: true,
            supplier: {
              select: {
                id: true,
                pickupLocation: {
                  select: {
                    latitude: true,
                    longitude: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: "Product not found!" });
      return;
    }
    // Format the product with images and variations
    const formattedProduct = formatPlugProduct(product);
    res.status(200).json({
      message: "Product fetched successfully!",
      data: formattedProduct,
    });
  } catch (error) {
   next(error);
  }
};

// Get all store products
export const getStoreProducts = async (req: Request, res: Response, next: NextFunction) => {
  const subdomain = (req.query.subdomain || "").toString().trim().toLowerCase();

  if (!subdomain) {
    res.status(400).json({ error: "Missing or invalid field data!" });
    return;
  }
  try {
    const plug = await prisma.plug.findUnique({
      where: { subdomain },
      select: {
        id: true,
      },
    });

    if (!plug) {
      res.status(404).json({ error: "Cannot find store for this subdomain!" });
      return;
    }

    const plugProducts = await prisma.plugProduct.findMany({
      where: { plugId: plug?.id },
      include: {
        originalProduct: {
          include: {
            variations: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format each product with complete details including reviews
    const formattedProducts = plugProducts.map((product) =>
      formatPlugProduct(product)
    );

    res.status(200).json({
      message: "Products fetched successfully!",
      data: formattedProducts,
    });
  } catch (error) {
    next(error);
  }
};

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
    const plug = await prisma.plug.findUnique({
      where: { subdomain },
      select: {
        id: true,
      },
    });

    if (!plug) {
      res.status(404).json({ error: "Cannot find store for this subdomain!" });
      return;
    }
    const product = await prisma.plugProduct.findFirst({
      where: { id: productId, plugId: plug?.id },
      include: {
        originalProduct: {
          include: {
            variations: true,
            supplier: {
              select: {
                id: true,
                pickupLocation: {
                  select: {
                    latitude: true,
                    longitude: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: "Product not found!" });
      return;
    }
    // Format the product with images and variations
    const formattedProduct = formatPlugProduct(product);
    res.status(200).json({
      message: "Product fetched successfully!",
      data: formattedProduct,
    });
  } catch (error) {
    next(error);
  }
};

