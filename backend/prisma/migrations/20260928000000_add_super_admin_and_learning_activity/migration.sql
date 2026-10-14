-- AddEnumValue: SUPER_ADMIN is required for platform-owner level operations.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL,
-- so Prisma applies enum additions as separate non-transactional statements.
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'APPROVED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('EXTRACTED', 'AI_ANALYZED', 'AI_FAILED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LESSON_COMPLETED', 'QUIZ_SUBMITTED', 'MOCK_TEST_SUBMITTED', 'STUDY_TASK_COMPLETED', 'NOTE_CREATED', 'SYLLABUS_UPLOADED');

-- AlterTable: tokenVersion invalidates outstanding JWTs on password change and
-- makes a password-reset token single-use.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SyllabusUpload" ADD COLUMN "sizeBytes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SyllabusUpload" ADD COLUMN "aiError" TEXT;

-- AlterTable: promote the free-text analysisStatus column to a real enum.
-- Existing rows only ever held 'EXTRACTED', so the cast is lossless.
ALTER TABLE "SyllabusUpload" ALTER COLUMN "analysisStatus" DROP DEFAULT;
ALTER TABLE "SyllabusUpload" ALTER COLUMN "analysisStatus" TYPE "AnalysisStatus" USING ("analysisStatus"::"AnalysisStatus");
ALTER TABLE "SyllabusUpload" ALTER COLUMN "analysisStatus" SET DEFAULT 'EXTRACTED';

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Quiz" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'SEEDED';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MockTest" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AdminInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "type" "ActivityType" NOT NULL,
    "score" INTEGER,
    "total" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTestQuestion" (
    "id" TEXT NOT NULL,
    "mockTestId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyTask" (
    "id" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "timeLabel" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "AdminInvite_status_idx" ON "AdminInvite"("status");

-- CreateIndex
CREATE INDEX "AdminInvite_email_idx" ON "AdminInvite"("email");

-- CreateIndex
CREATE INDEX "SyllabusUpload_userId_analysisStatus_idx" ON "SyllabusUpload"("userId", "analysisStatus");

-- CreateIndex
CREATE INDEX "Course_isPublished_idx" ON "Course"("isPublished");

-- CreateIndex
CREATE INDEX "Quiz_courseId_idx" ON "Quiz"("courseId");

-- CreateIndex
CREATE INDEX "Quiz_createdAt_idx" ON "Quiz"("createdAt");

-- CreateIndex
CREATE INDEX "Question_quizId_sequence_idx" ON "Question"("quizId", "sequence");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_startedAt_idx" ON "QuizAttempt"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- CreateIndex
CREATE INDEX "MockTest_courseId_idx" ON "MockTest"("courseId");

-- CreateIndex
CREATE INDEX "MockTest_createdAt_idx" ON "MockTest"("createdAt");

-- CreateIndex
CREATE INDEX "MockTestQuestion_mockTestId_sequence_idx" ON "MockTestQuestion"("mockTestId", "sequence");

-- CreateIndex
CREATE INDEX "MockTestAttempt_userId_startedAt_idx" ON "MockTestAttempt"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "MockTestAttempt_mockTestId_idx" ON "MockTestAttempt"("mockTestId");

-- CreateIndex
CREATE INDEX "StudyPlan_userId_updatedAt_idx" ON "StudyPlan"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "StudyTask_studyPlanId_sequence_idx" ON "StudyTask"("studyPlanId", "sequence");

-- CreateIndex
CREATE INDEX "StudyTask_userId_isCompleted_idx" ON "StudyTask"("userId", "isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletion_userId_lessonId_key" ON "LessonCompletion"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "LessonCompletion_userId_courseId_idx" ON "LessonCompletion"("userId", "courseId");

-- CreateIndex
CREATE INDEX "LessonCompletion_courseId_idx" ON "LessonCompletion"("courseId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_type_idx" ON "ActivityLog"("userId", "type");

-- CreateIndex
CREATE INDEX "ActivityLog_courseId_type_idx" ON "ActivityLog"("courseId", "type");

-- CreateIndex
CREATE INDEX "Note_userId_updatedAt_idx" ON "Note"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "SupportRequest_userId_createdAt_idx" ON "SupportRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_status_idx" ON "SupportRequest"("status");

-- CreateIndex
CREATE INDEX "PreviousQuestion_courseId_idx" ON "PreviousQuestion"("courseId");

-- AddForeignKey
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestQuestion" ADD CONSTRAINT "MockTestQuestion_mockTestId_fkey" FOREIGN KEY ("mockTestId") REFERENCES "MockTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTask" ADD CONSTRAINT "StudyTask_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTask" ADD CONSTRAINT "StudyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UsedResetToken" (
    "jti" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedResetToken_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "UsedResetToken_expiresAt_idx" ON "UsedResetToken"("expiresAt");
