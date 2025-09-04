/*
  Warnings:

  - You are about to drop the column `color` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `ProductVariation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ProductVariation_size_color_stock_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "color",
ADD COLUMN     "colors" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ProductVariation" DROP COLUMN "color",
ADD COLUMN     "colors" TEXT[] DEFAULT ARRAY[]::TEXT[];
