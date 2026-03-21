-- Run these in Supabase SQL editor after schema.sql

-- Semantic recall function (cosine similarity via pgvector)
CREATE OR REPLACE FUNCTION recall_memories(
  p_agent_id   UUID,
  p_embedding  VECTOR(1536),
  p_session    TEXT DEFAULT NULL,
  p_top_k      INT  DEFAULT 5,
  p_threshold  FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id          UUID,
  content     TEXT,
  session     TEXT,
  metadata    JSONB,
  score       FLOAT,
  created_at  TIMESTAMPTZ
)
LANGUAGE SQL AS $$
  SELECT
    m.id,
    m.content,
    m.session,
    m.metadata,
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

-- Increment ops counter
CREATE OR REPLACE FUNCTION increment_ops(p_agent_id UUID)
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE agents SET ops_used = ops_used + 1 WHERE id = p_agent_id;
$$;
