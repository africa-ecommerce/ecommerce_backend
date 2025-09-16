/*
  Warnings:

  - A unique constraint covering the columns `[normalizedBusinessName]` on the table `Plug` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[normalizedBusinessName]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Plug" ADD COLUMN     "normalizedBusinessName" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "normalizedBusinessName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Plug_normalizedBusinessName_key" ON "Plug"("normalizedBusinessName");

-- CreateIndex
CREATE INDEX "Plug_normalizedBusinessName_idx" ON "Plug"("normalizedBusinessName");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_normalizedBusinessName_key" ON "Supplier"("normalizedBusinessName");

-- CreateIndex
CREATE INDEX "Supplier_normalizedBusinessName_idx" ON "Supplier"("normalizedBusinessName");
