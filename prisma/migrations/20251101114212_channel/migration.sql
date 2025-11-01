-- CreateEnum
CREATE TYPE "FulfillmentTime" AS ENUM ('SAME_DAY', 'NEXT_DAY', 'TWO_DAYS', 'THREE_PLUS_DAYS', 'WEEKEND');

-- CreateEnum
CREATE TYPE "ReturnShippingFee" AS ENUM ('BUYER', 'SUPPLIER', 'SHARED');

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "payOnDelivery" BOOLEAN NOT NULL,
    "fulfillmentTime" "FulfillmentTime" NOT NULL,
    "returnPolicy" BOOLEAN NOT NULL,
    "returnWindow" INTEGER,
    "returnPolicyTerms" TEXT,
    "refundPolicy" BOOLEAN,
    "returnShippingFee" "ReturnShippingFee",
    "supplierShare" DOUBLE PRECISION,
    "phone" TEXT,
    "whatsapp" TEXT,
    "telegram" TEXT,
    "instagram" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Channel_supplierId_key" ON "Channel"("supplierId");
