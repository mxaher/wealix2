-- User Onboarding Profiles
-- Stores onboarding state and preferences for authenticated users
CREATE TABLE IF NOT EXISTS user_onboarding_profiles (
  clerk_user_id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  phone TEXT,
  notification_channel TEXT,
  monthly_income REAL,
  risk_tolerance TEXT,
  preferred_markets_json TEXT,
  retirement_age INTEGER,
  current_age INTEGER,
  retirement_goal TEXT,
  onboarding_done INTEGER NOT NULL DEFAULT 0,
  onboarding_skipped INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
