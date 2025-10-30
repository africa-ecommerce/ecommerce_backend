/*
  Warnings:

  - A unique constraint covering the columns `[supplierId]` on the table `StoreAnalytics` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subdomain]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StoreAnalytics" ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "configUrl" TEXT,
ADD COLUMN     "subdomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StoreAnalytics_supplierId_key" ON "StoreAnalytics"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_subdomain_key" ON "Supplier"("subdomain");
