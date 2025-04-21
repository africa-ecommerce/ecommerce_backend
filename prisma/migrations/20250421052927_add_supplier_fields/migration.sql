/*
  Warnings:

  - A unique constraint covering the columns `[plugId,originalId]` on the table `PlugProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "businessName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "pickupLocation" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "businessType" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PlugProduct_plugId_originalId_key" ON "PlugProduct"("plugId", "originalId");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "Product"("price");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- CreateIndex
CREATE INDEX "Product_category_price_idx" ON "Product"("category", "price");
