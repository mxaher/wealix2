import { getD1Database, type D1LikeDatabase } from '@/lib/d1';
import { getE2EStorageDir, isE2EAuthEnabled } from '@/lib/e2e-auth';
import type {
  AppMode,
  AssetEntry,
  BudgetLimit,
  ExpenseEntry,
  IncomeEntry,
  LiabilityEntry,
  NotificationItem,
  NotificationPreferences,
  OneTimeExpense,
  InvestmentDecisionRecord,
  PortfolioAnalysisRecord,
  PortfolioHolding,
  ReceiptScanResult,
  RecurringObligation,
  SavingsAccount,
} from '@/store/useAppStore';
import type { StartPage } from '@/lib/start-page';

export type RemoteUserWorkspace = {
  appMode: AppMode;
  startPage: StartPage;
  notificationPreferences: NotificationPreferences;
  notificationFeed: NotificationItem[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  receiptScans: ReceiptScanResult[];
  portfolioHoldings: PortfolioHolding[];
  portfolioAnalysisHistory: PortfolioAnalysisRecord[];
  investmentDecisionHistory: InvestmentDecisionRecord[];
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  budgetLimits: BudgetLimit[];
  recurringObligations?: RecurringObligation[];
  oneTimeExpenses?: OneTimeExpense[];
  savingsAccounts?: SavingsAccount[];
};

export type RemoteWorkspaceRecord = {
  workspace: RemoteUserWorkspace | null;
  updatedAt: string | null;
};

type WorkspaceRow = {
  workspace_json: string | null;
  updated_at: string | null;
};

export function isRemotePersistenceConfigured() {
  return Boolean(getD1Database()) || isE2EAuthEnabled();
}

async function readE2EWorkspace(clerkUserId: string): Promise<RemoteWorkspaceRecord> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const baseDir = path.join(process.cwd(), getE2EStorageDir());
  const filePath = path.join(baseDir, `${clerkUserId}.json`);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as RemoteWorkspaceRecord;
    return {
      workspace: parsed.workspace ?? null,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        workspace: null,
        updatedAt: null,
      };
    }
    throw error;
  }
}

async function writeE2EWorkspace(
  clerkUserId: string,
  workspace: RemoteUserWorkspace,
  knownUpdatedAt?: string | null
): Promise<RemoteWorkspaceRecord> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const baseDir = path.join(process.cwd(), getE2EStorageDir());
  const filePath = path.join(baseDir, `${clerkUserId}.json`);
  const existing = await readE2EWorkspace(clerkUserId);

  if (knownUpdatedAt && existing.updatedAt && existing.updatedAt !== knownUpdatedAt) {
    return existing;
  }

  const nextRecord: RemoteWorkspaceRecord = {
    workspace,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(baseDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(nextRecord, null, 2), 'utf8');
  return nextRecord;
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

export async function loadRemoteWorkspace(clerkUserId: string): Promise<RemoteWorkspaceRecord> {
  const db = getD1Database();

  if (!db) {
    if (isE2EAuthEnabled()) {
      return readE2EWorkspace(clerkUserId);
    }

    throw new Error('Cloudflare D1 binding WEALIX_DB is not configured.');
  }

  await ensureWorkspaceTable(db);

  const row = await db
    .prepare('SELECT workspace_json, updated_at FROM user_app_profiles WHERE clerk_user_id = ? LIMIT 1')
    .bind(clerkUserId)
    .first<WorkspaceRow>();

  if (!row?.workspace_json) {
    return {
      workspace: null,
      updatedAt: null,
    };
  }

  return {
    workspace: JSON.parse(row.workspace_json) as RemoteUserWorkspace,
    updatedAt: row.updated_at ?? null,
  };
}

export async function saveRemoteWorkspace(
  clerkUserId: string,
  workspace: RemoteUserWorkspace,
  knownUpdatedAt?: string | null
): Promise<RemoteWorkspaceRecord> {
  if (workspace.appMode !== 'live') {
    console.warn('[user-data] blocked non-live workspace persistence attempt', {
      clerkUserId,
      appMode: workspace.appMode,
    });
    throw new Error('Refusing to persist non-live workspace data.');
  }

  const db = getD1Database();

  if (!db) {
    if (isE2EAuthEnabled()) {
      return writeE2EWorkspace(clerkUserId, workspace, knownUpdatedAt);
    }

    throw new Error('Cloudflare D1 binding WEALIX_DB is not configured.');
  }

  await ensureWorkspaceTable(db);

  const existing = await db
    .prepare('SELECT workspace_json, updated_at FROM user_app_profiles WHERE clerk_user_id = ? LIMIT 1')
    .bind(clerkUserId)
    .first<WorkspaceRow>();

  if (knownUpdatedAt && existing?.updated_at && existing.updated_at !== knownUpdatedAt) {
    return {
      workspace: existing.workspace_json ? (JSON.parse(existing.workspace_json) as RemoteUserWorkspace) : null,
      updatedAt: existing.updated_at,
    };
  }

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

  const saved = await db
    .prepare('SELECT workspace_json, updated_at FROM user_app_profiles WHERE clerk_user_id = ? LIMIT 1')
    .bind(clerkUserId)
    .first<WorkspaceRow>();

  return {
    workspace: saved?.workspace_json ? (JSON.parse(saved.workspace_json) as RemoteUserWorkspace) : workspace,
    updatedAt: saved?.updated_at ?? null,
  };
}
