import { prisma } from '../config/prisma.js';

export const getAdminOverview = async () => {
  const [totalStudents, activeStudents, suspendedStudents, totalEnrollments, totalCourses, recentStudents] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'STUDENT', status: 'SUSPENDED' } }),
    prisma.enrollment.count(),
    prisma.course.count(),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true
      }
    })
  ]);

  return {
    totalStudents,
    activeStudents,
    suspendedStudents,
    totalEnrollments,
    totalCourses,
    recentStudents,
    summary: {
      activeRatio: totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0,
      suspendedRatio: totalStudents > 0 ? Math.round((suspendedStudents / totalStudents) * 100) : 0
    }
  };
};

export const getStudentDirectory = async ({ search = '', status } = {}) => {
  const query = search.trim();

  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      ...(query ? {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } }
        ]
      } : {}),
      ...(status ? { status } : {})
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      profile: {
        select: {
          institution: true,
          city: true,
          studyLevel: true,
          weeklyHours: true,
          learningGoal: true
        }
      },
      _count: {
        select: {
          enrollments: true,
          progress: true,
          quizAttempts: true,
          mockAttempts: true
        }
      }
    }
  });

  return students.map((student) => ({
    ...student,
    enrollmentCount: student._count.enrollments,
    progressCount: student._count.progress,
    quizCount: student._count.quizAttempts,
    mockCount: student._count.mockAttempts,
    _count: undefined
  }));
};

export const getStudentDetails = async (studentId) => {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: 'STUDENT'
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      profile: {
        select: {
          institution: true,
          city: true,
          graduationYear: true,
          learningGoal: true,
          studyLevel: true,
          weeklyHours: true,
          onboardingCompleted: true
        }
      },
      enrollments: {
        include: {
          course: {
            select: { id: true, title: true, slug: true }
          },
          progress: true
        }
      },
      quizAttempts: {
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: { quiz: { select: { id: true, title: true } } }
      },
      mockAttempts: {
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: { mockTest: { select: { id: true, title: true } } }
      }
    }
  });

  if (!student) {
    const error = new Error('Student not found.');
    error.statusCode = 404;
    throw error;
  }

  return student;
};

export const updateStudentStatus = async (studentId, status) => {
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    const error = new Error('Status must be either ACTIVE or SUSPENDED.');
    error.statusCode = 400;
    throw error;
  }

  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: 'STUDENT'
    }
  });

  if (!student) {
    const error = new Error('Student not found.');
    error.statusCode = 404;
    throw error;
  }

  return prisma.user.update({
    where: { id: studentId },
    data: { status },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      updatedAt: true
    }
  });
};
