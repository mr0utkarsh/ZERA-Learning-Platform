import { parseMultipart } from '../utils/multipart.js';
import { extractTextFromBuffer, isSupportedFile } from '../utils/fileExtractor.js';
import { env } from '../config/env.js';
import { getOnboardingState, saveProfileSetup, saveSyllabusUpload } from '../services/onboardingService.js';
import { ApiError } from '../utils/ApiError.js';
import { validateProfileSetup } from '../utils/validators.js';

export const getOnboarding = async (req, res, next) => {
  try {
    res.json({ success: true, data: await getOnboardingState(req.user.id) });
  } catch (error) {
    next(error);
  }
};

export const updateProfileSetup = async (req, res, next) => {
  try {
    const input = validateProfileSetup(req.body);
    res.json({ success: true, data: await saveProfileSetup(req.user.id, input) });
  } catch (error) {
    next(error);
  }
};

/**
 * Accepts a real multipart upload. The file bytes are read off the wire and
 * decoded server-side, so PDF and DOCX syllabi work instead of arriving as
 * base64-ish text. A JSON `extractedText` body is still accepted for plain text
 * submitted by clients that have no file to send.
 */
export const uploadSyllabus = async (req, res, next) => {
  try {
    const isMultipart = /^multipart\/form-data/i.test(String(req.headers['content-type'] || ''));

    if (!isMultipart) {
      const result = await saveSyllabusUpload(req.user.id, {
        fileName: req.body?.fileName,
        mimeType: req.body?.mimeType,
        extractedText: req.body?.extractedText
      });
      return res.status(201).json({ success: true, data: result });
    }

    // express.json() must not consume the stream first.
    const { files, fields } = await parseMultipart(req, { maxBytes: env.MAX_UPLOAD_BYTES });

    const file = files.find((f) => f.fieldname === 'file' || f.fieldname === 'syllabus') || files[0];
    if (!file) {
      throw new ApiError(400, 'No file was uploaded. Send the syllabus as the "file" part of a multipart/form-data request.');
    }
    if (file.size === 0) {
      throw new ApiError(400, 'The uploaded file is empty.');
    }
    if (!isSupportedFile(file.filename, file.mimetype)) {
      throw new ApiError(400, `Unsupported file type for "${file.filename}". Upload a TXT, MD, CSV, JSON, DOCX or text-based PDF.`);
    }

    const extractedText = await extractTextFromBuffer(file.buffer, file.mimetype, file.filename);

    const result = await saveSyllabusUpload(req.user.id, {
      fileName: fields.fileName || file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      extractedText
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};
