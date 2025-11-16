/*
  Warnings:

  - A unique constraint covering the columns `[userId,base,quote]` on the table `FxRate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FxRate" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "FxRate_userId_idx" ON "FxRate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_userId_base_quote_key" ON "FxRate"("userId", "base", "quote");

-- AddForeignKey
ALTER TABLE "FxRate" ADD CONSTRAINT "FxRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
