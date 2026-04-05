CREATE TABLE IF NOT EXISTS daily_planning_snapshots (
  clerk_user_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  run_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (clerk_user_id, snapshot_date)
);
