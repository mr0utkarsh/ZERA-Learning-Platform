import { parseMultipart } from '../utils/multipart.js';
import { env } from '../config/env.js';
import { uploadHandwriting, correctOcrText, getHandwriting, listHandwriting } from '../services/handwritingService.js';

export const upload = async (req, res, next) => {
  try {
    const { files, fields } = await parseMultipart(req, { maxBytes: env.MAX_UPLOAD_BYTES, maxFiles: 1 });
    const file = files[0];
    if (!file) return res.status(400).json({ success: false, message: 'Upload a scan as the "file" part of a multipart request.' });
    const data = await uploadHandwriting(req.user.id, {
      bytes: file.buffer, mimeType: file.mimetype, fileName: file.filename, title: fields.title
    });
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
};

export const correct = async (req, res, next) => {
  try { res.json({ success: true, data: await correctOcrText(req.user.id, req.params.id, req.body.correctedText) }); }
  catch (e) { next(e); }
};

export const get = async (req, res, next) => {
  try { res.json({ success: true, data: await getHandwriting(req.user.id, req.params.id) }); }
  catch (e) { next(e); }
};

export const list = async (req, res, next) => {
  try { res.json({ success: true, data: await listHandwriting(req.user.id) }); }
  catch (e) { next(e); }
};
