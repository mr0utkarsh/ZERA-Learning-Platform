import { prisma } from '../config/prisma.js';

const normalizeText = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

export const getOnboardingState = async (userId) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true } } }
  });
  const latestSyllabus = await prisma.syllabusUpload.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, fileName: true, analysis: true, analysisStatus: true, createdAt: true }
  });

  return { profile, latestSyllabus, isComplete: Boolean(profile?.onboardingCompleted) };
};

export const saveProfileSetup = async (userId, input) => {
  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {
      institution: normalizeText(input.institution, 160) || null,
      city: normalizeText(input.city, 120) || null,
      learningGoal: normalizeText(input.learningGoal, 500),
      studyLevel: normalizeText(input.studyLevel, 80),
      weeklyHours: input.weeklyHours
    },
    create: {
      userId,
      institution: normalizeText(input.institution, 160) || null,
      city: normalizeText(input.city, 120) || null,
      learningGoal: normalizeText(input.learningGoal, 500),
      studyLevel: normalizeText(input.studyLevel, 80),
      weeklyHours: input.weeklyHours
    }
  });

  return profile;
};

const analyzeText = (text) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headings = lines.filter((line) => /^(unit|module|chapter|topic|subject|section)\b/i.test(line.replace(/^\d+[.)\s-]*/, ''))).slice(0, 30);
  const suggestedTopics = (headings.length ? headings : lines).slice(0, 12);
  return {
    extractedCharacters: text.length,
    detectedHeadings: headings,
    suggestedTopics,
    note: 'Text was extracted and structurally summarized on the server. AI-generated course creation is not configured in this backend.'
  };
};

export const saveSyllabusUpload = async (userId, input) => {
  const extractedText = normalizeText(input.extractedText, 100000);
  if (!extractedText) {
    const error = new Error('The selected file does not contain readable text. Upload a TXT, MD, CSV, or text-based syllabus file.');
    error.statusCode = 400;
    throw error;
  }

  const analysis = analyzeText(extractedText);
  const syllabus = await prisma.$transaction(async (tx) => {
    const created = await tx.syllabusUpload.create({
      data: {
        userId,
        fileName: normalizeText(input.fileName, 255) || 'syllabus.txt',
        mimeType: normalizeText(input.mimeType, 120) || null,
        extractedText,
        analysis,
        analysisStatus: 'EXTRACTED'
      }
    });
    await tx.profile.upsert({
      where: { userId },
      update: { onboardingCompleted: true },
      create: { userId, onboardingCompleted: true }
    });
    return created;
  });

  return { id: syllabus.id, fileName: syllabus.fileName, analysis: syllabus.analysis, analysisStatus: syllabus.analysisStatus };
};
