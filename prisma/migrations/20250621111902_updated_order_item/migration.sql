/*
  Warnings:

  - You are about to drop the column `date` on the `StoreAnalytics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "returnedQuantity" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "StoreAnalytics" DROP COLUMN "date";
