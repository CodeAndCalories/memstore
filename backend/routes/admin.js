const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const supabase = require('../config/supabase');

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests. Try again later.' },
});

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
router.get('/agents', adminLimiter, adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, owner_email, plan, ops_used, ops_limit, api_key_prefix, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('admin agents error:', error.message);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }

  res.json({ agents: data, total: data.length });
});

module.exports = router;
