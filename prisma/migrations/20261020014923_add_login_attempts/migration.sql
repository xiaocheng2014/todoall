-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loginNameNormalized" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "LoginAttempt_loginNameNormalized_sourceHash_attemptedAt_idx" ON "LoginAttempt"("loginNameNormalized", "sourceHash", "attemptedAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_attemptedAt_idx" ON "LoginAttempt"("attemptedAt");
