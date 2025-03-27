import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Prisma middleware for automatic physical sync
prisma.$use(async (params, next) => {
  if (params.model === "Product" && params.action === "update") {
    const result = await next(params);

    // Update physical store inventory
    await prisma.physicalInventory.upsert({
      where: { productId: result.id },
      update: { stock: result.inventory },
      create: {
        productId: result.id,
        merchantId: result.merchantId,
        stock: result.inventory,
      },
    });

    return result;
  }
  return next(params);
});

export const inventoryWebhook = async (req: Request, res: Response) => {
  try {
    const { productId, physicalStock } = req.body;

    await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { inventory: physicalStock },
      }),
      prisma.physicalInventory.update({
        where: { productId },
        data: { stock: physicalStock },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("[Inventory Sync Error]", error);
    res.status(500).json({ error: "Sync failed" });
  }
};
