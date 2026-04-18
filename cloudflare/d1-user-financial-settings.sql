-- User Financial Settings
-- Stores currency, locale, and financial preferences
CREATE TABLE IF NOT EXISTS user_financial_settings (
  clerk_user_id TEXT PRIMARY KEY,
  currency TEXT NOT NULL DEFAULT 'SAR',
  locale TEXT NOT NULL DEFAULT 'en',
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
