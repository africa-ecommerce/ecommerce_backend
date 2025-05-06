/*
  Warnings:

  - You are about to drop the column `category` on the `PlugProduct` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `PlugProduct` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `PlugProduct` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `PlugProduct` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `PlugProduct` table. All the data in the column will be lost.
  - You are about to drop the column `policy` on the `User` table. All the data in the column will be lost.
  - Added the required column `phone` to the `Supplier` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlugProduct" DROP COLUMN "category",
DROP COLUMN "description",
DROP COLUMN "images",
DROP COLUMN "name",
DROP COLUMN "status",
ADD COLUMN     "lastPriceUpdateAt" TIMESTAMP(3),
ADD COLUMN     "pendingPrice" DOUBLE PRECISION,
ADD COLUMN     "priceEffectiveAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "color" TEXT,
ADD COLUMN     "dimensions" TEXT,
ADD COLUMN     "plugsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "size" TEXT,
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weight" DOUBLE PRECISION,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "phone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "policy";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "ProductVariation" (
    "id" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "price" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION,
    "dimensions" TEXT,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVariation_productId_idx" ON "ProductVariation"("productId");

-- CreateIndex
CREATE INDEX "ProductVariation_size_color_idx" ON "ProductVariation"("size", "color");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_plugsCount_idx" ON "Product"("plugsCount");

-- AddForeignKey
ALTER TABLE "ProductVariation" ADD CONSTRAINT "ProductVariation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlugProduct" ADD CONSTRAINT "PlugProduct_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
