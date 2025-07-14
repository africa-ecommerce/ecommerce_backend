/*
  Warnings:

  - You are about to drop the column `plugAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `plugPrice` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `supplierAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `supplierPrice` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "PlugPayment" DROP CONSTRAINT "PlugPayment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierPayment" DROP CONSTRAINT "SupplierPayment_orderId_fkey";

-- DropIndex
DROP INDEX "Order_supplierId_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "plugAmount",
DROP COLUMN "plugPrice",
DROP COLUMN "supplierAmount",
DROP COLUMN "supplierId",
DROP COLUMN "supplierPrice";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "plugPrice" DOUBLE PRECISION,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "supplierPrice" DOUBLE PRECISION;
