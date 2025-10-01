/*
  Warnings:

  - You are about to drop the column `subdomain` on the `StoreAnalytics` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[plugId]` on the table `StoreAnalytics` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StoreAnalytics_subdomain_key";

-- AlterTable
ALTER TABLE "StoreAnalytics" DROP COLUMN "subdomain";

-- CreateIndex
CREATE UNIQUE INDEX "StoreAnalytics_plugId_key" ON "StoreAnalytics"("plugId");
