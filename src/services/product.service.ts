// src/services/product.service.ts
import { prisma } from "../config";

export const createProduct = async (
  merchantId: string,
  title: string,
  description: string,
  price: number,
  inventory: number
) => {
  return await prisma.product.create({
    data: {
      title,
      description,
      price,
      inventory,
      merchantId,
    },
  });

//   // Sync with physical store inventory
//   await prisma.physicalInventory.upsert({
//     where: { productId: product.id },
//     update: { stock: inventory },
//     create: {
//       productId: product.id,
//       merchantId,
//       stock: inventory,
//     },
//   });

//   res.status(201).json(product);
};

export const getProductsByMerchant = async (merchantId: string) => {
  return await prisma.product.findMany({
    where: { merchantId },
  });
};

export const updateProduct = async (
  id: string,
  data: {
    title?: string;
    description?: string;
    price?: number;
    inventory?: number;
  }
) => {
  return await prisma.product.update({
    where: { id },
    data,
  });
};

export const deleteProduct = async (id: string) => {
  return await prisma.product.delete({
    where: { id },
  });
};
