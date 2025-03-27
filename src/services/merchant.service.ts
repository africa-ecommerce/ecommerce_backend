import { prisma } from "../config";

export const getMerchantProfile = async (id: string) => {
  return await prisma.merchant.findUnique({
    where: { id },
    include: { products: true },
  });
};

export const updateMerchantProfile = async (
  id: string,
  data: { name?: string; email?: string }
) => {
  return await prisma.merchant.update({
    where: { id },
    data,
  });
};
