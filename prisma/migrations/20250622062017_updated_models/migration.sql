/*
  Warnings:

  - You are about to drop the column `returned` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `returnedQuantity` on the `OrderItem` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "OrderItem_returned_idx";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "returned",
DROP COLUMN "returnedQuantity",
ADD COLUMN     "plugId" TEXT;

-- CreateTable
CREATE TABLE "PausedOrderItem" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PausedOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnedOrderItem" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnedOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PausedOrderItem_orderItemId_key" ON "PausedOrderItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnedOrderItem_orderItemId_key" ON "ReturnedOrderItem"("orderItemId");

-- AddForeignKey
ALTER TABLE "PausedOrderItem" ADD CONSTRAINT "PausedOrderItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedOrderItem" ADD CONSTRAINT "ReturnedOrderItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
