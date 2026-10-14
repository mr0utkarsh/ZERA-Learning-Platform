import zlib from 'zlib';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { extractTextFromBuffer, isSupportedFile } from '../src/utils/fileExtractor.js';
import { ApiError } from '../src/utils/ApiError.js';

const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toContain: (expected) => assert.ok(String(actual).includes(expected), `expected ${JSON.stringify(String(actual))} to contain ${JSON.stringify(expected)}`)
});

/** Builds a minimal but structurally valid DOCX with the given paragraphs. */
const buildDocx = async (paragraphs) => {
  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`)
    .join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('word/document.xml', documentXml);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
};

/** Builds a PDF whose text uses a simple /ToUnicode-mapped font. */
const buildPdf = (lines) => {
  const content = [
    'BT',
    '/F1 12 Tf',
    '72 720 Td',
    ...lines.map((line, i) => `${i > 0 ? '0 -16 Td' : ''}(${escapePdfString(line)}) Tj`),
    'ET'
  ].join('\n');

  const cmap = `begincmap
2 beginbfrange
<0020> <007E> <0020>
<00E9> <00E9> <00E9>
endbfrange
endcmap`;

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /ToUnicode ${objects.length + 2} 0 R >>`);
  const cmapId = add(`<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream`);
  objects[fontId - 1] = objects[fontId - 1].replace(/\/ToUnicode \d+ 0 R/, `/ToUnicode ${cmapId} 0 R`);
  const contentId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const pagesId = add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  void pageId;
  void catalogId;

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
};

const escapePdfString = (value) => value.replace(/([\\()])/g, '\\$1');

describe('fileExtractor', () => {
  describe('plain text', () => {
    it('reads a UTF-8 txt syllabus', async () => {
      const text = await extractTextFromBuffer(Buffer.from('Unit 1\nAlgebra basics', 'utf-8'), 'text/plain', 'syllabus.txt');
      assert.equal(text, 'Unit 1\nAlgebra basics');
    });

    it('strips a UTF-8 BOM so the first heading is clean', async () => {
      const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('Unit 1', 'utf-8')]);
      const text = await extractTextFromBuffer(withBom, 'text/plain', 'a.txt');
      assert.equal(text, 'Unit 1');
    });
  });

  describe('DOCX', () => {
    it('extracts text from a real DOCX package', async () => {
      const docx = await buildDocx(['Physics Syllabus', 'Unit 1: Mechanics', 'Unit 2: Optics']);
      const text = await extractTextFromBuffer(docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'syllabus.docx');
      assert.match(text, /Physics Syllabus/);
      assert.match(text, /Unit 1: Mechanics/);
      assert.match(text, /Unit 2: Optics/);
    });

    it('rejects a file that is not really a DOCX', async () => {
      await assert.rejects(
        () => extractTextFromBuffer(Buffer.from('not a zip file at all'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'fake.docx'),
        (err) => err instanceof ApiError && /not a valid DOCX/i.test(err.message)
      );
    });
  });

  describe('PDF', () => {
    it('extracts text from a PDF with a text layer', async () => {
      const pdf = buildPdf(['Chemistry 101', 'Unit 1 Atoms', 'Unit 2 Moles']);
      const text = await extractTextFromBuffer(pdf, 'application/pdf', 'syllabus.pdf');
      assert.match(text, /Chemistry 101/);
      assert.match(text, /Unit 1 Atoms/);
      assert.match(text, /Unit 2 Moles/);
    });

    it('rejects a renamed non-PDF file instead of returning garbage', async () => {
      // Correct DOCX error text is asserted here to prove the extractor did not
      // silently fall through to a printable-characters fallback.
      await assert.rejects(
        () => extractTextFromBuffer(Buffer.from('plain text pretending to be a pdf'), 'application/pdf', 'broken.pdf'),
        (err) => err instanceof ApiError && /not a valid PDF/i.test(err.message)
      );
    });

    it('reports a text-layer-less PDF rather than returning mojibake', async () => {
      // A PDF with no text operators at all, as produced by a pure scan.
      const imageOnly = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'latin1');
      await assert.rejects(
        () => extractTextFromBuffer(imageOnly, 'application/pdf', 'scan.pdf'),
        (err) => err instanceof ApiError && /No text could be extracted/i.test(err.message)
      );
    });
  });

  describe('file type support', () => {
    it('accepts supported extensions and rejects others', () => {
      assert.equal(isSupportedFile('photo.png', 'image/png'), false);
      assert.equal(isSupportedFile('syllabus.pdf', 'application/pdf'), true);
      assert.equal(isSupportedFile('syllabus.docx'), true);
      assert.equal(isSupportedFile('syllabus.txt'), true);
    });

    it('refuses to decode an unsupported upload', async () => {
      await assert.rejects(
        () => extractTextFromBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image/png', 'a.png'),
        (err) => err instanceof ApiError && /Unsupported file type/i.test(err.message)
      );
    });
  });
});

describe('compressed stream handling', () => {
  it('inflates a zlib stream', () => {
    const original = Buffer.from('syllabus content '.repeat(50), 'utf-8');
    const roundTrip = zlib.inflateSync(zlib.deflateSync(original));
    expect(roundTrip.toString('utf-8')).toBe(original.toString('utf-8'));
  });
});
