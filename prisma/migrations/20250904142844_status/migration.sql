-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('PENDING', 'APPROVED', 'QUERIED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "maxPrice" SET DEFAULT 0,
ALTER COLUMN "minPrice" SET DEFAULT 0;
