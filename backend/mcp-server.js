#!/usr/bin/env node
/**
 * Memstore MCP Server
 *
 * Exposes Memstore as a native tool for Claude, Cursor, and any
 * MCP-compatible agent. Authenticate with your Memstore API key:
 *
 *   MEMSTORE_API_KEY=am_live_... node backend/mcp-server.js
 *
 * Or set MEMSTORE_BASE_URL to point at a self-hosted instance.
 */

require('dotenv').config();
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const API_KEY = process.env.MEMSTORE_API_KEY;
const BASE_URL = process.env.MEMSTORE_BASE_URL || 'https://memstore.dev/v1';

if (!API_KEY) {
  console.error('Error: MEMSTORE_API_KEY environment variable is required.');
  process.exit(1);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return body;
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function remember(content, session) {
  const payload = { content };
  if (session) payload.session = session;
  const result = await apiFetch('/memory/remember', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result;
}

async function recall(query, session, top_k = 5) {
  const params = new URLSearchParams({ q: query, top_k: String(top_k) });
  if (session) params.set('session', session);
  return apiFetch(`/memory/recall?${params}`);
}

async function forget(memory_id) {
  return apiFetch(`/memory/forget/${memory_id}`, { method: 'DELETE' });
}

// ── MCP server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'memstore', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'remember',
      description:
        'Store a memory in Memstore. The memory is embedded automatically and can be retrieved later with semantic search.',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The text to remember (max 10,000 characters).',
          },
          session: {
            type: 'string',
            description:
              'Optional session / user ID to scope this memory. Use the same value in recall() to filter results.',
          },
        },
        required: ['content'],
      },
    },
    {
      name: 'recall',
      description:
        'Semantically search stored memories. Returns the most relevant results for the given query.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural-language search query.',
          },
          session: {
            type: 'string',
            description: 'Optional session / user ID to limit search scope.',
          },
          top_k: {
            type: 'number',
            description: 'Maximum number of memories to return (default 5, max 20).',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'forget',
      description: 'Permanently delete a specific memory by its ID.',
      inputSchema: {
        type: 'object',
        properties: {
          memory_id: {
            type: 'string',
            description: 'The UUID of the memory to delete.',
          },
        },
        required: ['memory_id'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'remember':
        result = await remember(args.content, args.session);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };

      case 'recall':
        result = await recall(args.query, args.session, args.top_k);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };

      case 'forget':
        result = await forget(args.memory_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Memstore MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
