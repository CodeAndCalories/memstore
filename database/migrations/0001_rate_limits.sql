-- Persist rate-limit counters in Supabase so they survive Railway redeploys
-- and are shared across instances. Prefix `memstore_` to avoid collision
-- with other applications sharing the same Supabase project.
--
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS memstore_rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS memstore_rate_limits_window_start_idx
  ON memstore_rate_limits (window_start);

-- Atomic check-and-increment in a single statement.
-- If the existing row's window_start is older than p_window_seconds, reset
-- count to 1 and window_start to NOW(). Otherwise increment count.
-- Returns whether the request is allowed under p_limit, the new count, and
-- the remaining budget for this window.
CREATE OR REPLACE FUNCTION memstore_rate_limit_check(
  p_key            TEXT,
  p_window_seconds INTEGER,
  p_limit          INTEGER
)
RETURNS TABLE (allowed BOOLEAN, count INTEGER, remaining INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO memstore_rate_limits AS r (key, count, window_start)
  VALUES (p_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds)
      THEN 1
      ELSE r.count + 1
    END,
    window_start = CASE
      WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds)
      THEN NOW()
      ELSE r.window_start
    END
  RETURNING r.count INTO v_count;

  RETURN QUERY SELECT
    (v_count <= p_limit)            AS allowed,
    v_count                         AS count,
    GREATEST(p_limit - v_count, 0)  AS remaining;
END;
$$;
