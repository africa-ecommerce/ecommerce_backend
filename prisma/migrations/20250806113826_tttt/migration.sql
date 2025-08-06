/*
  Warnings:

  - You are about to drop the `mail_queue` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- DropTable
DROP TABLE "mail_queue";

-- CreateTable
CREATE TABLE "mailQueue" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "replyTo" TEXT,
    "status" "MailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "mailType" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "mailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mailQueue_status_attempts_idx" ON "mailQueue"("status", "attempts");

-- CreateIndex
CREATE INDEX "mailQueue_createdAt_idx" ON "mailQueue"("createdAt");

-- CreateIndex
CREATE INDEX "mailQueue_mailType_status_attempts_idx" ON "mailQueue"("mailType", "status", "attempts");

-- CreateIndex
CREATE INDEX "mailQueue_mailType_priority_status_idx" ON "mailQueue"("mailType", "priority", "status");
