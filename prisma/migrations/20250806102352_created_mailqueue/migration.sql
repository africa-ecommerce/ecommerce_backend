/*
  Warnings:

  - You are about to drop the `MailQueue` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `commission` on table `PlugProduct` required. This step will fail if there are existing NULL values in that column.
  - Made the column `maxPrice` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `minPrice` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PlugProduct" ALTER COLUMN "commission" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "maxPrice" SET NOT NULL,
ALTER COLUMN "minPrice" SET NOT NULL;

-- DropTable
DROP TABLE "MailQueue";

-- CreateTable
CREATE TABLE "mail_queue" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "replyTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "mail_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mail_queue_status_idx" ON "mail_queue"("status");
