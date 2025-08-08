/*
  Warnings:

  - You are about to drop the column `mailType` on the `mailQueue` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `mailQueue` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "mailQueue_mailType_priority_status_idx";

-- DropIndex
DROP INDEX "mailQueue_mailType_status_attempts_idx";

-- AlterTable
ALTER TABLE "mailQueue" DROP COLUMN "mailType",
DROP COLUMN "priority";

-- CreateTable
CREATE TABLE "ShareAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ShareAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareAnalytics_platform_date_idx" ON "ShareAnalytics"("platform", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ShareAnalytics_userId_platform_date_key" ON "ShareAnalytics"("userId", "platform", "date");

-- CreateIndex
CREATE INDEX "mailQueue_status_idx" ON "mailQueue"("status");
