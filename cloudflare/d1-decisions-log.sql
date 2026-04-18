-- Investment Decision Log
-- Audit trail for investment decisions made by users
CREATE TABLE IF NOT EXISTS decisions_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL,
  investment_name TEXT NOT NULL,
  investment_type TEXT NOT NULL,
  price REAL NOT NULL,
  payload_json TEXT NOT NULL,
  decision_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decisions_log_user ON decisions_log(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_log_created ON decisions_log(created_at);
