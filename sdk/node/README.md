# memstore (Node.js)

Persistent memory API for AI agents — Node.js SDK.

Store and recall memory across runs in two lines.

## Install

```bash
npm install memstore
```

> Requires Node.js 18+ (uses native `fetch` and private class fields).

## Usage

```js
const { Memstore } = require('memstore');
// or: import { Memstore } from 'memstore';

const ms = new Memstore({ apiKey: 'am_live_...' });

// Store a memory
const mem = await ms.remember('User prefers concise replies and uses Node.js');
console.log(mem.id); // UUID

// Recall relevant memories (semantic search)
const results = await ms.recall('tech stack preferences');
results.forEach(m => console.log(m.content, m.score));

// Scope by user / session
await ms.remember('Prefers Python over JS', { session: 'user_42' });
const scoped = await ms.recall('language preference', { session: 'user_42' });

// List memories
const { memories, total } = await ms.list({ limit: 10 });

// Delete a memory
await ms.forget(mem.id);
```

## API

### `new Memstore({ apiKey, baseUrl? })`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | Your Memstore API key (`am_live_...`) |
| `baseUrl` | `string` | `https://memstore.dev/v1` | Override for self-hosted deployments |

---

### `ms.remember(content, opts?)`

Store a memory. The text is embedded automatically.

| Param | Type | Description |
|-------|------|-------------|
| `content` | `string` | Text to remember (max 10,000 chars) |
| `opts.session` | `string?` | Scope to a user/session ID |
| `opts.metadata` | `object?` | Arbitrary key-value metadata |
| `opts.ttl` | `number?` | Seconds until expiry (e.g. `2592000` = 30 days) |

Returns the stored memory object `{ id, content, session, metadata, created_at }`.

---

### `ms.recall(query, opts?)`

Semantic search over stored memories.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | `string` | **required** | Natural-language search query |
| `opts.session` | `string?` | — | Limit to a session ID |
| `opts.topK` | `number?` | `5` | Max results (max 20) |
| `opts.threshold` | `number?` | `0.5` | Similarity threshold (0–1) |

Returns an array of memory objects, each with a `score` field.

---

### `ms.forget(memoryId)`

Delete a memory by its UUID.

Returns `{ deleted: true, id }`.

---

### `ms.list(opts?)`

List memories in reverse-chronological order.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `opts.session` | `string?` | — | Filter by session ID |
| `opts.limit` | `number?` | `20` | Page size (max 100) |
| `opts.offset` | `number?` | `0` | Pagination offset |

Returns `{ memories, total }`.

---

Get a free API key at [memstore.dev](https://memstore.dev) — 1,000 ops/month, no credit card required.

## License

MIT
