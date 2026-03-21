const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

// POST /v1/agents — create a new agent + API key
router.post('/', async (req, res) => {
  const { name, email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email_required', message: 'email is required.' });
  }

  // Generate API key: am_live_<random>
  const rawKey = `am_live_${uuidv4().replace(/-/g, '')}`;
  const prefix = rawKey.slice(0, 16); // "am_live_" (8) + first 8 UUID hex chars = unique
  const hashedKey = await bcrypt.hash(rawKey, 10);

  const { data, error } = await supabase
    .from('agents')
    .insert({
      api_key: hashedKey,
      api_key_prefix: prefix,
      name: name || 'My Agent',
      owner_email: email,
      plan: 'free',
      ops_limit: 1000,
    })
    .select('id, name, owner_email, plan, ops_limit, created_at')
    .single();

  if (error) {
    console.error('create agent error:', error.message);
    return res.status(500).json({ error: 'server_error', message: error.message });
  }

  // Return raw key ONCE — never stored again
  res.status(201).json({
    agent_id: data.id,
    api_key: rawKey, // shown only once
    name: data.name,
    plan: data.plan,
    ops_limit: data.ops_limit,
    message: 'Save your API key — it will not be shown again.',
  });
});

module.exports = router;
