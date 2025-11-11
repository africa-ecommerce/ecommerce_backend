import { prisma } from "../src/config";

async function main() {
  console.log("🧹 Cleaning up orders, order items, and related payments...");

  // Order of deletion matters due to relations
  await prisma.orderItem.deleteMany({});
  console.log("✅ Deleted all OrderItems");

  await prisma.plugPayment.deleteMany({});
  console.log("✅ Deleted all PlugPayments");

  await prisma.supplierPayment.deleteMany({});
  console.log("✅ Deleted all SupplierPayments");

  await prisma.order.deleteMany({});
  console.log("✅ Deleted all Orders");

  console.log("🎉 Cleanup completed successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });