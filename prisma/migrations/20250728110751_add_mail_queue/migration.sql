/*
  Warnings:

  - You are about to drop the column `used` on the `AdminOTP` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AdminOTP" DROP COLUMN "used";

-- CreateTable
CREATE TABLE "MailQueue" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "replyTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailQueue_pkey" PRIMARY KEY ("id")
);
