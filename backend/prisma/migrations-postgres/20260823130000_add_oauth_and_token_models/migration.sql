-- PostgreSQL-compatible migration: Add OAuth provider fields and email verification flag to User
-- Intended for production PostgreSQL database. Do NOT run against MySQL.

-- Make passwordHash nullable to support OAuth-only accounts (no password)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Add email verification flag
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Add Google OAuth provider ID (unique, nullable)
ALTER TABLE "User" ADD COLUMN "googleId" VARCHAR(191);

-- Add GitHub OAuth provider ID (unique, nullable)
ALTER TABLE "User" ADD COLUMN "githubId" VARCHAR(191);

-- CreateTable: PasswordResetToken
CREATE TABLE "PasswordResetToken" (
    "id" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    PRIMARY KEY ("id")
);

-- CreateTable: VerificationToken
CREATE TABLE "VerificationToken" (
    "id" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    PRIMARY KEY ("id")
);

-- AddForeignKey: PasswordResetToken -> User
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: VerificationToken -> User
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: unique googleId on User
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex: unique githubId on User
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex: unique token on PasswordResetToken
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex: unique token on VerificationToken
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex: userId on PasswordResetToken
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex: userId on VerificationToken
CREATE INDEX "VerificationToken_userId_idx" ON "VerificationToken"("userId");
