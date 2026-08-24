import { prisma } from '../config/prisma.js';

export const COURSE_CATALOG = [
  {
    slug: 'zera-foundations',
    title: 'ZERA Foundations',
    description: 'Build a strong learning foundation with a clear study system and sustainable routines.',
    subjects: [
      {
        title: 'Core Concepts',
        description: 'Foundational study habits and learning systems.',
        units: [
          {
            title: 'Learning Foundations',
            chapters: [
              {
                title: 'Introduction to Learning Systems',
                topics: [
                  {
                    title: 'Why learning systems matter',
                    lessons: [
                      { title: 'What is a learning system?', content: 'A learning system turns scattered effort into a structured routine.' },
                      { title: 'How habits shape progress', content: 'Consistency is more valuable than bursts of effort.' },
                      { title: 'Planning a week of learning', content: 'A realistic plan reduces overload and improves retention.' }
                    ]
                  },
                  {
                    title: 'Study routines that stick',
                    lessons: [
                      { title: 'Building a sustainable routine', content: 'Small sessions repeated with intention produce better long-term retention.' },
                      { title: 'Time blocking for study', content: 'Schedule deep work blocks before shallow tasks when attention is strongest.' },
                      { title: 'Review cycles that reinforce learning', content: 'Revision is where recall becomes durable memory.' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        title: 'Academic Habits',
        description: 'Build habits that improve focus, retention, and resilience.',
        units: [
          {
            title: 'Study Discipline',
            chapters: [
              {
                title: 'Revision and retention',
                topics: [
                  {
                    title: 'Active recall',
                    lessons: [
                      { title: 'Recall before rereading', content: 'Retrieving information first strengthens memory better than passive review.' },
                      { title: 'Spacing repetition', content: 'Reviewing concepts over increasing intervals improves long-term retention.' },
                      { title: 'Using notes intentionally', content: 'Condense concepts into recall-friendly summaries and examples.' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    slug: 'web-development-fundamentals',
    title: 'Web Development Fundamentals',
    description: 'Learn how websites are built and how to reason about front-end and back-end systems.',
    subjects: [
      {
        title: 'Frontend Core',
        description: 'HTML, CSS, and interactive behaviour.',
        units: [
          {
            title: 'Layout and Structure',
            chapters: [
              {
                title: 'HTML foundations',
                topics: [
                  {
                    title: 'Page structure',
                    lessons: [
                      { title: 'Semantic markup', content: 'Use semantic HTML to describe meaning and improve accessibility.' },
                      { title: 'Forms and inputs', content: 'Forms capture user input and connect UI with logic.' },
                      { title: 'Accessibility basics', content: 'Good structure improves keyboard navigation and screen-reader support.' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        title: 'Backend Basics',
        description: 'How apps handle requests, storage, and logic.',
        units: [
          {
            title: 'Web Request Flow',
            chapters: [
              {
                title: 'Request lifecycle',
                topics: [
                  {
                    title: 'Client-server communication',
                    lessons: [
                      { title: 'HTTP requests', content: 'HTTP methods define the intent of a request sent by the client.' },
                      { title: 'Routes and handlers', content: 'Applications serve different behaviors for different endpoints.' },
                      { title: 'Data flow', content: 'Requests and responses carry the information needed to complete the task.' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    slug: 'data-structures-and-algorithms',
    title: 'Data Structures and Algorithms',
    description: 'Develop problem-solving skills using core algorithmic thinking and common data structures.',
    subjects: [
      {
        title: 'Core Structures',
        description: 'Understand arrays, linked structures, and stacks.',
        units: [
          {
            title: 'Linear Structures',
            chapters: [
              {
                title: 'Arrays and lists',
                topics: [
                  {
                    title: 'Arrays in practice',
                    lessons: [
                      { title: 'Indexing and memory', content: 'Arrays provide fast access by index for many operations.' },
                      { title: 'Traversal patterns', content: 'Linear traversal is the foundation for many algorithms.' },
                      { title: 'When to choose arrays', content: 'Choose the right structure based on read, write, and search needs.' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        title: 'Algorithmic Thinking',
        description: 'Build systematic approaches to problem solving.',
        units: [
          {
            title: 'Problem solving',
            chapters: [
              {
                title: 'Searching and sorting',
                topics: [
                  {
                    title: 'Finding patterns',
                    lessons: [
                      { title: 'Binary search mindset', content: 'Binary search leverages sorted data to reduce search effort dramatically.' },
                      { title: 'Sort complexity', content: 'Efficiency matters when data scales beyond small examples.' },
                      { title: 'Trade-offs in algorithm design', content: 'Choosing the right algorithm depends on data size and update patterns.' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

export const flattenCourseLessons = (courseTree) => {
  const lessons = [];

  for (const subject of courseTree.subjects || []) {
    for (const unit of subject.units || []) {
      for (const chapter of unit.chapters || []) {
        for (const topic of chapter.topics || []) {
          for (const lesson of topic.lessons || []) {
            lessons.push({
              id: lesson.id,
              title: lesson.title,
              content: lesson.content,
              topicTitle: topic.title,
              chapterTitle: chapter.title,
              unitTitle: unit.title,
              subjectTitle: subject.title
            });
          }
        }
      }
    }
  }

  return lessons;
};

export const buildCourseTree = async (courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      subjects: {
        orderBy: { sequence: 'asc' },
        include: {
          units: {
            orderBy: { sequence: 'asc' },
            include: {
              chapters: {
                orderBy: { sequence: 'asc' },
                include: {
                  topics: {
                    orderBy: { sequence: 'asc' },
                    include: {
                      lessons: { orderBy: { sequence: 'asc' } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!course) {
    const error = new Error('Course not found.');
    error.statusCode = 404;
    throw error;
  }

  return course;
};

const createCourseNode = async (courseId, subjectDef, subjectIndex) => {
  const subject = await prisma.subject.create({
    data: {
      courseId,
      title: subjectDef.title,
      description: subjectDef.description || null,
      sequence: subjectIndex
    }
  });

  for (const [unitIndex, unitDef] of (subjectDef.units || []).entries()) {
    const unit = await prisma.unit.create({
      data: {
        subjectId: subject.id,
        title: unitDef.title,
        description: unitDef.description || null,
        sequence: unitIndex
      }
    });

    for (const [chapterIndex, chapterDef] of (unitDef.chapters || []).entries()) {
      const chapter = await prisma.chapter.create({
        data: {
          unitId: unit.id,
          title: chapterDef.title,
          description: chapterDef.description || null,
          sequence: chapterIndex
        }
      });

      for (const [topicIndex, topicDef] of (chapterDef.topics || []).entries()) {
        const topic = await prisma.topic.create({
          data: {
            chapterId: chapter.id,
            title: topicDef.title,
            description: topicDef.description || null,
            sequence: topicIndex
          }
        });

        for (const [lessonIndex, lessonDef] of (topicDef.lessons || []).entries()) {
          await prisma.lesson.create({
            data: {
              topicId: topic.id,
              title: lessonDef.title,
              content: lessonDef.content || '',
              durationMin: lessonDef.durationMin || 10,
              sequence: lessonIndex
            }
          });
        }
      }
    }
  }
};

export const seedCourseCatalog = async () => {
  for (const courseDef of COURSE_CATALOG) {
    const existingCourse = await prisma.course.findUnique({
      where: { slug: courseDef.slug }
    });

    if (existingCourse) {
      continue;
    }

    const course = await prisma.course.create({
      data: {
        title: courseDef.title,
        slug: courseDef.slug,
        description: courseDef.description,
        difficulty: 'Beginner',
        isPublished: true
      }
    });

    for (const [subjectIndex, subjectDef] of (courseDef.subjects || []).entries()) {
      await createCourseNode(course.id, subjectDef, subjectIndex);
    }
  }

  const foundations = await prisma.course.findUnique({ where: { slug: 'zera-foundations' } });
  if (foundations) {
    const subject = await prisma.subject.findFirst({ where: { courseId: foundations.id }, orderBy: { sequence: 'asc' }, include: { units: { orderBy: { sequence: 'asc' }, include: { chapters: { orderBy: { sequence: 'asc' }, include: { topics: { orderBy: { sequence: 'asc' } } } } } } } });
    const topic = subject?.units[0]?.chapters[0]?.topics[0];
    if (subject && topic && !await prisma.pyq.findFirst({ where: { courseId: foundations.id } })) {
      await prisma.pyq.createMany({ data: [
        { courseId: foundations.id, subjectId: subject.id, topicId: topic.id, year: 2025, question: 'Explain why active recall is useful for long-term retention.', answer: 'Active recall strengthens retrieval pathways by requiring the learner to produce knowledge from memory.', explanation: 'A complete answer connects retrieval practice with durable memory.', source: 'ZERA Foundations practice archive' },
        { courseId: foundations.id, subjectId: subject.id, topicId: topic.id, year: 2024, question: 'Which habit best supports a sustainable study routine?', options: ['Manageable repeated sessions', 'One long session before an exam', 'Skipping review', 'Changing goals daily'], answer: 'Manageable repeated sessions', explanation: 'Repeatable sessions support consistency and reduce overload.', source: 'ZERA Foundations practice archive' }
      ] });
    }
    if (subject && topic && !await prisma.resource.findFirst({ where: { courseId: foundations.id } })) {
      await prisma.resource.createMany({ data: [
        { courseId: foundations.id, subjectId: subject.id, topicId: topic.id, title: 'Active recall reference', description: 'A concise reference for planning retrieval practice and review cycles.', resourceType: 'GUIDE', url: 'https://learning-scientists.org/spacing' },
        { courseId: foundations.id, subjectId: subject.id, topicId: topic.id, title: 'Study routine worksheet', description: 'A printable worksheet for planning manageable weekly study sessions.', resourceType: 'TEMPLATE', url: 'https://www.coursera.org/articles/time-management-for-students' }
      ] });
    }
  }
  if (foundations && !await prisma.quiz.findFirst({ where: { title: 'Learning Foundations Check' } })) {
    await prisma.quiz.create({ data: { courseId: foundations.id, title: 'Learning Foundations Check', description: 'A short check on core study habits.', timeLimit: 10, questions: { create: [
      { prompt: 'Which approach supports durable learning?', options: ['Passive rereading only', 'Active recall with review', 'Skipping difficult topics', 'Studying once'], correctAnswer: 'Active recall with review', explanation: 'Retrieval and spaced review strengthen recall.' },
      { prompt: 'What makes a study routine sustainable?', options: ['Unrealistic daily targets', 'Consistent manageable sessions', 'Only studying before exams', 'Never reviewing'], correctAnswer: 'Consistent manageable sessions', explanation: 'Small repeatable sessions build consistency.' }
    ] } } });
  }

  if (foundations && !await prisma.mockTest.findFirst({ where: { title: 'ZERA Foundations Mock Test' } })) {
    await prisma.mockTest.create({
      data: {
        courseId: foundations.id,
        title: 'ZERA Foundations Mock Test',
        description: 'A scored assessment covering the core learning foundations.',
        durationMin: 15,
        questions: { create: [
          { prompt: 'Which practice most directly strengthens retrieval?', options: ['Passive rereading', 'Active recall', 'Copying a chapter', 'Skipping review'], correctAnswer: 'Active recall', explanation: 'Active recall asks you to retrieve information from memory.', sequence: 0 },
          { prompt: 'What makes a study target sustainable?', options: ['A manageable repeated routine', 'Studying only once', 'Avoiding difficult topics', 'Changing goals every day'], correctAnswer: 'A manageable repeated routine', explanation: 'Repeatable targets create consistency without overload.', sequence: 1 },
          { prompt: 'Why use spaced review?', options: ['To avoid practice', 'To reinforce memory over time', 'To finish without checking', 'To replace understanding'], correctAnswer: 'To reinforce memory over time', explanation: 'Spacing reviews helps knowledge remain accessible over longer intervals.', sequence: 2 }
        ] }
      }
    });
  }

  return await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isPublished: true
    }
  });
};

export const getUserCourseEnrollment = async (userId, courseId) => {
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId },
    include: {
      progress: true
    }
  });

  if (!enrollment) {
    return null;
  }

  return enrollment;
};

export const ensureCourseEnrollment = async (userId, courseId) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course) {
    const error = new Error('Course not found.');
    error.statusCode = 404;
    throw error;
  }

  let enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId },
    include: { progress: true }
  });

  if (!enrollment) {
    enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'ACTIVE'
      },
      include: { progress: true }
    });
  }

  const courseTree = await buildCourseTree(courseId);
  const allLessons = flattenCourseLessons(courseTree);
  const totalLessons = allLessons.length;

  if (!enrollment.progress || enrollment.progress.length === 0) {
    const progress = await prisma.progress.create({
      data: {
        enrollmentId: enrollment.id,
        userId,
        courseId,
        completionPercentage: 0,
        completedLessons: 0,
        totalLessons,
        status: 'NOT_STARTED',
        lastLessonId: null
      }
    });

    enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollment.id },
      include: { progress: true }
    });

    return { enrollment, progress, totalLessons };
  }

  const progressRecord = enrollment.progress[0];

  if (progressRecord.totalLessons !== totalLessons) {
    await prisma.progress.update({
      where: { id: progressRecord.id },
      data: {
        totalLessons,
        completionPercentage: progressRecord.completionPercentage || 0,
        completedLessons: progressRecord.completedLessons || 0
      }
    });
  }

  return { enrollment, progress: progressRecord, totalLessons };
};

export const getCourseProgressSnapshot = async (userId, courseId) => {
  const { enrollment, progress, totalLessons } = await ensureCourseEnrollment(userId, courseId);
  const courseTree = await buildCourseTree(courseId);
  const lessonSequence = flattenCourseLessons(courseTree);

  const currentIndex = progress.lastLessonId
    ? lessonSequence.findIndex((lesson) => lesson.id === progress.lastLessonId)
    : -1;

  const completedLessons = currentIndex >= 0 ? currentIndex + 1 : 0;
  const nextLesson = lessonSequence[completedLessons] || null;
  const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const normalizedStatus = completionPercentage >= 100 ? 'COMPLETED' : completionPercentage > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

  const updatedProgress = await prisma.progress.update({
    where: { id: progress.id },
    data: {
      completedLessons,
      completionPercentage,
      status: normalizedStatus,
      totalLessons,
      lastLessonId: progress.lastLessonId || null
    }
  });

  return {
    course: {
      id: courseTree.id,
      title: courseTree.title,
      slug: courseTree.slug,
      description: courseTree.description
    },
    enrollment: {
      id: enrollment.id,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      status: enrollment.status
    },
    progress: {
      id: updatedProgress.id,
      completionPercentage: updatedProgress.completionPercentage,
      completedLessons: updatedProgress.completedLessons,
      totalLessons: updatedProgress.totalLessons,
      status: updatedProgress.status,
      lastLessonId: updatedProgress.lastLessonId
    },
    nextLesson,
    lessonSequence
  };
};

export const markLessonCompleted = async (userId, courseId, lessonId) => {
  const courseTree = await buildCourseTree(courseId);
  const lessonSequence = flattenCourseLessons(courseTree);
  const lesson = lessonSequence.find((item) => item.id === lessonId);

  if (!lesson) {
    const error = new Error('Lesson not found for this course.');
    error.statusCode = 404;
    throw error;
  }

  const { progress } = await ensureCourseEnrollment(userId, courseId);
  const lastIndex = progress.lastLessonId
    ? lessonSequence.findIndex((item) => item.id === progress.lastLessonId)
    : -1;

  const lessonIndex = lessonSequence.findIndex((item) => item.id === lessonId);
  const targetIndex = Math.max(lastIndex, lessonIndex);
  const updatedLastLessonId = lessonSequence[targetIndex]?.id || null;
  const completedLessons = targetIndex >= 0 ? targetIndex + 1 : 0;
  const completionPercentage = lessonSequence.length > 0 ? Math.round((completedLessons / lessonSequence.length) * 100) : 0;

  const updatedProgress = await prisma.progress.update({
    where: { id: progress.id },
    data: {
      lastLessonId: updatedLastLessonId,
      completedLessons,
      completionPercentage,
      totalLessons: lessonSequence.length,
      status: completionPercentage >= 100 ? 'COMPLETED' : completionPercentage > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
    }
  });

  const nextLesson = lessonSequence[Math.min(completedLessons, lessonSequence.length - 1)] || null;

  return {
    progress: {
      id: updatedProgress.id,
      completionPercentage: updatedProgress.completionPercentage,
      completedLessons: updatedProgress.completedLessons,
      totalLessons: updatedProgress.totalLessons,
      status: updatedProgress.status,
      lastLessonId: updatedProgress.lastLessonId
    },
    nextLesson,
    course: {
      id: courseTree.id,
      title: courseTree.title,
      slug: courseTree.slug
    }
  };
};

export const getDashboardSnapshot = async (userId) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { enrolledAt: 'desc' },
    include: {
      course: true,
      progress: true
    }
  });

  const courseSummaries = await Promise.all(
    enrollments.map(async (enrollment) => {
      const courseTree = await buildCourseTree(enrollment.courseId);
      const lessonSequence = flattenCourseLessons(courseTree);
      const progress = enrollment.progress[0] || null;
      const currentIndex = progress?.lastLessonId
        ? lessonSequence.findIndex((lesson) => lesson.id === progress.lastLessonId)
        : -1;
      const completedLessons = currentIndex >= 0 ? currentIndex + 1 : 0;
      const completionPercentage = lessonSequence.length > 0 ? Math.round((completedLessons / lessonSequence.length) * 100) : 0;
      const nextLesson = lessonSequence[completedLessons] || null;

      return {
        id: enrollment.id,
        courseId: enrollment.courseId,
        title: enrollment.course.title,
        slug: enrollment.course.slug,
        description: enrollment.course.description,
        status: enrollment.status,
        completionPercentage,
        completedLessons,
        totalLessons: lessonSequence.length,
        nextLesson,
        progressId: progress?.id || null
      };
    })
  );

  const overallProgress = courseSummaries.length > 0
    ? Math.round(courseSummaries.reduce((sum, course) => sum + course.completionPercentage, 0) / courseSummaries.length)
    : 0;

  const continueLearning = courseSummaries
    .filter((course) => course.completionPercentage < 100)
    .sort((courseA, courseB) => courseA.completionPercentage - courseB.completionPercentage)[0] || null;

  return {
    user: {
      id: userId
    },
    enrolledCourses: courseSummaries,
    overallProgress,
    continueLearning,
    totalCourses: courseSummaries.length
  };
};

export const listAvailableCourses = async () => {
  const courses = await prisma.course.findMany({
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isPublished: true,
      createdAt: true
    }
  });

  return courses;
};
