# Memstore

**A persistent memory API for AI agents.** Store what an agent learns, recall it semantically, scope it by session.

> **Status: archived.** The hosted API at `memstore.dev` is no longer running. This repository is preserved as reference code and a case study. `backend/`, `sdk/`, and `database/` are complete and readable — the site in `public/` still documents the API exactly as it shipped.

---

## What it was

Memstore was a hosted memory layer for AI agents. An agent would `POST` a fact it learned during a run, and on any later run `GET` back the facts most semantically relevant to whatever it was doing — across processes, machines, and days. Two endpoints did the real work; the rest was lifecycle and housekeeping.

It was built solo, end to end: REST API, Postgres schema and vector indexing, embeddings pipeline, Stripe billing with webhooks, bcrypt-hashed API-key auth, per-plan rate limiting, an MCP server, two SDKs, and a static marketing/docs site of 22 pages.

## The problem it solved

LLM agents are stateless. Every run starts from zero, so anything learned in run N is gone by run N+1 unless the developer builds persistence themselves. The usual fix — stand up a vector database, pick an embedding model, write chunking and similarity search, handle namespacing and expiry — is a week of infrastructure work before the agent gets any smarter.

The alternatives each solved a different problem than the one agent developers actually had:

- **Vector databases** (Pinecone, ChromaDB, Weaviate) are storage primitives. They give you similarity search, not memory: no session scoping, no expiry, no notion of an agent that owns the data.
- **Building on pgvector directly** works well, but you own the index tuning, the embedding calls, the migrations, and the operational surface.
- **Agent frameworks** ship in-memory or per-process memory that dies with the run.

Memstore's bet was that the right abstraction is two verbs — `remember` and `recall` — with everything else (embedding, indexing, ranking, TTL, isolation) hidden behind them. One API key, one HTTP call, no infrastructure.

## Architecture

```
Agent (any language / framework)
   │  Authorization: Bearer am_live_…
   ▼
Express REST API  ──────────────────────────────┐
   │                                            │
   ├─ auth middleware                           │
   │    bcrypt verify + 60s prefix cache        │
   │    per-plan hourly limit (Postgres)        │
   │    monthly ops quota                       │
   │                                            │
   ├─ POST /v1/memory/remember                  │
   │    └─ OpenAI text-embedding-3-small ──▶ 1536-d vector
   │    └─ INSERT INTO memories                 │
   │                                            │
   └─ GET /v1/memory/recall                     │
        └─ embed(query) ──▶ recall_memories() RPC
                              └─ cosine similarity, ivfflat index
                                                │
Supabase Postgres + pgvector ◀──────────────────┘
Stripe webhooks ──▶ plan / quota updates (idempotent)
```

### Stack

| Layer | Choice |
|---|---|
| API | Node.js + Express, deployed on Railway |
| Database | Supabase Postgres with the `pgvector` extension |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dimensions) |
| Vector index | `ivfflat` with `vector_cosine_ops`, `lists = 100` |
| Auth | Bcrypt-hashed API keys, prefix-based lookup with a 60s in-process cache |
| Billing | Stripe subscriptions, webhooks guarded by a processed-event table |
| Rate limiting | Per-plan hourly counters in Postgres via an atomic check-and-increment RPC |
| Email | Resend (key delivery, usage alerts, upgrade confirmations) |
| Integrations | MCP server (`backend/mcp-server.js`) for Claude Desktop and Cursor |
| SDKs | Python and Node, both thin wrappers over the HTTP API |
| Site | Vanilla HTML/CSS, no build step, served statically from `public/` |

### The recall path

Recall is a single round trip. The API embeds the query and hands the vector to Postgres, which filters, scores, and ranks in one indexed pass — no candidate set is ever shipped back to Node for re-ranking.

```sql
CREATE OR REPLACE FUNCTION recall_memories(
  p_agent_id   UUID,
  p_embedding  VECTOR(1536),
  p_session    TEXT  DEFAULT NULL,
  p_top_k      INT   DEFAULT 5,
  p_threshold  FLOAT DEFAULT 0.5
)
RETURNS TABLE (id UUID, content TEXT, session TEXT,
               metadata JSONB, score FLOAT, created_at TIMESTAMPTZ)
LANGUAGE SQL AS $$
  SELECT
    m.id, m.content, m.session, m.metadata,
    1 - (m.embedding <=> p_embedding) AS score,
    m.created_at
  FROM memories m
  WHERE
    m.agent_id = p_agent_id
    AND (p_session IS NULL OR m.session = p_session)
    AND (m.ttl IS NULL OR m.ttl > NOW())
    AND 1 - (m.embedding <=> p_embedding) >= p_threshold
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_top_k;
$$;
```

`<=>` is pgvector's cosine distance operator, so `1 - distance` produces a similarity score in the same expression that drives the sort. The `ORDER BY` deliberately sorts on raw distance rather than the derived `score` column — that is what lets the ivfflat index serve the query. Ordering by `score DESC` is mathematically identical and forces a sequential scan.

Full source: [`database/functions.sql`](database/functions.sql).

## API

Five endpoints. All authenticated with `Authorization: Bearer <api_key>` except agent creation.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/v1/agents` | Provision an agent, return its API key (shown once), send the welcome email |
| `POST` | `/v1/memory/remember` | Embed and store a memory, with optional `session`, `metadata`, and `ttl` |
| `GET` | `/v1/memory/recall?q=` | Semantic search by cosine similarity, with `top_k` and `threshold` |
| `DELETE` | `/v1/memory/forget/:id` | Delete one memory, scoped to the owning agent |
| `GET` | `/v1/memory/list` | Paginated listing of an agent's memories, filterable by session |

```bash
curl -X POST https://memstore.dev/v1/memory/remember \
  -H "Authorization: Bearer $MEMSTORE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"User prefers dark mode, uses React","session":"user_8821"}'

curl "https://memstore.dev/v1/memory/recall?q=user+settings" \
  -H "Authorization: Bearer $MEMSTORE_API_KEY"
# {"memories":[{"content":"User prefers dark mode, uses React","score":0.97,…}]}
```

## Screenshots

_Screenshots pending — capture list and conventions are in [`screenshots/`](screenshots/)._

<!-- Uncomment each line as the file lands in screenshots/

### Landing page

![Memstore landing page](screenshots/landing-hero.png)

### Documentation

![Quickstart docs](screenshots/quickstart-docs.png)

![API reference](screenshots/api-reference.png)

### The API in use

![remember and recall round trip in a terminal](screenshots/terminal-curl.png)

![Python SDK example](screenshots/python-sdk.png)

### MCP server in Claude Desktop

![Memstore MCP tools listed in Claude Desktop](screenshots/mcp-claude-desktop.png)

### Admin dashboard

![Admin dashboard showing agents and usage](screenshots/admin-dashboard.png)

-->


## What I learned

**pgvector index tuning is a recall-quality decision, not just a speed one.** The `ivfflat` index on `memories.embedding` uses `lists = 100`, which partitions vectors into 100 clusters and probes a subset at query time. That makes it *approximate*: a low `lists` value costs latency, a high one silently drops relevant results because the right cluster never gets probed. The rule of thumb that worked was `lists ≈ rows / 1000`, revisited as the table grew — an index built for 10k rows is wrong at 1M. It also has to be built *after* meaningful data exists; building it on an empty table produces useless centroids that degrade every query until it is reindexed.

**Stripe webhooks are at-least-once, so handlers must be idempotent.** Stripe retries on any non-2xx, and will happily redeliver an event you already processed. Without a guard, a retried `checkout.session.completed` re-runs the upgrade and re-sends the confirmation email. The fix was a `stripe_events` table keyed by `event.id`, checked before the handler switch and written after — cheap, and it makes replay safe. The related trap: the webhook route needs the raw request body for signature verification, so it must be mounted *before* `express.json()` in `server.js`. Mount it after and every signature check fails with a confusing error that looks like a key problem.

**Eager module-scope initialization from `process.env` creates load-order bugs.** `createClient(process.env.SUPABASE_URL, …)` and `require('stripe')(process.env.STRIPE_SECRET_KEY)` run at import time. If the module graph pulls one of these in before dotenv has populated the environment — which is easy to do in tests, scripts, or a re-ordered import — the client is constructed with `undefined` credentials and fails later at call time with an error that points nowhere near the real cause. Initializing lazily behind a getter, or asserting the variables are present at startup, turns a mystifying runtime failure into an immediate, obvious one.

**A key prefix is only a cache key if it is actually unique.** API keys are bcrypt-hashed, so they cannot be looked up by equality; the row is found by a stored plaintext `api_key_prefix`, and the verified result is cached in-process for 60 seconds keyed by that prefix. The bug was that the prefix was too short. Keys are formatted `am_live_<uuid-hex>`, and the literal `am_live_` is already 8 characters — so an 8-character prefix was identical for *every* key in the system. Every request collided on one cache entry, and one agent could be served another agent's cached plan and quota. Widening the prefix to 16 characters (`am_live_` plus the first 8 hex characters of the UUID) restored uniqueness. Bcrypt comparison still runs on every request, so the impact was cached *metadata*, not authentication bypass — but it was a real cross-tenant data leak, and it only appeared once a second key existed. The general lesson: any identifier derived by truncation needs its entropy counted after the constant prefix, not before.

## Repository layout

```
backend/        Express API — routes, auth middleware, services, MCP server
  routes/       agents, memory, admin, newsletter, Stripe webhook
  services/     embed, memory, rateLimits, email
database/       schema.sql, functions.sql (recall RPC), migrations/
sdk/python/     Python client
sdk/node/       Node client
public/         Static site — landing page, docs, guides, blog, comparisons
```

`backend/`, `sdk/`, and `database/` are retained deliberately as reference code. They are not maintained, and the credentials, endpoints, and Stripe products they reference no longer exist.

## Running it locally

The code still runs against your own Supabase project and OpenAI key.

```bash
git clone https://github.com/CodeAndCalories/memstore.git && cd memstore
npm install
cp .env.example .env        # SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY, …
psql < database/schema.sql  # or paste into the Supabase SQL editor
psql < database/functions.sql
npm start                   # http://localhost:3000
```

Stripe, Resend, and the admin dashboard need their own credentials and are optional; the memory endpoints work without them.

---

**Archived August 2026.** Built by [@CodeAndCalories](https://github.com/CodeAndCalories).
