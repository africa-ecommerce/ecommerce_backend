/*
  Warnings:

  - You are about to drop the column `latitude` on the `SupplierAddress` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `SupplierAddress` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SupplierAddress_latitude_longitude_idx";

-- AlterTable
ALTER TABLE "SupplierAddress" DROP COLUMN "latitude",
DROP COLUMN "longitude";
