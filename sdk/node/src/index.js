'use strict';

/**
 * Memstore Node.js SDK
 *
 * const { Memstore } = require('memstore');
 * // or: import { Memstore } from 'memstore';
 *
 * const ms = new Memstore({ apiKey: 'am_live_...' });
 */

class Memstore {
  /**
   * @param {object} options
   * @param {string} options.apiKey   - Your Memstore API key (am_live_...)
   * @param {string} [options.baseUrl] - Override the API base URL (default: https://memstore.dev/v1)
   */
  constructor({ apiKey, baseUrl = 'https://memstore.dev/v1' } = {}) {
    if (!apiKey) throw new Error('Memstore: apiKey is required.');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  // ── Internal fetch helper ─────────────────────────────────────────────────

  async #fetch(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const body = await res.json();
    if (!res.ok) {
      const err = new Error(body.message || `Request failed: ${res.status}`);
      err.status = res.status;
      err.code = body.error;
      throw err;
    }
    return body;
  }

  // ── Public methods ────────────────────────────────────────────────────────

  /**
   * Store a memory.
   *
   * @param {string} content         - Text to remember (max 10,000 chars)
   * @param {object} [opts]
   * @param {string} [opts.session]  - Scope to a user/session ID
   * @param {object} [opts.metadata] - Arbitrary key-value metadata
   * @param {number} [opts.ttl]      - Seconds until expiry (e.g. 2592000 = 30 days)
   * @returns {Promise<object>}      - Stored memory object { id, content, session, metadata, created_at }
   */
  async remember(content, { session, metadata, ttl } = {}) {
    if (!content || typeof content !== 'string') {
      throw new TypeError('Memstore.remember: content must be a non-empty string.');
    }
    const payload = { content };
    if (session !== undefined) payload.session = session;
    if (metadata !== undefined) payload.metadata = metadata;
    if (ttl !== undefined) payload.ttl = ttl;
    return this.#fetch('/memory/remember', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Semantically search stored memories.
   *
   * @param {string} query           - Natural-language search query
   * @param {object} [opts]
   * @param {string} [opts.session]  - Limit results to a session ID
   * @param {number} [opts.topK]     - Max results (default 5, max 20)
   * @param {number} [opts.threshold] - Similarity threshold 0–1 (default 0.5)
   * @returns {Promise<object[]>}    - Array of memory objects with a `score` field
   */
  async recall(query, { session, topK = 5, threshold = 0.5 } = {}) {
    if (!query) throw new TypeError('Memstore.recall: query is required.');
    const params = new URLSearchParams({
      q: query,
      top_k: String(topK),
      threshold: String(threshold),
    });
    if (session !== undefined) params.set('session', session);
    const result = await this.#fetch(`/memory/recall?${params}`);
    return result.memories ?? result;
  }

  /**
   * Delete a specific memory by ID.
   *
   * @param {string} memoryId - UUID of the memory to delete
   * @returns {Promise<{ deleted: boolean, id: string }>}
   */
  async forget(memoryId) {
    if (!memoryId) throw new TypeError('Memstore.forget: memoryId is required.');
    return this.#fetch(`/memory/forget/${encodeURIComponent(memoryId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * List memories in reverse-chronological order.
   *
   * @param {object} [opts]
   * @param {string} [opts.session] - Filter by session ID
   * @param {number} [opts.limit]   - Page size (default 20, max 100)
   * @param {number} [opts.offset]  - Pagination offset (default 0)
   * @returns {Promise<{ memories: object[], total: number }>}
   */
  async list({ session, limit = 20, offset = 0 } = {}) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (session !== undefined) params.set('session', session);
    return this.#fetch(`/memory/list?${params}`);
  }
}

module.exports = { Memstore };
module.exports.default = Memstore; // ESM compat
