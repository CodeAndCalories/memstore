# memstore-client

Python SDK for [Memstore](https://memstore.dev) — persistent memory API for AI agents.

Store and recall memory across agent runs with two method calls. Works with LangChain, CrewAI, AutoGen, or any Python agent.

## Install

```bash
pip install memstore-client
```

No dependencies. Requires Python 3.8+.

## Quickstart

```python
from memstore import Memstore

client = Memstore(api_key="am_live_...")
# or set MEMSTORE_API_KEY in your environment

# Store a memory
client.remember("User prefers dark mode, works in fintech")

# Recall relevant memories (semantic search)
memories = client.recall("user preferences")
for m in memories:
    print(m.content, m.score)

# Scope by user/session
client.remember("Prefers concise replies", session="user_42")
memories = client.recall("communication style", session="user_42")
```

## API

### `Memstore(api_key, base_url=None)`

```python
client = Memstore(api_key="am_live_...")
```

`api_key` can also be set via the `MEMSTORE_API_KEY` environment variable.

---

### `remember(content, *, session=None, ttl=None, metadata=None) → Memory`

Store a memory.

| Param | Type | Description |
|-------|------|-------------|
| `content` | `str` | Text to store (max 10,000 chars) |
| `session` | `str` | Optional user/session ID to scope this memory |
| `ttl` | `int` | Seconds until expiry (e.g. `2592000` = 30 days) |
| `metadata` | `dict` | Optional arbitrary JSON metadata |

```python
mem = client.remember(
    "User is building a fintech app",
    session="user_123",
    ttl=2592000,  # 30 days
)
print(mem.id)  # "mem_k9x2..."
```

---

### `recall(query, *, session=None, top_k=5, threshold=0.5) → list[Memory]`

Recall the most semantically relevant memories for a query.

| Param | Type | Description |
|-------|------|-------------|
| `query` | `str` | Natural language search query |
| `session` | `str` | Scope to a specific user/session |
| `top_k` | `int` | Max memories to return (default `5`) |
| `threshold` | `float` | Min cosine similarity 0–1 (default `0.5`) |

```python
memories = client.recall("user preferences", session="user_123", top_k=3)
context = "\n".join(m.content for m in memories)
```

---

### `forget(memory_id) → bool`

Delete a memory by ID.

```python
client.forget("mem_k9x2...")
```

---

### `list(*, session=None, limit=20, offset=0) → list[Memory]`

List memories in reverse chronological order.

```python
all_memories = client.list(session="user_123", limit=50)
```

---

### `Memory` object

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | `str` | Unique memory ID |
| `content` | `str` | Stored text |
| `session` | `str \| None` | Session/user scope |
| `score` | `float \| None` | Cosine similarity (recall only) |
| `metadata` | `dict \| None` | Attached metadata |
| `created_at` | `str \| None` | ISO 8601 timestamp |

---

### `MemstoreError`

Raised on API errors. Attributes: `status` (HTTP code), `error_code` (machine-readable string), `args[0]` (human-readable message).

```python
from memstore import MemstoreError

try:
    client.remember("...")
except MemstoreError as e:
    print(e.status, e.error_code)  # e.g. 429, "ops_limit_reached"
```

## LangChain example

```python
from langchain.chat_models import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from memstore import Memstore

client = Memstore()  # reads MEMSTORE_API_KEY
llm = ChatOpenAI(model="gpt-4o-mini")

def chat(user_id: str, message: str) -> str:
    # Inject relevant memories into system prompt
    memories = client.recall(message, session=user_id)
    context = "\n".join(f"- {m.content}" for m in memories)

    response = llm([
        SystemMessage(content=f"User context:\n{context or 'None yet.'}"),
        HumanMessage(content=message),
    ]).content

    client.remember(message, session=user_id)
    return response
```

## CrewAI example

```python
from crewai import Agent, Task, Crew
from memstore import Memstore

client = Memstore()

def run_crew(project_id: str, goal: str) -> str:
    past = client.recall(goal, session=project_id)
    context = "\n".join(f"- {m.content}" for m in past)

    agent = Agent(
        role="Researcher",
        goal=goal,
        backstory=f"Prior context:\n{context or 'First run.'}",
    )
    task = Task(description=goal, agent=agent, expected_output="Summary")
    result = Crew(agents=[agent], tasks=[task]).kickoff()

    client.remember(f"Result: {str(result)[:200]}", session=project_id)
    return str(result)
```

## Get an API key

Free tier — 1,000 ops/month, no credit card required.

→ [memstore.dev](https://memstore.dev)

## License

MIT
