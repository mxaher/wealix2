import { getCloudflareContext } from '@opennextjs/cloudflare';
import type {
  AppMode,
  AssetEntry,
  BudgetLimit,
  ExpenseEntry,
  IncomeEntry,
  LiabilityEntry,
  NotificationItem,
  NotificationPreferences,
  PortfolioAnalysisRecord,
  PortfolioHolding,
  ReceiptScanResult,
} from '@/store/useAppStore';

export type RemoteUserWorkspace = {
  appMode: AppMode;
  notificationPreferences: NotificationPreferences;
  notificationFeed: NotificationItem[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  receiptScans: ReceiptScanResult[];
  portfolioHoldings: PortfolioHolding[];
  portfolioAnalysisHistory: PortfolioAnalysisRecord[];
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  budgetLimits: BudgetLimit[];
};

type D1LikeDatabase = {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => {
      first: <T = unknown>() => Promise<T | null>;
      run: () => Promise<unknown>;
    };
    run: () => Promise<unknown>;
  };
};

type WorkspaceRow = {
  workspace_json: string | null;
};

function getD1Database(): D1LikeDatabase | null {
  try {
    const context = getCloudflareContext();
    return (context?.env as Record<string, unknown> | undefined)?.WEALIX_DB as D1LikeDatabase | null;
  } catch {
    return null;
  }
}

export function isRemotePersistenceConfigured() {
  return Boolean(getD1Database());
}

async function ensureWorkspaceTable(db: D1LikeDatabase) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_app_profiles (
      clerk_user_id TEXT PRIMARY KEY,
      workspace_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function loadRemoteWorkspace(clerkUserId: string) {
  const db = getD1Database();

  if (!db) {
    throw new Error('Cloudflare D1 binding WEALIX_DB is not configured.');
  }

  await ensureWorkspaceTable(db);

  const row = await db
    .prepare('SELECT workspace_json FROM user_app_profiles WHERE clerk_user_id = ? LIMIT 1')
    .bind(clerkUserId)
    .first<WorkspaceRow>();

  if (!row?.workspace_json) {
    return null;
  }

  return JSON.parse(row.workspace_json) as RemoteUserWorkspace;
}

export async function saveRemoteWorkspace(clerkUserId: string, workspace: RemoteUserWorkspace) {
  const db = getD1Database();

  if (!db) {
    throw new Error('Cloudflare D1 binding WEALIX_DB is not configured.');
  }

  await ensureWorkspaceTable(db);

  const payload = JSON.stringify(workspace);

  await db
    .prepare(`
      INSERT INTO user_app_profiles (clerk_user_id, workspace_json, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(clerk_user_id) DO UPDATE SET
        workspace_json = excluded.workspace_json,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(clerkUserId, payload)
    .run();

  return workspace;
}
