/*
  Warnings:

  - Made the column `productName` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `plugPrice` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `supplierId` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `supplierPrice` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `plugId` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "commission" DOUBLE PRECISION,
ALTER COLUMN "productName" SET NOT NULL,
ALTER COLUMN "plugPrice" SET NOT NULL,
ALTER COLUMN "supplierId" SET NOT NULL,
ALTER COLUMN "supplierPrice" SET NOT NULL,
ALTER COLUMN "plugId" SET NOT NULL;
