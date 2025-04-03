/*
  Warnings:

  - Added the required column `generalMerchant` to the `Plug` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `businessType` on the `Supplier` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Plug" ADD COLUMN     "generalMerchant" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "businessType",
ADD COLUMN     "businessType" TEXT NOT NULL;

-- DropEnum
DROP TYPE "BusinessType";
