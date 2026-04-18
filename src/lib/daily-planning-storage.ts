import { getD1Database } from '@/lib/d1';
import type { DailyPlanningSnapshot } from '@/lib/ai/daily-planning';
import type { RemoteUserWorkspace } from '@/lib/remote-user-data';

type SnapshotRow = {
  clerk_user_id: string;
  snapshot_date: string;
  run_id: string;
  snapshot_json: string;
  created_at: string;
  updated_at: string;
};

type WorkspaceRow = {
  clerk_user_id: string;
  workspace_json: string | null;
  updated_at: string | null;
};

export async function saveDailyPlanningSnapshot(userId: string, snapshot: DailyPlanningSnapshot) {
  const db = getD1Database();
  if (!db) {
    throw new Error('Cloudflare D1 binding WEALIX_DB is not configured.');
  }

  await db.prepare(`
    INSERT INTO daily_planning_snapshots (
      clerk_user_id, snapshot_date, run_id, snapshot_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(clerk_user_id, snapshot_date) DO UPDATE SET
      run_id = excluded.run_id,
      snapshot_json = excluded.snapshot_json,
      updated_at = CURRENT_TIMESTAMP
  `)
    .bind(userId, snapshot.snapshot_date, snapshot.run_id, JSON.stringify(snapshot))
    .run();

  return snapshot;
}

export async function loadLatestDailyPlanningSnapshot(userId: string) {
  const db = getD1Database();
  if (!db) {
    throw new Error('Cloudflare D1 binding WEALIX_DB is not configured.');
  }

  const row = await db.prepare(`
    SELECT clerk_user_id, snapshot_date, run_id, snapshot_json, created_at, updated_at
    FROM daily_planning_snapshots
    WHERE clerk_user_id = ?
    ORDER BY snapshot_date DESC
    LIMIT 1
  `)
    .bind(userId)
    .first<SnapshotRow>();

  return row?.snapshot_json ? (JSON.parse(row.snapshot_json) as DailyPlanningSnapshot) : null;
}

export async function loadDailyPlanningSnapshotByDate(userId: string, snapshotDate: string) {
  const db = getD1Database();
  if (!db) {
    throw new Error('Cloudflare D1 binding WEALIX_DB is not configured.');
  }

  const row = await db.prepare(`
    SELECT snapshot_json
    FROM daily_planning_snapshots
    WHERE clerk_user_id = ? AND snapshot_date = ?
    LIMIT 1
  `)
    .bind(userId, snapshotDate)
    .first<{ snapshot_json: string | null }>();

  return row?.snapshot_json ? (JSON.parse(row.snapshot_json) as DailyPlanningSnapshot) : null;
}

export async function listLiveWorkspacesForDailyPlanning() {
  const db = getD1Database();
  if (!db) {
    throw new Error('Cloudflare D1 binding WEALIX_DB is not configured.');
  }

  const rows = await db.prepare(`
    SELECT clerk_user_id, workspace_json, updated_at
    FROM user_app_profiles
    WHERE workspace_json IS NOT NULL
  `).all<WorkspaceRow>();

  return rows.results.flatMap((row) => {
    if (!row.workspace_json) {
      return [];
    }

    const workspace = JSON.parse(row.workspace_json) as RemoteUserWorkspace;
    if (workspace.appMode !== 'live') {
      return [];
    }

    return [{
      userId: row.clerk_user_id,
      workspace,
      updatedAt: row.updated_at,
    }];
  });
}
