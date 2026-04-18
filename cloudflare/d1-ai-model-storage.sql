-- AI Model Configs and User Preferences
-- Stores available AI models and user preferences
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'standard',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_ai_model_preferences (
  clerk_user_id TEXT PRIMARY KEY,
  preferred_ai_model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
