-- CreateTable
CREATE TABLE "WithdrawalVerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalVerificationToken_token_key" ON "WithdrawalVerificationToken"("token");

-- CreateIndex
CREATE INDEX "WithdrawalVerificationToken_token_idx" ON "WithdrawalVerificationToken"("token");

-- CreateIndex
CREATE INDEX "WithdrawalVerificationToken_userId_idx" ON "WithdrawalVerificationToken"("userId");

-- AddForeignKey
ALTER TABLE "WithdrawalVerificationToken" ADD CONSTRAINT "WithdrawalVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
