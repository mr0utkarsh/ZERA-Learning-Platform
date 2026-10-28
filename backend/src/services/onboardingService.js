import { prisma } from '../config/prisma.js';
import { generateContent } from './aiAssessmentService.js';

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

const createCourseFromAnalysis = async (userId, analysis) => {
  const course = await prisma.course.create({
    data: {
      title: normalizeText(analysis.title, 160),
      slug: `${normalizeText(analysis.title, 50).toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      description: normalizeText(analysis.description, 1000),
      difficulty: 'Beginner',
      isPublished: true
    }
  });

  for (const [sIndex, subjectDef] of (analysis.subjects || []).entries()) {
    const subject = await prisma.subject.create({
      data: { courseId: course.id, title: normalizeText(subjectDef.title, 160), sequence: sIndex }
    });
    for (const [uIndex, unitDef] of (subjectDef.units || []).entries()) {
      const unit = await prisma.unit.create({
        data: { subjectId: subject.id, title: normalizeText(unitDef.title, 160), sequence: uIndex }
      });
      for (const [cIndex, chapterDef] of (unitDef.chapters || []).entries()) {
        const chapter = await prisma.chapter.create({
          data: { unitId: unit.id, title: normalizeText(chapterDef.title, 160), sequence: cIndex }
        });
        for (const [tIndex, topicDef] of (chapterDef.topics || []).entries()) {
          const topic = await prisma.topic.create({
            data: { chapterId: chapter.id, title: normalizeText(topicDef.title, 160), sequence: tIndex }
          });
          for (const [lIndex, lessonDef] of (topicDef.lessons || []).entries()) {
            await prisma.lesson.create({
              data: { topicId: topic.id, title: normalizeText(lessonDef.title, 160), content: normalizeText(lessonDef.content, 2000), sequence: lIndex }
            });
          }
        }
      }
    }
  }
};

export const saveSyllabusUpload = async (userId, input) => {
  const extractedText = normalizeText(input.extractedText, 100000);
  if (!extractedText) throw new Error('File does not contain readable text.');

  // 1. Perform Syllabus Upload and Profile update (Outside course generation transaction)
  const syllabus = await prisma.$transaction(async (tx) => {
    const created = await tx.syllabusUpload.create({
      data: {
        userId,
        fileName: normalizeText(input.fileName, 255) || 'syllabus.txt',
        extractedText,
        analysisStatus: 'PENDING'
      }
    });
    await tx.profile.upsert({ where: { userId }, update: { onboardingCompleted: true }, create: { userId, onboardingCompleted: true } });
    return created;
  });

  // 2. Perform AI Analysis and Course generation
  try {
    const prompt = `Analyze this syllabus and create a structured course hierarchy. Return ONLY JSON in this format: 
    {"title": "string", "description": "string", "subjects": [{"title": "string", "units": [{"title": "string", "chapters": [{"title": "string", "topics": [{"title": "string", "lessons": [{"title": "string", "content": "string"}]}]}]}]}]}
    Syllabus: ${extractedText.slice(0, 5000)}`;

    const response = await generateContent(prompt);
    const analysis = JSON.parse(response.replace(/^```json\s*/i, '').replace(/```$/i, ''));
    
    // Atomic course creation
    await prisma.$transaction(async (tx) => {
        await createCourseFromAnalysis(userId, analysis);
        await tx.syllabusUpload.update({ where: { id: syllabus.id }, data: { analysis, analysisStatus: 'COMPLETED' } });
    });
    
    return { id: syllabus.id, fileName: syllabus.fileName, analysis, analysisStatus: 'COMPLETED' };
  } catch (error) {
    console.error('AI course generation failed:', error);
    await prisma.syllabusUpload.update({ where: { id: syllabus.id }, data: { analysisStatus: 'FAILED' } });
    return { id: syllabus.id, fileName: syllabus.fileName, analysis: null, analysisStatus: 'FAILED', message: 'Syllabus uploaded, but AI course generation failed.' };
  }
};
