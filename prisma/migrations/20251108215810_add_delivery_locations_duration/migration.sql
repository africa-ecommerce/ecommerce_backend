/*
  Warnings:

  - You are about to drop the `channelDeliveryLocation` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `duration` to the `StoreDeliveryLocation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "channelDeliveryLocation" DROP CONSTRAINT "channelDeliveryLocation_channelId_fkey";

-- AlterTable
ALTER TABLE "StoreDeliveryLocation" ADD COLUMN     "duration" TEXT NOT NULL;

-- DropTable
DROP TABLE "channelDeliveryLocation";

-- CreateTable
CREATE TABLE "ChannelDeliveryLocation" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lgas" TEXT[],
    "fee" DOUBLE PRECISION NOT NULL,
    "duration" TEXT NOT NULL,

    CONSTRAINT "ChannelDeliveryLocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChannelDeliveryLocation" ADD CONSTRAINT "ChannelDeliveryLocation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
