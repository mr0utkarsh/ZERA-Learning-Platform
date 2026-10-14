import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { storageService, buildObjectPath } from './storageService.js';
import { ocrService } from './ocrService.js';

// AI Handwritten Notes (Feature 3). The uploaded image is stored privately when
// storage is configured, OCR runs when a provider is configured, and the raw
// OCR text plus a student-corrected version are both preserved. When a stage is
// unavailable it is recorded honestly (SKIPPED / FAILED with a reason) rather
// than fabricating text.

const IMAGE_MAGIC = [
  ['png', Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  ['jpeg', Buffer.from([0xff, 0xd8, 0xff])],
  ['webp', Buffer.from('RIFF')],
  ['gif', Buffer.from('GIF8')]
];

const detectImageKind = (bytes) => {
  for (const [kind, magic] of IMAGE_MAGIC) {
    if (bytes.subarray(0, magic.length).equals(magic)) return kind;
  }
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  return null;
};

const isSupportedScan = (bytes) => Boolean(detectImageKind(bytes));

/**
 * Uploads a handwriting image/scan, stores it privately (when configured),
 * runs OCR (when configured), and persists the note with honest status.
 */
export const uploadHandwriting = async (userId, { bytes, mimeType, fileName, title }) => {
  if (!bytes || bytes.length === 0) throw new ApiError(400, 'The uploaded file is empty.');
  if (bytes.length > env.MAX_UPLOAD_BYTES) throw new ApiError(413, 'The uploaded file is too large.');
  if (!isSupportedScan(bytes)) {
    throw new ApiError(400, 'Unsupported scan. Upload a PNG, JPG, WEBP, GIF image or a PDF.');
  }

  const note = await prisma.handwrittenNote.create({
    data: {
      userId,
      title: String(title || fileName || 'Handwritten note').trim().slice(0, 160),
      drawing: {},
      mimeType: mimeType || null,
      sizeBytes: bytes.length,
      ocrStatus: 'PENDING'
    }
  });

  // 1) Persist the original image privately.
  if (storageService.isConfigured()) {
    try {
      const path = buildObjectPath(userId, 'handwriting', fileName || 'scan');
      const { bucket } = await storageService.upload({
        bucket: env.SUPABASE_HANDWRITING_BUCKET,
        path,
        bytes,
        contentType: mimeType || 'application/octet-stream'
      });
      await prisma.storedObject.create({ data: { userId, bucket, path, mimeType: mimeType || null, sizeBytes: bytes.length, kind: 'handwriting' } });
      await prisma.handwrittenNote.update({ where: { id: note.id }, data: { storagePath: path } });
    } catch (error) {
      await prisma.handwrittenNote.update({ where: { id: note.id }, data: { ocrError: `Image storage unavailable: ${error.message}` } });
    }
  }

  // 2) Run OCR when a provider is configured; otherwise record it honestly.
  if (ocrService.isConfigured()) {
    try {
      await prisma.handwrittenNote.update({ where: { id: note.id }, data: { ocrStatus: 'PROCESSING' } });
      const result = await ocrService.extractText({ bytes, mimeType, fileName });
      await prisma.handwrittenNote.update({
        where: { id: note.id },
        data: {
          ocrStatus: result.text ? 'DONE' : 'FAILED',
          ocrProvider: result.provider,
          ocrConfidence: result.confidence,
          extractedText: result.text || null,
          ocrError: result.text ? null : 'No text could be read from this image.'
        }
      });
    } catch (error) {
      await prisma.handwrittenNote.update({ where: { id: note.id }, data: { ocrStatus: 'FAILED', ocrError: error.message } });
    }
  } else {
    await prisma.handwrittenNote.update({
      where: { id: note.id },
      data: { ocrStatus: 'SKIPPED', ocrError: 'OCR is not configured, so no text was extracted from this image.' }
    });
  }

  return getHandwriting(userId, note.id);
};

/** Saves the student-corrected OCR text. */
export const correctOcrText = async (userId, noteId, correctedText) => {
  const note = await prisma.handwrittenNote.findFirst({ where: { id: noteId, userId } });
  if (!note) throw new ApiError(404, 'Handwritten note not found.');
  return prisma.handwrittenNote.update({
    where: { id: noteId },
    data: { correctedText: String(correctedText || '').slice(0, 20000) }
  });
};

export const getHandwriting = async (userId, id) => {
  const note = await prisma.handwrittenNote.findFirst({ where: { id, userId } });
  if (!note) throw new ApiError(404, 'Handwritten note not found.');
  let imageUrl = null;
  if (note.storagePath && storageService.isConfigured()) {
    try {
      imageUrl = await storageService.createSignedUrl({ bucket: env.SUPABASE_HANDWRITING_BUCKET, path: note.storagePath });
    } catch { /* signed URL is best-effort */ }
  }
  const { drawing, ...rest } = note;
  return { ...rest, imageUrl };
};

export const listHandwriting = async (userId) =>
  prisma.handwrittenNote.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, ocrStatus: true, ocrConfidence: true, ocrProvider: true, createdAt: true, updatedAt: true }
  });

