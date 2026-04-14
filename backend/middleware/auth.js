const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');
const { sendUsageAlert } = require('../services/email');

// Cache verified keys in memory to avoid DB hit on every request
const keyCache = new Map(); // prefix -> { agentId, plan, ops_used, ops_limit, email, name }
const CACHE_TTL = 60 * 1000; // 1 minute

// Track which agents have already received an 80% alert this process lifetime.
// Key: `${agentId}:${year}-${month}` — prevents repeated emails on every request.
const alertedAgents = new Set();

function shouldSendUsageAlert(agentId, ops_used, ops_limit) {
  if (!ops_limit || ops_limit === 0) return false;
  const ratio = ops_used / ops_limit;
  if (ratio < 0.8 || ratio >= 1.0) return false; // only in the 80–99% band

  const now = new Date();
  const key = `${agentId}:${now.getFullYear()}-${now.getMonth()}`;
  if (alertedAgents.has(key)) return false;

  alertedAgents.add(key);
  return true;
}

async function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'missing_api_key',
      message: 'Authorization header required: Bearer <api_key>',
      docs: 'https://agentmemory.dev/docs/auth',
    });
  }

  const key = header.replace('Bearer ', '').trim();
  const prefix = key.slice(0, 16);

  // Check cache
  const cached = keyCache.get(prefix);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    const valid = await bcrypt.compare(key, cached.hash);
    if (!valid) return res.status(401).json({ error: 'invalid_api_key', message: 'API key is invalid.' });

    // Check ops limit
    if (cached.ops_used >= cached.ops_limit) {
      return res.status(429).json({
        error: 'ops_limit_reached',
        message: `Monthly operation limit of ${cached.ops_limit} reached. Upgrade your plan.`,
        upgrade_url: 'https://memstore.dev/pricing',
      });
    }

    // Fire 80% alert async — do not await, must not block the request
    if (shouldSendUsageAlert(cached.agentId, cached.ops_used, cached.ops_limit)) {
      sendUsageAlert({
        email: cached.email,
        name: cached.name,
        ops_used: cached.ops_used,
        ops_limit: cached.ops_limit,
        plan: cached.plan,
      });
    }

    req.agent = cached;
    return next();
  }

  // Look up by prefix
  const { data, error } = await supabase
    .from('agents')
    .select('id, api_key, name, email, plan, ops_used, ops_limit')
    .eq('api_key_prefix', prefix)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'invalid_api_key', message: 'API key not found.' });
  }

  const valid = await bcrypt.compare(key, data.api_key);
  if (!valid) {
    return res.status(401).json({ error: 'invalid_api_key', message: 'API key is invalid.' });
  }

  if (data.ops_used >= data.ops_limit) {
    return res.status(429).json({
      error: 'ops_limit_reached',
      message: `Monthly operation limit of ${data.ops_limit} reached. Upgrade your plan.`,
      upgrade_url: 'https://memstore.dev/pricing',
    });
  }

  // Cache it
  keyCache.set(prefix, { ...data, agentId: data.id, hash: data.api_key, ts: Date.now() });
  req.agent = { ...data, agentId: data.id };

  // Fire 80% alert async — do not await, must not block the request
  if (shouldSendUsageAlert(data.id, data.ops_used, data.ops_limit)) {
    sendUsageAlert({
      email: data.email,
      name: data.name,
      ops_used: data.ops_used,
      ops_limit: data.ops_limit,
      plan: data.plan,
    });
  }

  next();
}

// Clear cache entry when a key is rotated
function clearCache(prefix) {
  keyCache.delete(prefix);
}

module.exports = { auth, clearCache };
