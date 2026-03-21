const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const memorySvc = require('../services/memory');

// POST /v1/memory/remember
router.post('/remember', auth, async (req, res) => {
  const { content, session, metadata, ttl } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({
      error: 'invalid_content',
      message: 'content is required and must be a string.',
    });
  }

  if (content.length > 10000) {
    return res.status(400).json({
      error: 'content_too_long',
      message: 'content must be under 10,000 characters. Split larger content into multiple memories.',
    });
  }

  try {
    const memory = await memorySvc.remember({
      agentId: req.agent.agentId,
      content,
      session,
      metadata,
      ttl, // seconds until expiry, e.g. 2592000 = 30 days
    });

    await memorySvc.logUsage({ agentId: req.agent.agentId, operation: 'remember' });

    res.status(201).json({
      id: memory.id,
      content: memory.content,
      session: memory.session,
      metadata: memory.metadata,
      created_at: memory.created_at,
    });
  } catch (err) {
    console.error('remember error:', err.message);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /v1/memory/recall?q=...&session=...&top_k=5
router.get('/recall', auth, async (req, res) => {
  const { q, session, top_k, threshold } = req.query;

  if (!q) {
    return res.status(400).json({
      error: 'missing_query',
      message: 'q (query) parameter is required.',
    });
  }

  try {
    const memories = await memorySvc.recall({
      agentId: req.agent.agentId,
      query: q,
      session,
      topK: parseInt(top_k) || 5,
      threshold: parseFloat(threshold) || 0.5,
    });

    await memorySvc.logUsage({ agentId: req.agent.agentId, operation: 'recall' });

    res.json({
      memories,
      count: memories.length,
      query: q,
    });
  } catch (err) {
    console.error('recall error:', err.message);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// DELETE /v1/memory/forget/:id
router.delete('/forget/:id', auth, async (req, res) => {
  try {
    await memorySvc.forget({
      agentId: req.agent.agentId,
      memoryId: req.params.id,
    });

    await memorySvc.logUsage({ agentId: req.agent.agentId, operation: 'forget' });

    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    console.error('forget error:', err.message);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /v1/memory/list?session=...&limit=20&offset=0
router.get('/list', auth, async (req, res) => {
  const { session, limit, offset } = req.query;

  try {
    const result = await memorySvc.list({
      agentId: req.agent.agentId,
      session,
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0,
    });

    await memorySvc.logUsage({ agentId: req.agent.agentId, operation: 'list' });

    res.json(result);
  } catch (err) {
    console.error('list error:', err.message);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

module.exports = router;
