/*
  Warnings:

  - A unique constraint covering the columns `[businessName]` on the table `Plug` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[businessName]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Plug" ADD COLUMN     "subscribedTo" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "subscribers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "businessName" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Plug_businessName_key" ON "Plug"("businessName");

-- CreateIndex
CREATE INDEX "Plug_subdomain_idx" ON "Plug"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_businessName_key" ON "Supplier"("businessName");
