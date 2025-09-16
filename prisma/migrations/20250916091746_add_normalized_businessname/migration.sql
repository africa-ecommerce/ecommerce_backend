/*
  Warnings:

  - Made the column `normalizedBusinessName` on table `Plug` required. This step will fail if there are existing NULL values in that column.
  - Made the column `normalizedBusinessName` on table `Supplier` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Plug" ALTER COLUMN "normalizedBusinessName" SET NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "normalizedBusinessName" SET NOT NULL;
