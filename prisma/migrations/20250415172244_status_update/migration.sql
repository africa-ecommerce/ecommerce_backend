/*
  Warnings:

  - You are about to drop the column `quantity` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `shippingRegions` on the `Product` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "quantity",
DROP COLUMN "shippingRegions",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "PlugProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "images" TEXT,
    "originalId" TEXT NOT NULL,
    "plugId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlugProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlugProduct_plugId_idx" ON "PlugProduct"("plugId");

-- CreateIndex
CREATE INDEX "PlugProduct_originalId_idx" ON "PlugProduct"("originalId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlugProduct" ADD CONSTRAINT "PlugProduct_plugId_fkey" FOREIGN KEY ("plugId") REFERENCES "Plug"("id") ON DELETE CASCADE ON UPDATE CASCADE;
