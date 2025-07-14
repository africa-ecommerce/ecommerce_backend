/*
  Warnings:

  - You are about to drop the `Analytics` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Analytics";

-- CreateTable
CREATE TABLE "LinkAnalytics" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkAnalytics_linkId_platform_key" ON "LinkAnalytics"("linkId", "platform");
