import { prisma } from "../../config";


export const processPendingPrices = async () => {
  try {
    const now = new Date();

    const productsToUpdate = await prisma.plugProduct.findMany({
      where: {
        priceEffectiveAt: {
          lte: now,
        },
        pendingPrice: { not: null },
      },
    });

    for (const product of productsToUpdate) {
      // Use type assertion since we filtered nulls in findMany
      const newPrice = product.pendingPrice as number;

      await prisma.plugProduct.update({
        where: { id: product.id },
        data: {
          price: newPrice, // Now strictly number type
          pendingPrice: null,
          priceEffectiveAt: null,
        },
      });
    }

    console.log(`Updated ${productsToUpdate.length} prices`);
  } catch (error) {
    console.error("Error processing pending prices:", error);
  }
};
