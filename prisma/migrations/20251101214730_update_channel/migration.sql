/*
  Warnings:

  - A unique constraint covering the columns `[channelId]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `channelId` to the `Channel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "channelId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Channel_channelId_key" ON "Channel"("channelId");
