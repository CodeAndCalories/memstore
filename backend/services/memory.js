const supabase = require('../config/supabase');
const { embed } = require('./embed');

// Store a memory with embedding
async function remember({ agentId, content, session, metadata, ttl }) {
  const embedding = await embed(content);

  const { data, error } = await supabase
    .from('memories')
    .insert({
      agent_id: agentId,
      content,
      embedding: JSON.stringify(embedding),
      session: session || null,
      metadata: metadata || {},
      ttl: ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null,
    })
    .select('id, content, session, metadata, created_at')
    .single();

  if (error) throw error;
  return data;
}

// Semantic recall via cosine similarity
async function recall({ agentId, query, session, topK = 5, threshold = 0.5 }) {
  const embedding = await embed(query);

  // pgvector cosine similarity via RPC
  const { data, error } = await supabase.rpc('recall_memories', {
    p_agent_id: agentId,
    p_embedding: JSON.stringify(embedding),
    p_session: session || null,
    p_top_k: Math.min(topK, 20),
    p_threshold: threshold,
  });

  if (error) throw error;
  return data;
}

// Delete a specific memory
async function forget({ agentId, memoryId }) {
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId)
    .eq('agent_id', agentId); // scope to agent for safety

  if (error) throw error;
  return { deleted: true };
}

// List all memories for an agent (paginated)
async function list({ agentId, session, limit = 20, offset = 0 }) {
  let query = supabase
    .from('memories')
    .select('id, content, session, metadata, ttl, created_at', { count: 'exact' })
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (session) query = query.eq('session', session);

  const { data, error, count } = await query;
  if (error) throw error;
  return { memories: data, total: count };
}

// Log an operation to usage_log
async function logUsage({ agentId, operation, tokensUsed = 0 }) {
  await supabase.from('usage_log').insert({
    agent_id: agentId,
    operation,
    tokens_used: tokensUsed,
  });

  // Increment ops_used counter
  await supabase.rpc('increment_ops', { p_agent_id: agentId });
}

module.exports = { remember, recall, forget, list, logUsage };
