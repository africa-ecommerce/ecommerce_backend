-- CreateTable
CREATE TABLE "ResolvePlugPayment" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "plugId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'OPENED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolvePlugPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolveSupplierPayment" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'OPENED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolveSupplierPayment_pkey" PRIMARY KEY ("id")
);
