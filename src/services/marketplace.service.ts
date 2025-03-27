// src/services/marketplace.service.ts
import { prisma } from "../config";

export const listMerchants = async (filter?: {
  category?: string;
  location?: string;
}) => {
  const whereClause: any = {};
  if (filter?.category) {
    whereClause.category = filter.category;
  }
  if (filter?.location) {
    whereClause.location = filter.location;
  }
  return await prisma.merchant.findMany({ where: whereClause });
};

export const listMarketplaceProducts = async (filter?: {
  category?: string;
  keyword?: string;
}) => {
  const whereClause: any = {};
  if (filter?.category) {
    whereClause.category = filter.category;
  }
  if (filter?.keyword) {
    // In a full implementation, use PostgreSQL full-text search; here we simulate with a contains filter.
    whereClause.title = { contains: filter.keyword, mode: "insensitive" };
  }
  return await prisma.product.findMany({
    where: whereClause,
    include: { merchant: true },
  });
};
