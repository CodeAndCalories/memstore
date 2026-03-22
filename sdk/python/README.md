# memstore

Persistent memory API for AI agents. Store and recall memory across runs in two lines.

## Install

```bash
pip install memstore
```

## Usage

```python
from memstore import Memstore

ms = Memstore(api_key="am_live_...")

# Store a memory
ms.remember("User prefers concise replies, works in fintech")

# Recall relevant memories (semantic search)
memories = ms.recall("user preferences")
for m in memories:
    print(m["content"], m["score"])

# Scope by user/session
ms.remember("Prefers Python over JS", session="user_42")
memories = ms.recall("tech stack", session="user_42")
```

## API

- `ms.remember(content, session=None, metadata=None, ttl=None)` — store a memory
- `ms.recall(query, session=None, top_k=5, threshold=0.5)` — semantic search, returns list of memory dicts
- `ms.forget(memory_id)` — delete a memory by ID
- `ms.list(session=None, limit=20)` — list memories in reverse chronological order

Get a free API key at [memstore.dev](https://memstore.dev) — 1,000 ops/month, no credit card required.

## License

MIT
