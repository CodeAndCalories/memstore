-- Idempotency table for Stripe webhook events.
-- Prevents duplicate processing when Stripe retries delivery.
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
