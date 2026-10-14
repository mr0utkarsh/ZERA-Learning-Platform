import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { parseMultipart } from '../src/utils/multipart.js';
import { ApiError } from '../src/utils/ApiError.js';

/** Builds a real multipart/form-data body. */
const buildBody = (boundary, parts) => {
  const chunks = [];
  for (const part of parts) {
    let head = `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"`;
    if (part.filename !== undefined) {
      head += `; filename="${part.filename}"\r\nContent-Type: ${part.contentType || 'application/octet-stream'}`;
    }
    head += '\r\n\r\n';
    chunks.push(Buffer.from(head, 'utf-8'));
    chunks.push(Buffer.isBuffer(part.value) ? part.value : Buffer.from(part.value, 'utf-8'));
    chunks.push(Buffer.from('\r\n', 'utf-8'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));
  return Buffer.concat(chunks);
};

const asRequest = (buffer, boundary) => {
  const stream = Readable.from([buffer]);
  stream.headers = { 'content-type': `multipart/form-data; boundary=${boundary}` };
  return stream;
};

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0x00, 0x7f])
]);

describe('multipart parser', () => {
  it('parses a text field', async () => {
    const boundary = 'X1';
    const body = buildBody(boundary, [{ name: 'fileName', value: 'syllabus.txt' }]);
    const { files, fields } = await parseMultipart(asRequest(body, boundary));
    assert.equal(files.length, 0);
    assert.equal(fields.fileName, 'syllabus.txt');
  });

  it('returns file bytes byte-for-byte, including NULs and high bytes', async () => {
    const boundary = 'X2';
    const body = buildBody(boundary, [
      { name: 'file', filename: 'image.png', contentType: 'image/png', value: PNG_BYTES }
    ]);
    const { files } = await parseMultipart(asRequest(body, boundary));
    assert.equal(files.length, 1);
    assert.equal(files[0].filename, 'image.png');
    assert.equal(files[0].mimetype, 'image/png');
    // This is the exact regression that made the browser upload unusable: the
    // old client-side FileReader path corrupted these bytes.
    assert.deepEqual(files[0].buffer, PNG_BYTES);
    assert.equal(files[0].size, PNG_BYTES.length);
  });

  it('parses several parts in one request', async () => {
    const boundary = 'X3';
    const body = buildBody(boundary, [
      { name: 'fileName', value: 'a.txt' },
      { name: 'file', filename: 'a.txt', contentType: 'text/plain', value: 'Unit 1 Algebra' }
    ]);
    const { files, fields } = await parseMultipart(asRequest(body, boundary));
    assert.equal(fields.fileName, 'a.txt');
    assert.equal(files.length, 1);
    assert.equal(files[0].buffer.toString('utf-8'), 'Unit 1 Algebra');
  });

  it('handles a quoted boundary parameter', async () => {
    const boundary = 'weird--boundary';
    const body = buildBody(boundary, [{ name: 'fileName', value: 'a.txt' }]);
    const stream = Readable.from([body]);
    stream.headers = { 'content-type': `multipart/form-data; boundary="${boundary}"` };
    const { fields } = await parseMultipart(stream);
    assert.equal(fields.fileName, 'a.txt');
  });

  it('rejects a non-multipart request', async () => {
    const stream = Readable.from([Buffer.from('{}')]);
    stream.headers = { 'content-type': 'application/json' };
    await assert.rejects(
      () => parseMultipart(stream),
      (err) => err instanceof ApiError && err.statusCode === 415
    );
  });

  it('enforces the size limit instead of buffering the whole body', async () => {
    const boundary = 'X4';
    const body = buildBody(boundary, [
      { name: 'file', filename: 'big.txt', contentType: 'text/plain', value: 'a'.repeat(50_000) }
    ]);
    await assert.rejects(
      () => parseMultipart(asRequest(body, boundary), { maxBytes: 1024 }),
      (err) => err instanceof ApiError && err.statusCode === 413
    );
  });

  it('enforces the file count limit', async () => {
    const boundary = 'X5';
    const body = buildBody(boundary, [
      { name: 'file', filename: '1.txt', value: 'a' },
      { name: 'file', filename: '2.txt', value: 'b' }
    ]);
    await assert.rejects(
      () => parseMultipart(asRequest(body, boundary), { maxFiles: 1 }),
      (err) => err instanceof ApiError && /At most 1 file/.test(err.message)
    );
  });

  it('rejects a truncated body', async () => {
    const boundary = 'X6';
    const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileName"\r\n\r\nvalue`);
    await assert.rejects(
      () => parseMultipart(asRequest(body, boundary)),
      (err) => err instanceof ApiError && /truncated|no parts/i.test(err.message)
    );
  });
});
