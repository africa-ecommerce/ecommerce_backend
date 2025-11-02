/*
  Warnings:

  - You are about to drop the column `fulfillmentTime` on the `Channel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "fulfillmentTime";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "moq" INTEGER NOT NULL DEFAULT 1;

-- DropEnum
DROP TYPE "FulfillmentTime";

-- CreateTable
CREATE TABLE "SupplierStorePolicy" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "payOnDelivery" BOOLEAN NOT NULL,
    "returnPolicy" BOOLEAN NOT NULL,
    "returnWindow" INTEGER,
    "returnPolicyTerms" TEXT,
    "refundPolicy" BOOLEAN,
    "returnShippingFee" "ReturnShippingFee",
    "supplierShare" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierStorePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierStorePolicy_supplierId_key" ON "SupplierStorePolicy"("supplierId");
