# Memstore

**Persistent memory API for AI agents.**

Give your AI agents a long-term memory — store what they learn, recall it semantically, and scope it by session. One API key, five endpoints, works with any agent framework.

🔗 [memstore.dev](https://memstore.dev)

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

## Stack

- **Node.js + Express** — API server
- **Supabase + pgvector** — vector storage and semantic search
- **OpenAI** — `text-embedding-3-small` for embeddings
- **Railway** — deployment
- **Stripe** — usage-based billing
