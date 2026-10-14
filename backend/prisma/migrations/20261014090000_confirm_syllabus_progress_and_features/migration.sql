-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DoubtSender" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'LOGIN_OTP');

-- CreateEnum
CREATE TYPE "VerificationChannel" AS ENUM ('EMAIL', 'SMS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'DOUBT_ASKED';
ALTER TYPE "ActivityType" ADD VALUE 'INTERVIEW_COMPLETED';
ALTER TYPE "ActivityType" ADD VALUE 'RESOURCE_BOOKMARKED';

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_courseId_fkey";

-- AlterTable
ALTER TABLE "HandwrittenNote" ADD COLUMN     "correctedText" TEXT,
ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "ocrConfidence" DOUBLE PRECISION,
ADD COLUMN     "ocrError" TEXT,
ADD COLUMN     "ocrProvider" TEXT,
ADD COLUMN     "ocrStatus" "OcrStatus" NOT NULL DEFAULT 'SKIPPED',
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storagePath" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "branch" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "courseProgram" TEXT,
ADD COLUMN     "dailyMinutes" INTEGER,
ADD COLUMN     "difficultAreas" JSONB,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "educationLevel" TEXT,
ADD COLUMN     "examDate" TIMESTAMP(3),
ADD COLUMN     "examType" TEXT,
ADD COLUMN     "explanationStyle" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "semester" TEXT,
ADD COLUMN     "studyDays" JSONB,
ADD COLUMN     "studyTimePref" TEXT,
ADD COLUMN     "subjects" JSONB;

-- AlterTable
ALTER TABLE "StudyTask" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'STUDY',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "SyllabusUpload" ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "storagePath" TEXT;

-- CreateTable
CREATE TABLE "ConfirmedSyllabus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uploadId" TEXT,
    "courseName" TEXT NOT NULL,
    "semester" TEXT,
    "institution" TEXT,
    "examType" TEXT,
    "examDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmedSyllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmedSubject" (
    "id" TEXT NOT NULL,
    "syllabusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmedSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmedUnit" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmedUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmedTopic" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "uncertain" BOOLEAN NOT NULL DEFAULT false,
    "needsRevision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmedTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "status" "TopicStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoubtConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "topicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoubtConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoubtMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" "DoubtSender" NOT NULL,
    "content" TEXT NOT NULL,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoubtMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "skills" JSONB NOT NULL,
    "interviewType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "questions" JSONB,
    "feedback" JSONB,
    "score" INTEGER,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "projectType" TEXT,
    "source" TEXT,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredObject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "channel" "VerificationChannel" NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "resendAfter" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfirmedSyllabus_userId_updatedAt_idx" ON "ConfirmedSyllabus"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ConfirmedSubject_syllabusId_sequence_idx" ON "ConfirmedSubject"("syllabusId", "sequence");

-- CreateIndex
CREATE INDEX "ConfirmedUnit_subjectId_sequence_idx" ON "ConfirmedUnit"("subjectId", "sequence");

-- CreateIndex
CREATE INDEX "ConfirmedTopic_unitId_sequence_idx" ON "ConfirmedTopic"("unitId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "TopicProgress_topicId_key" ON "TopicProgress"("topicId");

-- CreateIndex
CREATE INDEX "TopicProgress_userId_status_idx" ON "TopicProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "DoubtConversation_userId_updatedAt_idx" ON "DoubtConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "DoubtMessage_conversationId_createdAt_idx" ON "DoubtMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "InterviewSession_userId_updatedAt_idx" ON "InterviewSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "LearningResource_skill_idx" ON "LearningResource"("skill");

-- CreateIndex
CREATE INDEX "LearningResource_technology_idx" ON "LearningResource"("technology");

-- CreateIndex
CREATE INDEX "LearningResource_level_idx" ON "LearningResource"("level");

-- CreateIndex
CREATE INDEX "LearningResource_verified_idx" ON "LearningResource"("verified");

-- CreateIndex
CREATE INDEX "ResourceBookmark_userId_createdAt_idx" ON "ResourceBookmark"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceBookmark_userId_resourceId_key" ON "ResourceBookmark"("userId", "resourceId");

-- CreateIndex
CREATE INDEX "StoredObject_userId_kind_idx" ON "StoredObject"("userId", "kind");

-- CreateIndex
CREATE INDEX "StoredObject_userId_createdAt_idx" ON "StoredObject"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationOtp_email_purpose_idx" ON "VerificationOtp"("email", "purpose");

-- CreateIndex
CREATE INDEX "VerificationOtp_phone_purpose_idx" ON "VerificationOtp"("phone", "purpose");

-- CreateIndex
CREATE INDEX "VerificationOtp_expiresAt_idx" ON "VerificationOtp"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "StudyTask_userId_status_idx" ON "StudyTask"("userId", "status");

-- CreateIndex
CREATE INDEX "StudyTask_userId_dueDate_idx" ON "StudyTask"("userId", "dueDate");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmedSyllabus" ADD CONSTRAINT "ConfirmedSyllabus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmedSubject" ADD CONSTRAINT "ConfirmedSubject_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "ConfirmedSyllabus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmedUnit" ADD CONSTRAINT "ConfirmedUnit_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "ConfirmedSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmedTopic" ADD CONSTRAINT "ConfirmedTopic_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ConfirmedUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicProgress" ADD CONSTRAINT "TopicProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicProgress" ADD CONSTRAINT "TopicProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ConfirmedTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubtConversation" ADD CONSTRAINT "DoubtConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoubtMessage" ADD CONSTRAINT "DoubtMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DoubtConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceBookmark" ADD CONSTRAINT "ResourceBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceBookmark" ADD CONSTRAINT "ResourceBookmark_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LearningResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredObject" ADD CONSTRAINT "StoredObject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
