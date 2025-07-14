/*
  Warnings:

  - You are about to drop the column `paymentReference` on the `PlugPayment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentReference` on the `ResolvePlugPayment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentReference` on the `ResolveSupplierPayment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentReference` on the `SupplierPayment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlugPayment" DROP COLUMN "paymentReference";

-- AlterTable
ALTER TABLE "ResolvePlugPayment" DROP COLUMN "paymentReference";

-- AlterTable
ALTER TABLE "ResolveSupplierPayment" DROP COLUMN "paymentReference";

-- AlterTable
ALTER TABLE "SupplierPayment" DROP COLUMN "paymentReference";

-- CreateTable
CREATE TABLE "PlugWithdrawalHistory" (
    "id" TEXT NOT NULL,
    "plugId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlugWithdrawalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierWithdrawalHistory" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierWithdrawalHistory_pkey" PRIMARY KEY ("id")
);
