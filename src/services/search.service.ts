// src/services/search.service.ts
import { prisma } from "../config";

export const searchProducts = async (query: string) => {
  return await prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { merchant: true },
  });
};

export const searchMerchants = async (query: string) => {
  return await prisma.merchant.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { location: { contains: query, mode: "insensitive" } },
      ],
    },
  });
};




// export const searchProducts = async (
//   req: Request<{}, {}, {}, { q: string }>,
//   res: Response
// ) => {
//   try {
//     const searchTerm = req.query.q;

//     // Use PostgreSQL full-text search
//     const results = await prisma.product.findMany({
//       where: {
//         searchString: {
//           search: searchTerm.split(" ").join(" & "),
//         },
//         merchant: {
//           tier: { not: "FREE" }, // Only show premium/business stores
//         },
//       },
//       include: {
//         merchant: {
//           select: {
//             businessName: true,
//             locations: true,
//           },
//         },
//       },
//       orderBy: {
//         _relevance: {
//           fields: ["searchString"],
//           search: searchTerm,
//           sort: "desc",
//         },
//       },
//     });

//     // Format for local units
//     const formatted = results.map((product) => ({
//       ...product,
//       priceDisplay: `${
//         product.localUnit
//           ? `₦${product.price}/${product.localUnit}`
//           : `₦${product.price}`
//       }`,
//     }));

//     res.json(formatted);
//   } catch (error) {
//     console.error("[Search Error]", error);
//     res.status(500).json({ error: "Search failed" });
//   }
// };











// import { PrismaClient } from '@prisma/client';
// import { createIndices } from './searchIndexer';

// const prisma = new PrismaClient();

// export class ProductSearch {
//   private async buildFacets(query: string) {
//     const [products, categories] = await Promise.all([
//       prisma.$queryRaw`
//         SELECT category, COUNT(*) 
//         FROM "Product"
//         WHERE websearch_to_tsquery('english', ${query}) @@ search_vector
//         GROUP BY category
//       `,
//       prisma.$queryRaw`
//         SELECT LEFT(location->>'address', 20) as area, COUNT(*)
//         FROM "Merchant"
//         GROUP BY area
//       `
//     ]);

//     return {
//       priceRanges: ['0-5000', '5000-20000', '20000+'],
//       categories,
//       locations
//     };
//   }

//   async hybridSearch(query: string, filters: any) {
//     const tsQuery = query.split(' ').join(' & ');
    
//     const results = await prisma.product.findMany({
//       where: {
//         AND: [
//           { searchVector: { search: tsQuery } },
//           { price: { gte: filters.minPrice } },
//           { merchant: { locations: { some: { address: { contains: filters.area } } } }
//         ]
//       },
//       include: {
//         merchant: {
//           select: { businessName: true, tier: true }
//         }
//       },
//       orderBy: { _relevance: { fields: ['searchVector'], search: tsQuery, sort: 'desc' } }
//     });

//     return {
//       results: this.formatLocalUnits(results),
//       facets: await this.buildFacets(query)
//     };
//   }
// }