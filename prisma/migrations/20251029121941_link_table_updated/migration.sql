-- AlterTable
ALTER TABLE "Link" ADD COLUMN     "supplierId" TEXT,
ALTER COLUMN "plugId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Link_supplierId_idx" ON "Link"("supplierId");

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
