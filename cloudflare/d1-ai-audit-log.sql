-- AI Audit Log
-- Security audit trail for AI interactions and prompt injection detection
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL,
  route TEXT NOT NULL,
  detected_prompt_injection INTEGER NOT NULL DEFAULT 0,
  truncated INTEGER NOT NULL DEFAULT 0,
  input_sample TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_user ON ai_audit_log(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_created ON ai_audit_log(created_at);
