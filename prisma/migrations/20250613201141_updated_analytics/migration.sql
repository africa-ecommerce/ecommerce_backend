/*
  Warnings:

  - You are about to drop the column `ip` on the `Analytics` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `Analytics` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Analytics" DROP CONSTRAINT "Analytics_linkId_fkey";

-- AlterTable
ALTER TABLE "Analytics" DROP COLUMN "ip",
DROP COLUMN "userAgent";
