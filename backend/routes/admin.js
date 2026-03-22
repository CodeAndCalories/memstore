const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Simple admin token auth middleware
function adminAuth(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid admin token.' });
  }
  next();
}

// GET /v1/admin/agents — list all agents
router.get('/agents', adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, owner_email, plan, ops_used, ops_limit, api_key_prefix, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('admin agents error:', error.message);
    return res.status(500).json({ error: 'server_error', message: error.message });
  }

  res.json({ agents: data, total: data.length });
});

module.exports = router;
