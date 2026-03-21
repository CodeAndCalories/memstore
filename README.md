# AgentMemory

Persistent memory API for AI agents. POST to remember, GET to recall semantically.

## Stack
- Node.js + Express
- Supabase (pgvector for semantic search)
- OpenAI text-embedding-3-small
- Railway (deployment)
- Stripe (billing)

## Setup

1. Copy `.env.example` to `.env` and fill in your keys
2. In Supabase SQL editor: run `database/schema.sql` then `database/functions.sql`
3. Enable pgvector in Supabase: Dashboard → Database → Extensions → vector
4. `npm install`
5. `npm run dev`

## API

```
POST /v1/agents              — create agent + get API key
POST /v1/memory/remember     — store a memory
GET  /v1/memory/recall?q=... — semantic search
DEL  /v1/memory/forget/:id   — delete a memory
GET  /v1/memory/list         — list all memories
```

## Deploy to Railway
Same flow as CallRelayHQ:
- Push to GitHub
- Connect repo in Railway
- Add env vars
- Deploy

---

## Claude Code prompt to continue

Paste this into Claude Code to continue development:

```
I'm building AgentMemory — a persistent memory API for AI agents.
Stack: Node.js + Express + Supabase pgvector + OpenAI embeddings.

Project is set up at ./agentmemory with:
- backend/server.js (Express entry)
- backend/routes/memory.js (remember/recall/forget/list)
- backend/routes/agents.js (create agent + API key)
- backend/services/memory.js (pgvector logic)
- backend/services/embed.js (OpenAI embeddings)
- backend/middleware/auth.js (Bearer key validation)
- database/schema.sql + functions.sql (run in Supabase)

Next tasks:
1. npm install and verify server starts
2. Test POST /v1/agents creates an agent and returns API key
3. Test POST /v1/memory/remember stores a memory
4. Test GET /v1/memory/recall?q=... returns semantically similar memories
5. Add Stripe webhook for plan upgrades (starter/pro)
6. Deploy to Railway
```
