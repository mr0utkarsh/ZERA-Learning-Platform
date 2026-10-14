-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "subject" TEXT,
ADD COLUMN     "topicId" TEXT,
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "topicId" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "StudyPlan" ADD COLUMN     "confirmedSyllabusId" TEXT,
ADD COLUMN     "generator" TEXT NOT NULL DEFAULT 'AI';

-- CreateIndex
CREATE INDEX "Note_userId_topicId_idx" ON "Note"("userId", "topicId");

-- CreateIndex
CREATE INDEX "Quiz_userId_createdAt_idx" ON "Quiz"("userId", "createdAt");
