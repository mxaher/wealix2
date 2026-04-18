-- User Financial Settings
-- Stores currency, locale, and financial preferences
CREATE TABLE IF NOT EXISTS user_financial_settings (
  clerk_user_id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
