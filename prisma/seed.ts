// import { normalizeBusinessName } from "../src/helper/helperFunc"; // adjust path
// import { prisma } from "../src/config";

// async function ensureUniquePlugName(base: string) {
//   let candidate = base;
//   let counter = 0;

//   while (true) {
//     const existing = await prisma.plug.findFirst({
//       where: {
//         OR: [{ normalizedBusinessName: candidate }, { subdomain: candidate }],
//       },
//     });

//     if (!existing) return candidate;

//     counter++;
//     candidate = base + "s".repeat(counter);
//   }
// }

// async function ensureUniqueSupplierName(base: string) {
//   let candidate = base;
//   let counter = 0;

//   while (true) {
//     const existing = await prisma.supplier.findFirst({
//       where: { normalizedBusinessName: candidate },
//     });

//     if (!existing) return candidate;

//     counter++;
//     candidate = base + "s".repeat(counter);
//   }
// }

// async function main() {
//   console.log("🔄 Backfilling normalized business names...");

//   // --- Backfill Plugs ---
//   const plugs = await prisma.plug.findMany({
//     select: { id: true, businessName: true, subdomain: true },
//   });

//   for (const plug of plugs) {
//     if (!plug.businessName) continue;

//     const baseNormalized = normalizeBusinessName(plug.businessName);
//     const uniqueNormalized = await ensureUniquePlugName(baseNormalized);

//     await prisma.plug.update({
//       where: { id: plug.id },
//       data: {
//         normalizedBusinessName: uniqueNormalized,
//         subdomain: plug.subdomain || uniqueNormalized,
//       },
//     });

//     console.log(`✅ Plug ${plug.id} updated -> ${uniqueNormalized}`);
//   }

//   // --- Backfill Suppliers ---
//   const suppliers = await prisma.supplier.findMany({
//     select: { id: true, businessName: true },
//   });

//   for (const supplier of suppliers) {
//     if (!supplier.businessName) continue;

//     const baseNormalized = normalizeBusinessName(supplier.businessName);
//     const uniqueNormalized = await ensureUniqueSupplierName(baseNormalized);

//     await prisma.supplier.update({
//       where: { id: supplier.id },
//       data: {
//         normalizedBusinessName: uniqueNormalized,
//       },
//     });

//     console.log(`✅ Supplier ${supplier.id} updated -> ${uniqueNormalized}`);
//   }

//   console.log("🎉 Backfill complete!");
// }

// main()
//   .then(() => prisma.$disconnect())
//   .catch(async (err) => {
//     console.error("❌ Error during backfill:", err);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
