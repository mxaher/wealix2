-- Suggestion Entries (User-submitted suggestions for expenses, income, etc.)
CREATE TABLE IF NOT EXISTS suggestion_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  value_lower TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  meta_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suggestion_entries_type_status
ON suggestion_entries(type, status);

CREATE INDEX IF NOT EXISTS idx_suggestion_entries_type_value_lower
ON suggestion_entries(type, value_lower);

CREATE INDEX IF NOT EXISTS idx_suggestion_entries_user_type_created_at
ON suggestion_entries(submitted_by_user_id, type, created_at);
