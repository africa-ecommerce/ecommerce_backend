-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productName" TEXT;

-- CreateIndex
CREATE INDEX "Link_plugId_idx" ON "Link"("plugId");

-- CreateIndex
CREATE INDEX "LinkAnalytics_linkId_idx" ON "LinkAnalytics"("linkId");

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_plugId_fkey" FOREIGN KEY ("plugId") REFERENCES "Plug"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkAnalytics" ADD CONSTRAINT "LinkAnalytics_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
