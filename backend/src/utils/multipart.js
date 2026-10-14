/**
 * Real multipart/form-data parser.
 *
 * `multer`/`busboy` are not installable in this environment (no registry
 * access), and reading the file with `FileReader` in the browser sent a JSON
 * string of binary garbage. This parser reads the actual request bytes off the
 * socket stream, so uploaded PDF/DOCX bytes reach the server intact.
 */
import { ApiError } from './ApiError.js';

const DASH_DASH = Buffer.from('--');
const CRLF = Buffer.from('\r\n');

const indexOfBuffer = (haystack, needle, from = 0) => haystack.indexOf(needle, from);

const parseContentType = (value) => {
  const [type, ...params] = String(value || '').split(';');
  const out = { type: type.trim().toLowerCase() };
  for (const param of params) {
    const [key, val] = param.split('=');
    if (key && val) out[key.trim().toLowerCase()] = val.trim().replace(/^"|"$/g, '');
  }
  return out;
};

const parseHeaders = (raw) => {
  const headers = {};
  for (const line of raw.split('\r\n')) {
    const index = line.indexOf(':');
    if (index === -1) continue;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  return headers;
};

/**
 * @param {import('express').Request} req
 * @param {{ maxBytes?: number, maxFiles?: number, maxFields?: number }} options
 * @returns {Promise<{ files: Array<{ fieldname: string, filename: string, mimetype: string, buffer: Buffer, size: number }>, fields: Record<string, string> }>}
 */
export const parseMultipart = async (req, { maxBytes, maxFiles = 5, maxFields = 20 } = {}) => {
  const limit = maxBytes ?? 10 * 1024 * 1024;
  const contentType = String(req.headers['content-type'] || '');

  if (!/^multipart\/form-data/i.test(contentType)) {
    throw new ApiError(415, 'Expected a multipart/form-data request with a file field.');
  }

  const { boundary } = parseContentType(contentType);
  if (!boundary) {
    throw new ApiError(400, 'The multipart request is missing its boundary parameter.');
  }

  const delimiter = Buffer.from(`--${boundary}`);

  const chunks = [];
  let total = 0;

  await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      total += chunk.length;
      // Abort as soon as the limit is passed rather than buffering the whole
      // body and only then rejecting.
      if (total > limit) {
        cleanup();
        // Stop reading but leave the socket alive. Destroying the request here
        // raced the error response and the client saw a bare ECONNRESET
        // instead of the 413 explaining why the upload was refused.
        // Discarding the rest keeps memory flat and lets the reply flush.
        req.resume();
        reject(new ApiError(413, `Upload exceeds the maximum allowed size of ${Math.floor(limit / (1024 * 1024))} MB.`));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => { cleanup(); resolve(); };
    const onError = (err) => { cleanup(); reject(err); };
    const cleanup = () => {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
    };

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });

  const body = Buffer.concat(chunks);
  const files = [];
  const fields = {};

  let cursor = indexOfBuffer(body, delimiter);
  if (cursor === -1) {
    throw new ApiError(400, 'The multipart body contains no parts.');
  }

  while (cursor !== -1) {
    let partStart = cursor + delimiter.length;

    // "--" after the delimiter marks the closing boundary.
    if (body.subarray(partStart, partStart + 2).equals(DASH_DASH)) break;
    if (body.subarray(partStart, partStart + 2).equals(CRLF)) partStart += 2;

    const nextDelimiter = indexOfBuffer(body, delimiter, partStart);
    if (nextDelimiter === -1) {
      throw new ApiError(400, 'The multipart body is truncated.');
    }

    // The CRLF immediately before the next delimiter belongs to the boundary.
    let partEnd = nextDelimiter;
    if (body.subarray(partEnd - 2, partEnd).equals(CRLF)) partEnd -= 2;

    const part = body.subarray(partStart, partEnd);
    const headerEnd = indexOfBuffer(part, Buffer.from('\r\n\r\n'));

    if (headerEnd === -1) {
      throw new ApiError(400, 'A multipart part is missing its headers.');
    }

    const headers = parseHeaders(part.subarray(0, headerEnd).toString('utf-8'));
    const content = part.subarray(headerEnd + 4);

    const disposition = parseContentType(headers['content-disposition'] || '');
    const name = disposition.name;
    const filename = disposition.filename;

    if (name) {
      if (filename !== undefined) {
        if (files.length >= maxFiles) {
          throw new ApiError(400, `At most ${maxFiles} file(s) may be uploaded per request.`);
        }
        files.push({
          fieldname: name,
          filename,
          mimetype: (headers['content-type'] || 'application/octet-stream').toLowerCase(),
          buffer: Buffer.from(content),
          size: content.length
        });
      } else {
        if (Object.keys(fields).length >= maxFields) {
          throw new ApiError(400, `At most ${maxFields} form field(s) may be submitted.`);
        }
        fields[name] = content.toString('utf-8');
      }
    }

    cursor = nextDelimiter;
  }

  return { files, fields };
};
