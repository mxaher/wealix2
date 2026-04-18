-- Stripe Webhook Events (Idempotency Log)
-- Tracks processed webhook events to prevent duplicate side effects
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  customer_id TEXT,
  subscription_id TEXT,
  processed_at INTEGER NOT NULL
);

-- Index for faster lookups by customer/subscription
CREATE INDEX IF NOT EXISTS idx_stripe_events_customer ON stripe_webhook_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_subscription ON stripe_webhook_events(subscription_id);
