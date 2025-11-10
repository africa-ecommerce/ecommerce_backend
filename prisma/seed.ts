// import { prisma } from "../src/config";

// async function main() {
//   console.log("🧩 Fixing NOT NULL constraints before migration...");

//   const queries = [
//     `ALTER TABLE "PlugProduct" ALTER COLUMN "commission" DROP NOT NULL;`,
//     `ALTER TABLE "Product" ALTER COLUMN "minPrice" DROP NOT NULL;`,
//     `ALTER TABLE "Product" ALTER COLUMN "maxPrice" DROP NOT NULL;`,
//     `ALTER TABLE "Supplier" ALTER COLUMN "verified" DROP NOT NULL;`,
//     `ALTER TABLE "OrderItem" ALTER COLUMN "commission" DROP NOT NULL;`,
//   ];

//   for (const query of queries) {
//     try {
//       await prisma.$executeRawUnsafe(query);
//       console.log(`✅ Executed: ${query}`);
//     } catch (e) {
//       console.warn(`⚠️ Skipped: ${query}`, (e as Error).message);
//     }
//   }

//   console.log("✅ Constraint fixes complete.");
// }

// main()
//   .catch((e) => {
//     console.error("❌ Error during constraint fix:", e);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
