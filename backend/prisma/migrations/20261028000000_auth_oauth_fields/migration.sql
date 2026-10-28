-- Add OAuth provider fields and email verification flag to User
-- Makes passwordHash nullable to support OAuth-only accounts (no password)

-- Make passwordHash nullable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Add email verification flag
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Add Google OAuth provider ID (unique, nullable)
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- Add GitHub OAuth provider ID (unique, nullable)
ALTER TABLE "User" ADD COLUMN "githubId" TEXT;

-- Create unique indexes for provider IDs
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
