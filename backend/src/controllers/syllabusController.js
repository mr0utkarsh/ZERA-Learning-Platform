/**
 * Syllabus upload & AI analysis.
 * Flow: upload file -> extract text -> AI parses structure -> student
 * reviews -> student confirms -> structure is saved.
 * AI output is validated and never trusted blindly; nothing is saved
 * until the student explicitly confirms the reviewed structure.
 */
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const prisma = require('../config/prisma');
const config = require('../config');
const ai = require('../ai');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const { ok } = require('../utils/response');

const ALLOWED = new Map([
  ['application/pdf', '.pdf'],
  ['text/plain', '.txt'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
]);

const storage = multer.diskStorage({
  destination: config.uploadsDir,
  filename: (req, file, cb) => {
    const ext = ALLOWED.get(file.mimetype);
    cb(null, `syllabus-${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(badRequest('Only PDF, DOCX and TXT files are supported'));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED.get(file.mimetype) !== ext) {
      return cb(badRequest('File extension does not match its content type'));
    }
    cb(null, true);
  },
});

async function extractText(filePath, mimetype) {
  if (mimetype === 'text/plain') {
    return fs.promises.readFile(filePath, 'utf8');
  }
  if (mimetype === 'application/pdf') {
    const pdfParse = require('pdf-parse');
    const buf = await fs.promises.readFile(filePath);
    try {
      const data = await pdfParse(buf);
      return data.text || '';
    } catch {
      throw badRequest('This PDF could not be read. Please upload a valid, text-based PDF.');
    }
  }
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const zip = new AdmZip(filePath);
    const entry = zip.getEntry('word/document.xml');
    if (!entry) return '';
    const xml = entry.getData().toString('utf8');
    return xml
      .replace(/<w:p[ >][^]*?<\/w:p>/g, (p) => `${p.replace(/<[^>]+>/g, '')}\n`)
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .trim();
  }
  throw badRequest('Unsupported file type');
}

/** Step 1 — upload the syllabus, extract text, ask the AI to structure it. */
async function uploadAndAnalyze(req, res, next) {
  try {
    if (!req.file) throw badRequest('No file uploaded');
    let text = await extractText(req.file.path, req.file.mimetype);
    // Clean up the uploaded file right away
    await fs.promises.unlink(req.file.path).catch(() => {});

    text = text.replace(/\r/g, '').trim();
    if (!text || text.length < 40) throw badRequest('Could not extract enough text from this file. Please check the document.');

    const structure = await ai.analyzeSyllabus(text);
    return ok(res, { structure }, 'Syllabus analyzed. Please review the structure before saving it.');
  } catch (err) {
    next(err);
  }
}

/** Step 2 — student reviewed the structure; persist it as their course. */
async function confirmStructure(req, res, next) {
  try {
    const { courseName, description, subjects } = req.body || {};
    if (!courseName || !Array.isArray(subjects) || !subjects.length) {
      throw badRequest('A reviewed course structure with at least one subject is required');
    }
    if (subjects.length > 12) throw badRequest('Too many subjects (max 12)');

    const course = await prisma.course.create({
      data: {
        name: String(courseName).slice(0, 200),
        description: description ? String(description).slice(0, 1000) : null,
        userId: req.user.id,
        source: 'SYLLABUS_UPLOAD',
        subjects: {
          create: subjects.slice(0, 12).map((s, si) => ({
            name: String(s.name || 'Subject').slice(0, 200),
            code: s.code ? String(s.code).slice(0, 40) : null,
            order: si,
            units: {
              create: (Array.isArray(s.units) ? s.units : []).slice(0, 15).map((u, ui) => ({
                name: String(u.name || 'Unit').slice(0, 200),
                order: ui,
                chapters: {
                  create: (Array.isArray(u.chapters) ? u.chapters : []).slice(0, 20).map((c, ci) => ({
                    name: String(c.name || 'Chapter').slice(0, 200),
                    order: ci,
                    topics: {
                      create: (Array.isArray(c.topics) ? c.topics : []).slice(0, 25).map((t, ti) => ({
                        name: String(t.name || 'Topic').slice(0, 200),
                        important: t.important === true,
                        order: ti,
                        lessons: {
                          create: [{
                            title: `Introduction to ${String(t.name || 'Topic').slice(0, 200)}`,
                            content: null,
                            order: 0,
                          }],
                        },
                      })),
                    },
                  })),
                },
              })),
            },
          })),
        },
      },
    });

    await prisma.activityLog.create({
      data: { userId: req.user.id, type: 'SYLLABUS_ANALYZED', message: `Saved syllabus structure as course "${course.name}"`, meta: JSON.stringify({ courseId: course.id }) },
    });

    return ok(res, { courseId: course.id }, 'Course structure saved');
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadAndAnalyze, confirmStructure };
