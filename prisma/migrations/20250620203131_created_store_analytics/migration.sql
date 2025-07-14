-- DropIndex
DROP INDEX "SupplierPayment_orderId_key";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "platform" SET DEFAULT 'Unknown';

-- CreateTable
CREATE TABLE "StoreAnalytics" (
    "id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StoreAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreAnalytics_subdomain_key" ON "StoreAnalytics"("subdomain");
