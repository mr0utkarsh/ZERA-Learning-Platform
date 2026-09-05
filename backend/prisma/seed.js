/**
 * Development seed — safe example data for local development ONLY.
 * Never run this in production (guarded below).
 *
 * Creates:
 *  - one ADMIN account (credentials from .env)
 *  - one STUDENT account (credentials from .env)
 *  - one sample course ("Computer Science — 3rd Semester") with a real
 *    hierarchy so the UI can be exercised
 *  - a few sample PYQs
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping seed in production.');
    return;
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@zera.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const studentEmail = process.env.SEED_STUDENT_EMAIL || 'student@zera.local';
  const studentPassword = process.env.SEED_STUDENT_PASSWORD || 'Student@12345';

  // SUPER_ADMIN — the initial super administrator. Password comes from the
  // environment only (never hardcoded); only a bcrypt hash is stored.
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || '';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || '';
  if (superAdminEmail && superAdminPassword) {
    const existingSuper = await prisma.user.findUnique({ where: { email: superAdminEmail.toLowerCase() } });
    if (existingSuper) {
      await prisma.user.update({
        where: { id: existingSuper.id },
        data: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      });
    } else {
      await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: superAdminEmail.toLowerCase(),
          passwordHash: await bcrypt.hash(superAdminPassword, 12),
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
    }
    // Note: the password itself is intentionally never printed.
    console.log(`  SUPER_ADMIN ensured for: ${superAdminEmail.toLowerCase()} (password from env, stored hashed)`);
  }

  // ---------- Users ----------
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'ZERA Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      name: 'Dev Student',
      email: studentEmail,
      passwordHash: await bcrypt.hash(studentPassword, 12),
      role: 'STUDENT',
      emailVerified: true,
      institution: 'Sample Institute (dev seed)',
    },
  });

  // ---------- Sample course ----------
  const existing = await prisma.course.findFirst({ where: { userId: student.id, name: { contains: 'Computer Science' } } });
  if (existing) {
    console.log('Sample course already exists — skipping course seed.');
  } else {
    await prisma.course.create({
      data: {
        name: 'Computer Science — 3rd Semester (dev sample)',
        description: 'A sample course seeded for local development.',
        institution: 'Sample Institute',
        userId: student.id,
        source: 'MANUAL',
        subjects: {
          create: [
            {
              name: 'Database Management Systems', code: 'CS301', order: 0,
              units: {
                create: [
                  {
                    name: 'Unit 1 — Relational Model', order: 0,
                    chapters: {
                      create: [
                        {
                          name: 'ER Modeling', order: 0,
                          topics: {
                            create: [
                              {
                                name: 'Entities and Attributes', order: 0, important: true,
                                lessons: {
                                  create: [
                                    { title: 'What is an Entity?', order: 0, content: 'An entity is a real-world object that can be distinctly identified — for example, a student, a course, or a building. Entities are described by attributes such as name, id and age.\n\nIn an ER diagram, entities are drawn as rectangles. A strong entity exists on its own, while a weak entity depends on another entity for identification.', objectives: '["Define entity and attribute","Distinguish strong vs weak entities"]' },
                                    { title: 'Relationships and Cardinality', order: 1, content: 'A relationship describes how two or more entities are associated. Cardinality defines the numerical relationship: one-to-one (1:1), one-to-many (1:N), or many-to-many (M:N).\n\nFor example, one department has many employees (1:N), while students and courses form a many-to-many relationship through enrollments.', objectives: '["Identify relationship types","Model cardinality constraints"]' },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                        {
                          name: 'Normalization', order: 1,
                          topics: {
                            create: [
                              {
                                name: 'Functional Dependencies', order: 0,
                                lessons: { create: [{ title: 'Understanding Functional Dependency', order: 0, content: 'A functional dependency X → Y means the value of X uniquely determines the value of Y. For example, StudentId → Name.', objectives: '["Define functional dependency","Give examples"]' }] },
                              },
                              {
                                name: 'Normal Forms 1NF–BCNF', order: 1, important: true,
                                lessons: { create: [{ title: 'First to Third Normal Form', order: 0, content: '1NF removes repeating groups, 2NF removes partial dependencies, and 3NF removes transitive dependencies. BCNF strengthens 3NF by requiring every determinant to be a candidate key.', objectives: '["Check a table for 1NF/2NF/3NF","Normalize a sample table"]' }] },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    name: 'Unit 2 — SQL', order: 1,
                    chapters: {
                      create: [
                        {
                          name: 'SQL Basics', order: 0,
                          topics: {
                            create: [
                              { name: 'SELECT Queries', order: 0, lessons: { create: [{ title: 'Writing SELECT statements', order: 0, content: 'SELECT retrieves rows from tables. WHERE filters rows, ORDER BY sorts them, and GROUP BY aggregates them.', objectives: '["Write basic SELECT queries"]' }] } },
                              { name: 'JOINs', order: 1, important: true, lessons: { create: [{ title: 'Inner and Outer Joins', order: 0, content: 'JOINs combine rows from two or more tables based on a related column. INNER JOIN keeps matches only; LEFT/RIGHT OUTER JOIN keep unmatched rows from one side.', objectives: '["Choose the right JOIN type"]' }] } },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              name: 'Operating Systems', code: 'CS302', order: 1,
              units: {
                create: [
                  {
                    name: 'Unit 1 — Processes', order: 0,
                    chapters: {
                      create: [
                        {
                          name: 'Process Management', order: 0,
                          topics: {
                            create: [
                              { name: 'Process States', order: 0, lessons: { create: [{ title: 'Process lifecycle', order: 0, content: 'A process moves through new, ready, running, waiting and terminated states as it is scheduled by the OS.', objectives: '["Draw the process state diagram"]' }] } },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log('Sample course created for', studentEmail);
  }

  // ---------- Sample PYQs ----------
  const pyqCount = await prisma.pyq.count();
  if (pyqCount === 0) {
    await prisma.pyq.createMany({
      data: [
        { subjectName: 'Database Management Systems', year: 2023, exam: 'End Semester', topic: 'Normalization', difficulty: 'MEDIUM', question: 'Normalize the following table up to 3NF and justify each step: STUDENT_COURSE(StudentId, StudentName, CourseId, CourseName, InstructorName, InstructorPhone).', solution: '1NF: remove repeating groups (one row per enrollment). 2NF: separate Student and Course tables to remove partial dependencies on the composite key. 3NF: move InstructorPhone into an Instructor table to remove the transitive dependency CourseId → InstructorName → InstructorPhone.' },
        { subjectName: 'Database Management Systems', year: 2022, exam: 'End Semester', topic: 'SQL', difficulty: 'EASY', question: 'Write a SQL query to display the names of students who have scored more than 80 marks in any subject.', solution: 'SELECT DISTINCT s.name FROM students s JOIN marks m ON s.id = m.student_id WHERE m.marks > 80;' },
        { subjectName: 'Operating Systems', year: 2023, exam: 'Mid Semester', topic: 'Process Management', difficulty: 'HARD', question: 'Explain the difference between preemptive and non-preemptive scheduling with an example of each.', solution: 'Non-preemptive: once a process gets the CPU it runs until it blocks or finishes (e.g., FCFS). Preemptive: the scheduler can interrupt a running process (e.g., Round Robin with a time quantum).' },
        { subjectName: 'Operating Systems', year: 2021, exam: 'End Semester', topic: 'Deadlock', difficulty: 'MEDIUM', question: 'State the four necessary conditions for deadlock and explain how each can be prevented.', solution: 'Mutual exclusion, hold and wait, no preemption, circular wait. Prevention attacks at least one condition, e.g., requiring all resources upfront removes hold-and-wait.' },
      ],
    });
    console.log('Sample PYQs created');
  }

  console.log('\nSeed complete.');
  console.log(`  Admin   : ${adminEmail} / ${adminPassword}`);
  console.log(`  Student : ${studentEmail} / ${studentPassword}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
