# Memstore

**Persistent memory API for AI agents.**

Give your AI agents a long-term memory — store what they learn, recall it semantically, and scope it by session. One API key, five endpoints, works with any agent framework.

🔗 [memstore.dev](https://memstore.dev)

---

## For Acquirers

**Status:** Production-quality code, marketing site live at https://memstore.dev. API is **not currently hosted** — code runs locally / dev-only. Buyer ships it to Railway/Fly in ~1 day. Strong bundle-sell candidate with ai-hub (aihubdash.com).

### Quickstart (5 lines)
```bash
git clone https://github.com/CodeAndCalories/memstore.git && cd memstore
npm install
cp .env.example .env       # fill values (see "Required env vars" below)
psql < database/schema.sql # or paste into Supabase SQL editor — also creates pgvector RPCs
npm start                  # http://localhost:3000
```

Deploy: push to Railway (uses `railway.json` healthcheck at `/health` + `Procfile`) or build with the included `Dockerfile`. Buyer can `wrangler` / `fly launch` / Render-deploy with the same start command.

### Tech stack
- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS (docs, blog, admin) — served statically from `public/`
- **Database:** Supabase (Postgres + pgvector extension)
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Email:** Resend (welcome / API-key delivery)
- **Payments:** Stripe (subscription + usage)
- **MCP server:** ships in `backend/mcp-server.js` — usable from Claude Desktop, Cursor, any MCP host
- **SDKs:** Python + Node.js (both 1:1 wrappers around the HTTP API)

### What's working
- Bearer-token auth: bcrypt-hashed API keys with in-memory cache
- `POST /v1/agents` — provisions agent + API key + welcome email via Resend
- `POST /v1/memory/remember` — embeds and stores (10K char limit per memory)
- `GET /v1/memory/recall?q=…` — semantic search via cosine similarity (top_k + threshold params)
- `DELETE /v1/memory/forget/:id` — agent-scoped deletion
- `GET /v1/memory/list` — paginated listing (100 max)
- Stripe webhooks for subscription state + usage logging (ops_used vs ops_limit per plan)
- Per-endpoint rate limiting
- Python SDK (`sdk/python/`) with `from memstore import Memstore` API matching HTTP 1:1
- Node SDK (`sdk/node/`) with `new Memstore({ apiKey })` matching HTTP 1:1
- Native MCP server exposing `remember` / `recall` / `forget` as MCP tools
- 10 SEO blog posts targeting AI-agent-developer keywords (LangChain, CrewAI, AutoGen, vector DB concepts)

### What's broken / incomplete (honest)
- **Not deployed** — `memstore.dev` is marketing-only; API runs locally. Deploy configs are now committed (`railway.json`, `Procfile`, `Dockerfile`) but buyer ships to their own infra
- No paid users / no traction data to show
- No automated test coverage on the API
- Two stray Claude worktree branches alongside `master` — buyer should delete or seller cleans before transfer
- Python + Node SDKs are PyPI/npm-ready but not yet published

### Required env vars

| Variable | What it's for | Where to get |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Database access (with pgvector RPCs) | Supabase → Settings → API |
| `OPENAI_API_KEY` | Embeddings for `remember` / `recall` | platform.openai.com → API keys |
| `RESEND_API_KEY` | Welcome / API-key delivery email | resend.com → API Keys |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID` | Billing | Stripe → Developers |
| `ADMIN_TOKEN` | Authenticates `GET /v1/admin/agents` | Generate any random string |
| `PORT` | Server port (defaults to 3000) | — |

See `.env.example` for the complete list.

### File map — "Want to change X? Edit Y."

| Change | Edit |
|---|---|
| Landing page / docs copy | `public/index.html`, `public/quickstart.html`, `public/guide.html` |
| Add a blog post | `public/blog/*.html` + add card to `public/blog/index.html` + add URL to `public/sitemap.xml` |
| API endpoint behaviour | `backend/routes/memory.js`, `backend/routes/agents.js` |
| Auth / API key hashing | `backend/middleware/auth.js` |
| Stripe webhook behaviour | `backend/routes/webhook.js` |
| Embedding model / dimensions | search for `text-embedding-3-small` in `backend/` |
| pgvector schema or RPC | `database/schema.sql` (re-run on new Supabase project) |
| MCP tools exposed | `backend/mcp-server.js` |
| Python SDK | `sdk/python/memstore/__init__.py` |
| Node SDK | `sdk/node/index.js` |

### Demo screenshots
See `public/screenshots/screenshots-needed.md` for the shot list — capture before listing.

### Domain & hosting status
- **Domain (`memstore.dev`):** Transfers separately. Provide buyer with EPP/auth code on close.
- **Marketing site hosting:** Currently static deploy of `public/` (likely GitHub Pages or similar — confirm before listing). Transfers with the repo.
- **API hosting:** Not deployed yet — buyer chooses Railway/Fly.io/Render. Includes Railway and Docker configs out of the box.
- **Supabase project:** Buyer creates a fresh Supabase project, enables pgvector, runs `database/schema.sql`. Seller's project (if any) is dev-only.
- **Stripe account:** Stays with seller; buyer plugs in own keys.

### Bundle play
This product is the high-end half of a recommended 2-product bundle with [ai-hub / aihubdash.com](https://aihubdash.com) (free multi-AI dashboard). ai-hub already calls `memstore.dev` for optional persistent memory — buying the pair gives a "free dashboard → paid memory" funnel. See `SELL_PREP.md` for combo pricing notes.

---

## What it does

Memstore lets AI agents remember things across conversations. You POST a memory (plain text), and Memstore embeds it with OpenAI and stores it in a vector database. Later, you GET memories back using natural language — it returns the most semantically similar results, not just keyword matches.

---

## Endpoints

```
POST /v1/agents              Create an agent and receive an API key
POST /v1/memory/remember     Store a memory (embedded automatically)
GET  /v1/memory/recall?q=…   Semantic search across stored memories
DEL  /v1/memory/forget/:id   Delete a specific memory
GET  /v1/memory/list         List all memories (paginated)
```

All endpoints (except `/v1/agents`) require:
```
Authorization: Bearer <your_api_key>
```

---

## Quick start

```bash
# 1. Create an agent
curl -X POST https://memstore.dev/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "My Agent", "email": "you@example.com"}'

# 2. Store a memory
curl -X POST https://memstore.dev/v1/memory/remember \
  -H "Authorization: Bearer am_live_..." \
  -H "Content-Type: application/json" \
  -d '{"content": "The user prefers concise answers and uses Python."}'

# 3. Recall semantically
curl "https://memstore.dev/v1/memory/recall?q=what+language+does+the+user+prefer" \
  -H "Authorization: Bearer am_live_..."
```

---

## SDKs

### Python

```bash
pip install memstore
```

```python
from memstore import Memstore
ms = Memstore(api_key="am_live_...")
ms.remember("User prefers concise replies")
memories = ms.recall("user preferences")
```

### Node.js

```bash
npm install memstore
```

```js
const { Memstore } = require('memstore');
const ms = new Memstore({ apiKey: 'am_live_...' });
await ms.remember('User prefers concise replies');
const memories = await ms.recall('user preferences');
```

See [`sdk/python/`](sdk/python/) and [`sdk/node/`](sdk/node/) for full docs.

---

## MCP Server (Claude, Cursor, and other agents)

Memstore ships a native [Model Context Protocol](https://modelcontextprotocol.io/) server so you can give any MCP-compatible agent access to persistent memory as a first-class tool.

### Claude Desktop / Claude Code

Add to your `claude_desktop_config.json` (or `~/.claude/settings.json` for Claude Code):

```json
{
  "mcpServers": {
    "memstore": {
      "command": "node",
      "args": ["/path/to/memstore/backend/mcp-server.js"],
      "env": {
        "MEMSTORE_API_KEY": "am_live_..."
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "memstore": {
      "command": "node",
      "args": ["backend/mcp-server.js"],
      "env": {
        "MEMSTORE_API_KEY": "am_live_..."
      }
    }
  }
}
```

### Tools exposed

| Tool | Description |
|------|-------------|
| `remember(content, session?)` | Store a memory |
| `recall(query, session?, top_k?)` | Semantic search |
| `forget(memory_id)` | Delete a memory by ID |

---

## Stack

- **Node.js + Express** — API server
- **Supabase + pgvector** — vector storage and semantic search
- **OpenAI** — `text-embedding-3-small` for embeddings
- **Railway** — deployment
- **Stripe** — usage-based billing
- **Resend** — transactional email
