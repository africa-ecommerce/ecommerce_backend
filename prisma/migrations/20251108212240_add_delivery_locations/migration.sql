-- CreateTable
CREATE TABLE "StoreDeliveryLocation" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lgas" TEXT[],
    "fee" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StoreDeliveryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channelDeliveryLocation" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lgas" TEXT[],
    "fee" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "channelDeliveryLocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StoreDeliveryLocation" ADD CONSTRAINT "StoreDeliveryLocation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SupplierStorePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channelDeliveryLocation" ADD CONSTRAINT "channelDeliveryLocation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
