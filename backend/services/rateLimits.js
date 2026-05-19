const supabase = require('../config/supabase');

// Atomic check-and-increment backed by the memstore_rate_limit_check Postgres
// function (see database/migrations/0001_rate_limits.sql). The increment and
// window-rollover happen inside a single statement, so concurrent requests
// can't race.
//
// Fails open on Supabase errors — we'd rather let traffic through than 5xx
// every request if the DB hiccups. Errors are logged loudly so they're
// visible in Railway logs.
async function checkAndIncrement(key, windowSeconds, limit) {
  const { data, error } = await supabase.rpc('memstore_rate_limit_check', {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error) {
    console.error(`[RATE_LIMIT] supabase error key=${key}:`, error.message);
    return { allowed: true, count: 0, remaining: limit };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const result = {
    allowed: !!row?.allowed,
    count: row?.count ?? 0,
    remaining: row?.remaining ?? 0,
  };

  console.log(`[RATE_LIMIT] key=${key} count=${result.count} allowed=${result.allowed}`);
  return result;
}

module.exports = { checkAndIncrement };
