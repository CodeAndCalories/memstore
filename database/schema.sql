-- AgentMemory Database Schema
-- Run this once in your Supabase SQL editor

-- Enable pgvector extension (one-time)
CREATE EXTENSION IF NOT EXISTS vector;

-- Agents table (one row per API key)
CREATE TABLE IF NOT EXISTS agents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key     TEXT UNIQUE NOT NULL,         -- hashed with bcrypt
  api_key_prefix TEXT NOT NULL,             -- first 8 chars, shown in dashboard
  name        TEXT NOT NULL DEFAULT 'My Agent',
  owner_email TEXT,
  plan        TEXT NOT NULL DEFAULT 'free', -- free | starter | pro
  ops_used    INTEGER NOT NULL DEFAULT 0,
  ops_limit   INTEGER NOT NULL DEFAULT 1000,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Memories table (core table)
CREATE TABLE IF NOT EXISTS memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session     TEXT,                          -- optional scope e.g. "user_8821"
  content     TEXT NOT NULL,
  embedding   VECTOR(1536),                  -- OpenAI text-embedding-3-small
  metadata    JSONB DEFAULT '{}',
  ttl         TIMESTAMPTZ,                   -- null = never expires
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Usage log (for billing + analytics)
CREATE TABLE IF NOT EXISTS usage_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  operation   TEXT NOT NULL,                 -- remember | recall | forget | list | summarize
  tokens_used INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS memories_embedding_idx
  ON memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for fast agent+session lookups
CREATE INDEX IF NOT EXISTS memories_agent_session_idx
  ON memories (agent_id, session);

-- Auto-update updated_at on memories
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cleanup expired memories (run via pg_cron or Railway cron)
-- SELECT cron.schedule('cleanup-expired', '0 * * * *', 
--   'DELETE FROM memories WHERE ttl IS NOT NULL AND ttl < NOW()');

-- Add Stripe columns to agents (run after initial schema)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
