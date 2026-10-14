/**
 * Real syllabus text extraction.
 *
 * The previous implementation read local ZIP headers, which report
 * `compressedSize = 0` whenever the archive uses a trailing data descriptor
 * (the common case for DOCX files produced by Word and Google Docs), so DOCX
 * extraction silently returned empty text. This version reads the ZIP central
 * directory, which always carries true sizes, and decodes PDF text using each
 * font's /ToUnicode CMap so accented and subset-encoded text is not mojibake.
 *
 * Supported: TXT, MD, CSV, JSON, DOCX, and PDFs containing a text layer.
 * Scanned/image-only PDFs contain no text layer and are reported as such rather
 * than returning garbage.
 */
import zlib from 'zlib';
import JSZip from 'jszip';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'csv', 'json', 'text', 'tsv', 'log']);
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, 'pdf', 'docx']);

export const isSupportedFile = (fileName, mimeType = '') => {
  const ext = String(fileName || '').split('.').pop()?.toLowerCase() || '';
  if (SUPPORTED_EXTENSIONS.has(ext)) return true;
  const type = String(mimeType).toLowerCase();
  return type.startsWith('text/') || type === 'application/pdf' || type.includes('wordprocessingml');
};

// ─── Plain text ───────────────────────────────────────────────────────────────

const extractPlainText = (buffer) => {
  // Strip a UTF-8 BOM, which otherwise becomes part of the first heading.
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  return text;
};

// ─── DOCX ─────────────────────────────────────────────────────────────────────

const decodeXmlEntities = (value) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');

/** Turns WordprocessingML into readable text, honouring paragraphs and tabs. */
const wordXmlToText = (xml) => {
  const out = [];

  // Preserve paragraph boundaries so headings stay on their own lines.
  const normalised = xml
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n');

  for (const match of normalised.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|\n/g)) {
    if (match[1] === undefined) {
      out.push('\n');
      continue;
    }
    out.push(decodeXmlEntities(match[1]));
  }

  return out
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const extractTextFromDocx = async (buffer) => {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new ApiError(400, 'The uploaded file is not a readable DOCX document.');
  }

  const entry = zip.file('word/document.xml');
  if (!entry) {
    throw new ApiError(400, 'The DOCX file does not contain a word/document.xml part.');
  }

  const xml = await entry.async('string');
  return wordXmlToText(xml);
};

// ─── PDF ──────────────────────────────────────────────────────────────────────

/** Decodes a PDF string literal, honouring escapes and octal codes. */
const decodePdfString = (raw) => {
  const bytes = [];
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (char !== '\\') {
      bytes.push(raw.charCodeAt(i) & 0xff);
      continue;
    }
    const next = raw[i + 1];
    i += 1;
    switch (next) {
      case 'n': bytes.push(10); break;
      case 'r': bytes.push(13); break;
      case 't': bytes.push(9); break;
      case 'b': bytes.push(8); break;
      case 'f': bytes.push(12); break;
      case '(': bytes.push(40); break;
      case ')': bytes.push(41); break;
      case '\\': bytes.push(92); break;
      case '\n': break;
      default:
        if (next >= '0' && next <= '7') {
          let octal = next;
          while (octal.length < 3 && raw[i + 1] >= '0' && raw[i + 1] <= '7') {
            i += 1;
            octal += raw[i];
          }
          bytes.push(parseInt(octal, 8));
        } else if (next !== undefined) {
          bytes.push(next.charCodeAt(0));
        }
    }
  }
  return bytes;
};

/**
 * Parses a /ToUnicode CMap into a map of character code -> unicode string.
 * Without this, subset-encoded PDF fonts produce mojibake.
 */
const parseToUnicodeCMap = (text) => {
  const map = new Map();

  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      map.set(parseInt(pair[1], 16), codePointsToString(pair[2]));
    }
  }

  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const row of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const start = parseInt(row[1], 16);
      const end = parseInt(row[2], 16);
      const target = codePointsToString(row[3]);
      for (let code = start; code <= end && code - start < 65_536; code += 1) {
        map.set(code, target.length === 1 ? incrementLast(target, code - start) : target);
      }
    }
  }

  return map;
};

const codePointsToString = (hex) => {
  let out = '';
  for (let i = 0; i + 3 < hex.length + 1; i += 4) {
    const code = parseInt(hex.slice(i, i + 4), 16);
    if (Number.isFinite(code)) out += String.fromCodePoint(code);
  }
  return out;
};

const incrementLast = (text, offset) => {
  const points = [...text];
  const last = points.pop();
  if (last === undefined) return text;
  return [...points, String.fromCodePoint(last.codePointAt(0) + offset)].join('');
};

/** Decodes PDF bytes using a ToUnicode map, or as UTF-16BE / Latin-1. */
const decodePdfBytes = (bytes, toUnicode) => {
  if (toUnicode && toUnicode.size > 0) {
    let out = '';
    let i = 0;
    while (i < bytes.length) {
      // Two-byte codes are the norm for subset fonts.
      if (i + 1 < bytes.length) {
        const twoByte = (bytes[i] << 8) | bytes[i + 1];
        if (toUnicode.has(twoByte)) {
          out += toUnicode.get(twoByte);
          i += 2;
          continue;
        }
      }
      if (toUnicode.has(bytes[i])) {
        out += toUnicode.get(bytes[i]);
        i += 1;
        continue;
      }
      out += '�';
      i += 1;
    }
    return out;
  }

  // Heuristic: a BOM-less string that is mostly NUL bytes is UTF-16BE.
  const zeros = bytes.filter((b) => b === 0).length;
  if (zeros > bytes.length / 3 && bytes.length > 1) {
    return Buffer.from(bytes).swap16().toString('utf16le').replace(/\0/g, '');
  }

  return Buffer.from(bytes).toString('latin1');
};

/**
 * Enumerates the streams in a PDF as { start, end, dict }.
 *
 * `\bstream` is used rather than a bare `stream` so the marker inside the word
 * `endstream` is not matched, which would otherwise shift every subsequent
 * stream boundary. The /Length entry of the preceding dictionary gives the
 * exact byte count, so binary stream data is never included.
 */
const findPdfStreams = (latin) => {
  const streams = [];
  const marker = /\bstream\r?\n?/g;
  let match;

  while ((match = marker.exec(latin)) !== null) {
    const start = match.index + match[0].length;
    const dict = latin.slice(Math.max(0, match.index - 600), match.index);

    const lengthMatch = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)\b/);
    const terminator = latin.indexOf('endstream', start);

    let end;
    if (lengthMatch && Number(lengthMatch[1]) > 0) {
      const declared = start + Number(lengthMatch[1]);
      // Trust /Length only when it really lands on (or just before) endstream.
      const trimmed = latin.slice(declared, declared + 20);
      if (/^\s*endstream/.test(trimmed) || (terminator !== -1 && Math.abs(declared - terminator) <= 2)) {
        end = declared;
      }
    }
    if (end === undefined) {
      if (terminator === -1) break;
      end = terminator;
      // Drop the EOL that belongs to the `endstream` keyword.
      if (latin.slice(end - 2, end) === '\r\n') end -= 2;
      else if (latin[end - 1] === '\n') end -= 1;
    }

    streams.push({ start, end, dict });
    marker.lastIndex = end;
  }

  return streams;
};

const inflateStream = (raw, dict) => {
  const filter = dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/);
  if (!filter || !/FlateDecode/.test(filter[1])) return raw;
  try {
    return zlib.inflateSync(raw);
  } catch {
    try {
      return zlib.inflateRawSync(raw);
    } catch {
      return null;
    }
  }
};

/** Finds every decompressible stream in the PDF and decodes its text operators. */
const extractPdfText = (buffer) => {
  const latin = buffer.toString('latin1');
  const streams = findPdfStreams(latin);

  const chunks = [];
  for (const { start, end, dict } of streams) {
    let raw = inflateStream(Buffer.from(latin.slice(start, end), 'latin1'), dict);
    if (!raw) continue;
    const content = raw.toString('latin1');
    if (/\bTj\b|\bTJ\b/.test(content)) chunks.push(content);
  }

  // ToUnicode CMaps live in their own streams; collect them all and apply them
  // as one combined map, which is correct for the overwhelmingly common case
  // of a single font or a consistent set of subset encodings.
  const toUnicode = new Map();
  for (const { start, end, dict } of streams) {
    if (!/ToUnicode/.test(dict)) continue;
    const raw = inflateStream(Buffer.from(latin.slice(start, end), 'latin1'), dict);
    if (!raw) continue;
    for (const [code, value] of parseToUnicodeCMap(raw.toString('latin1'))) {
      if (!toUnicode.has(code)) toUnicode.set(code, value);
    }
  }

  const pieces = [];
  for (const content of chunks) {
    // (string) Tj  and  [(a) -250 (b)] TJ, plus the operators that imply a line
    // or paragraph break.
    for (const op of content.matchAll(/\((?:\\.|[^\\()])*\)\s*Tj|\[((?:\\.|[^\\\]])*)\]\s*TJ|\bT\*|\bTd\b|\bTD\b|\bET\b/g)) {
      const token = op[0];

      // The alternation above matches the whole "(...) Tj" run, so the text
      // operator is identified by its suffix, not its first character.
      const isTextShow = /\s*Tj$/.test(token) || /\s*TJ$/.test(token);

      if (isTextShow) {
        const inner = token.replace(/\s*T[Jj]$/, '').trim();
        if (inner.startsWith('[')) {
          for (const part of inner.matchAll(/\((?:\\.|[^\\()])*\)/g)) {
            pieces.push(decodePdfBytes(decodePdfString(part[0].slice(1, -1)), toUnicode));
          }
        } else {
          pieces.push(decodePdfBytes(decodePdfString(inner.slice(1, -1)), toUnicode));
        }
        pieces.push(' ');
        continue;
      }

      if (/^(T\*|Td|TD|ET)$/.test(token)) pieces.push('\n');
    }
  }

  return pieces
    .join('')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// ─── Public entry point ───────────────────────────────────────────────────────

export const extractTextFromBuffer = async (buffer, mimeType = '', fileName = '') => {
  const ext = String(fileName || '').split('.').pop()?.toLowerCase() || '';
  const type = String(mimeType).toLowerCase();

  const isDocx = ext === 'docx' || type.includes('wordprocessingml');
  const isPdf = ext === 'pdf' || type === 'application/pdf';
  const isText = TEXT_EXTENSIONS.has(ext) || type.startsWith('text/') || type.includes('json');

  if (!isDocx && !isPdf && !isText) {
    throw new ApiError(
      400,
      `Unsupported file type "${ext || type}". Upload a TXT, MD, CSV, JSON, DOCX or text-based PDF syllabus.`
    );
  }

  // Magic-number check: a renamed binary must be rejected rather than decoded
  // into meaningless characters.
  if (isPdf && buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new ApiError(400, 'The uploaded file is not a valid PDF (missing %PDF header).');
  }
  if (isDocx && buffer.subarray(0, 2).toString('latin1') !== 'PK') {
    throw new ApiError(400, 'The uploaded file is not a valid DOCX (missing ZIP header).');
  }

  let text;
  if (isDocx) {
    text = await extractTextFromDocx(buffer);
  } else if (isPdf) {
    text = extractPdfText(buffer);
  } else {
    text = extractPlainText(buffer);
  }

  const cleaned = text.replace(/\0/g, '').trim();

  if (!cleaned) {
    if (isPdf) {
      throw new ApiError(
        422,
        'No text could be extracted from this PDF. It is most likely a scanned image; upload a text-based PDF, a DOCX, or a TXT file instead.'
      );
    }
    throw new ApiError(422, 'The uploaded file does not contain any readable text.');
  }

  if (Buffer.byteLength(cleaned, 'utf-8') > env.MAX_UPLOAD_BYTES) {
    throw new ApiError(413, 'The extracted text exceeds the maximum supported size.');
  }

  return cleaned;
};
