"""Memstore Python SDK — persistent memory API for AI agents."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional


class MemstoreError(Exception):
    """Raised when the Memstore API returns an error response."""

    def __init__(self, status: int, error_code: str, message: str) -> None:
        self.status = status
        self.error_code = error_code
        super().__init__(f"[{status}] {error_code}: {message}")


class Memory:
    """A single stored memory returned by the API."""

    __slots__ = ("id", "content", "session", "metadata", "score", "created_at")

    def __init__(self, data: Dict[str, Any]) -> None:
        self.id: str = data.get("id", "")
        self.content: str = data.get("content", "")
        self.session: Optional[str] = data.get("session")
        self.metadata: Optional[Dict[str, Any]] = data.get("metadata")
        self.score: Optional[float] = data.get("score")
        self.created_at: Optional[str] = data.get("created_at")

    def __repr__(self) -> str:
        score_str = f", score={self.score:.2f}" if self.score is not None else ""
        snippet = self.content[:60] + ("…" if len(self.content) > 60 else "")
        return f"Memory(id={self.id!r}, content={snippet!r}{score_str})"


class Memstore:
    """Python client for the Memstore persistent memory API.

    Usage::

        from memstore import Memstore

        client = Memstore(api_key="am_live_...")

        # Store a memory
        client.remember("User prefers dark mode, uses React")

        # Recall relevant memories
        memories = client.recall("user preferences")
        for m in memories:
            print(m.content, m.score)

        # Scope by session/user
        client.remember("Likes concise replies", session="user_42")
        memories = client.recall("communication style", session="user_42")

    The API key can also be set via the ``MEMSTORE_API_KEY`` environment
    variable instead of passing it explicitly.
    """

    BASE_URL = "https://memstore.dev"

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("MEMSTORE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "api_key is required. Pass it directly or set the "
                "MEMSTORE_API_KEY environment variable."
            )
        self.base_url = (base_url or self.BASE_URL).rstrip("/")

    # ── Internal HTTP helper ───────────────────────────────────────────────

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        body: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        if params:
            filtered = {k: v for k, v in params.items() if v is not None}
            if filtered:
                url += "?" + urllib.parse.urlencode(filtered)

        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {self.api_key}")
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")

        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            try:
                payload = json.loads(exc.read().decode("utf-8"))
            except Exception:
                payload = {}
            raise MemstoreError(
                exc.code,
                payload.get("error", "unknown_error"),
                payload.get("message", str(exc)),
            ) from exc

    # ── Public API ─────────────────────────────────────────────────────────

    def remember(
        self,
        content: str,
        *,
        session: Optional[str] = None,
        ttl: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Memory:
        """Store a memory.

        Args:
            content: The text to store (max 10,000 characters).
            session: Optional session or user ID to scope this memory.
                     Use a user ID to isolate one user's memories from another.
            ttl: Seconds until this memory automatically expires.
                 E.g. ``2592000`` for 30 days. Omit for permanent storage.
            metadata: Optional arbitrary JSON dict to attach to this memory.

        Returns:
            The stored :class:`Memory` object.

        Raises:
            MemstoreError: If the API returns an error (e.g. content too long,
                           invalid API key, or monthly op limit reached).
        """
        body: Dict[str, Any] = {"content": content}
        if session is not None:
            body["session"] = session
        if ttl is not None:
            body["ttl"] = ttl
        if metadata is not None:
            body["metadata"] = metadata
        return Memory(self._request("POST", "/v1/memory/remember", body=body))

    def recall(
        self,
        query: str,
        *,
        session: Optional[str] = None,
        top_k: int = 5,
        threshold: float = 0.5,
    ) -> List[Memory]:
        """Recall the most semantically relevant memories for a query.

        Uses cosine similarity search over stored embeddings — returns relevant
        memories even when the query wording differs from the stored text.

        Args:
            query: Natural language search query.
            session: Scope recall to a specific session or user ID.
            top_k: Maximum number of memories to return. Defaults to ``5``.
            threshold: Minimum cosine similarity score (0.0–1.0). Memories
                       below this threshold are excluded. Defaults to ``0.5``.

        Returns:
            List of :class:`Memory` objects ordered by relevance (highest
            score first).
        """
        params: Dict[str, Any] = {"q": query, "top_k": top_k, "threshold": threshold}
        if session is not None:
            params["session"] = session
        result = self._request("GET", "/v1/memory/recall", params=params)
        return [Memory(m) for m in result.get("memories", [])]

    def forget(self, memory_id: str) -> bool:
        """Delete a specific memory by ID.

        Args:
            memory_id: The ``id`` of the memory to delete.

        Returns:
            ``True`` on success.
        """
        result = self._request("DELETE", f"/v1/memory/forget/{memory_id}")
        return bool(result.get("deleted", False))

    def list(
        self,
        *,
        session: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Memory]:
        """List stored memories in reverse chronological order.

        Args:
            session: Filter to a specific session or user ID.
            limit: Maximum memories to return (max 100). Defaults to ``20``.
            offset: Pagination offset. Defaults to ``0``.

        Returns:
            List of :class:`Memory` objects.
        """
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if session is not None:
            params["session"] = session
        result = self._request("GET", "/v1/memory/list", params=params)
        return [Memory(m) for m in result.get("memories", [])]
