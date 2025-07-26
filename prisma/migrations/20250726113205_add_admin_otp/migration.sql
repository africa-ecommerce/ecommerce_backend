/*
  Warnings:

  - You are about to drop the column `lastPriceUpdateAt` on the `PlugProduct` table. All the data in the column will be lost.
  - You are about to drop the column `pendingPrice` on the `PlugProduct` table. All the data in the column will be lost.
  - You are about to drop the column `priceEffectiveAt` on the `PlugProduct` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlugProduct" DROP COLUMN "lastPriceUpdateAt",
DROP COLUMN "pendingPrice",
DROP COLUMN "priceEffectiveAt";

-- CreateTable
CREATE TABLE "AdminOTP" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOTP_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminOTP_token_key" ON "AdminOTP"("token");
