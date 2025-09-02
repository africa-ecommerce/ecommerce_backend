/*
  Warnings:

  - You are about to drop the column `latitude` on the `Buyer` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Buyer` table. All the data in the column will be lost.
  - You are about to drop the column `buyerLatitude` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `buyerLongitude` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Buyer" DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "terminalAddress" TEXT,
ALTER COLUMN "streetAddress" DROP NOT NULL,
ALTER COLUMN "lga" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "buyerLatitude",
DROP COLUMN "buyerLongitude",
ALTER COLUMN "buyerAddress" DROP NOT NULL,
ALTER COLUMN "buyerLga" DROP NOT NULL;
