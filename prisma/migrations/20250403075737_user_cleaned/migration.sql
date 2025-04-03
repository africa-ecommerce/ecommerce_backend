-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('UNSET', 'SUPPLIER', 'PLUG');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('WAREHOUSE', 'WHOLESALER', 'IMPORTER', 'LOCAL_STORE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'MERCHANT', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT,
    "policy" BOOLEAN NOT NULL DEFAULT false,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "userType" "UserType" NOT NULL DEFAULT 'UNSET',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PasswordToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plug" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "phone" TEXT,
    "state" TEXT,
    "aboutBusiness" TEXT,
    "niches" TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "category" TEXT,
    "shippingRegions" TEXT,
    "images" TEXT,
    "supplierId" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_refreshToken_key" ON "User"("refreshToken");

-- CreateIndex
CREATE INDEX "User_email_name_idx" ON "User"("email", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_token_key" ON "EmailVerification"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_userId_key" ON "EmailVerification"("userId");

-- CreateIndex
CREATE INDEX "EmailVerification_token_idx" ON "EmailVerification"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordToken_token_key" ON "PasswordToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordToken_email_token_key" ON "PasswordToken"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_userId_key" ON "Supplier"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Plug_userId_key" ON "Plug"("userId");

-- CreateIndex
CREATE INDEX "Plug_businessName_idx" ON "Plug"("businessName");

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordToken" ADD CONSTRAINT "PasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plug" ADD CONSTRAINT "Plug_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
