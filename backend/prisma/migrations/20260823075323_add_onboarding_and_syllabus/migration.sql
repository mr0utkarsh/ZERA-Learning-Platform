-- AlterTable
ALTER TABLE `Profile` ADD COLUMN `learningGoal` VARCHAR(191) NULL,
    ADD COLUMN `onboardingCompleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `studyLevel` VARCHAR(191) NULL,
    ADD COLUMN `weeklyHours` INTEGER NULL;

-- CreateTable
CREATE TABLE `SyllabusUpload` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `extractedText` TEXT NOT NULL,
    `analysis` JSON NULL,
    `analysisStatus` VARCHAR(191) NOT NULL DEFAULT 'EXTRACTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SyllabusUpload_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SyllabusUpload` ADD CONSTRAINT `SyllabusUpload_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
