-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "returned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "OrderItem_returned_idx" ON "OrderItem"("returned");
