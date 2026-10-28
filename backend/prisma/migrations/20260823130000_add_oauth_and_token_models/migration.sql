-- Add OAuth provider fields and email verification flag to User
ALTER TABLE `User` MODIFY `passwordHash` VARCHAR(191) NULL;

ALTER TABLE `User` ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `User` ADD COLUMN `googleId` VARCHAR(191) NULL;

ALTER TABLE `User` ADD COLUMN `githubId` VARCHAR(191) NULL;

-- CreateTable: PasswordResetToken
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: VerificationToken
CREATE TABLE `VerificationToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationToken` ADD CONSTRAINT `VerificationToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX `User_googleId_key` ON `User`(`googleId`);

-- CreateIndex
CREATE UNIQUE INDEX `User_githubId_key` ON `User`(`githubId`);

-- CreateIndex
CREATE UNIQUE INDEX `PasswordResetToken_token_key` ON `PasswordResetToken`(`token`);

-- CreateIndex
CREATE UNIQUE INDEX `VerificationToken_token_key` ON `VerificationToken`(`token`);

-- CreateIndex
CREATE INDEX `PasswordResetToken_userId_idx` ON `PasswordResetToken`(`userId`);

-- CreateIndex
CREATE INDEX `VerificationToken_userId_idx` ON `VerificationToken`(`userId`);
