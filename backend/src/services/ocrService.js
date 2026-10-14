import { env } from '../config/env.js';

/**
 * OCR provider abstraction (Feature 3).
 *
 * Handwriting/scanned-document text extraction is delegated to a configured
 * provider over HTTP. When no provider is configured, OCR is reported as
 * unavailable (503) rather than returning guessed text, so uncertain or
 * unreadable input is never silently turned into fabricated content. A real
 * provider returns text plus a confidence score; a malformed provider response
 * is treated as a failure.
 */
export const ocrService = {
  isConfigured() {
    return Boolean(env.OCR_PROVIDER && env.OCR_API_URL);
  },

  /**
   * Extracts text from an image/scan via the configured provider.
   * @returns {Promise<{ text: string, confidence: number|null, provider: string }>}
   */
  async extractText({ bytes, mimeType, fileName }) {
    if (!this.isConfigured()) {
      const err = new Error('OCR is not configured. Set OCR_PROVIDER and OCR_API_URL to enable handwriting extraction.');
      err.statusCode = 503;
      throw err;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.OCR_TIMEOUT_MS);
    try {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: mimeType || 'image/png' }), fileName || 'scan.png');
      const res = await fetch(env.OCR_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OCR_API_KEY}` },
        body: form,
        signal: controller.signal
      });
      if (!res.ok) {
        const err = new Error(`OCR provider failed (${res.status}).`);
        err.statusCode = 502;
        throw err;
      }
      const data = await res.json().catch(() => null);
      const text = data && (data.text || data.ParsedResults?.[0]?.ParsedText);
      if (typeof text !== 'string') {
        const err = new Error('OCR provider returned no readable text.');
        err.statusCode = 502;
        throw err;
      }
      const confidence = typeof data?.confidence === 'number' ? data.confidence : null;
      return { text: text.trim(), confidence, provider: env.OCR_PROVIDER };
    } catch (error) {
      if (error.name === 'AbortError') {
        const err = new Error('OCR request timed out.');
        err.statusCode = 504;
        throw err;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
};
