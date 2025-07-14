-- AlterTable
ALTER TABLE "PlugPayment" ADD COLUMN     "paymentReference" TEXT;

-- AlterTable
ALTER TABLE "ResolvePlugPayment" ADD COLUMN     "paymentReference" TEXT;

-- AlterTable
ALTER TABLE "ResolveSupplierPayment" ADD COLUMN     "paymentReference" TEXT;

-- AlterTable
ALTER TABLE "SupplierPayment" ADD COLUMN     "paymentReference" TEXT;
