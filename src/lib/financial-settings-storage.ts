import { getD1Database } from '@/lib/d1';
import { getE2EStorageDir, isE2EAuthEnabled } from '@/lib/e2e-auth';
import {
  DEFAULT_FINANCIAL_SETTINGS,
  mergeFinancialSettings,
  sanitizeFinancialSettings,
  type FinancialSettings,
  type FinancialSettingsPatch,
} from '@/lib/financial-settings';

type FinancialSettingsRow = {
  settings_json: string | null;
  updated_at: string | null;
};

export type FinancialSettingsRecord = {
  settings: FinancialSettings | null;
  updatedAt: string | null;
};

function getE2EFilePath(clerkUserId: string) {
  return `${getE2EStorageDir()}/financial-settings-${clerkUserId}.json`;
}

async function readE2EFinancialSettings(clerkUserId: string): Promise<FinancialSettingsRecord> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const filePath = path.join(process.cwd(), getE2EFilePath(clerkUserId));

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as FinancialSettingsRecord;
    return {
      settings: parsed.settings ? sanitizeFinancialSettings(parsed.settings) : null,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { settings: null, updatedAt: null };
    }
    throw error;
  }
}

async function writeE2EFinancialSettings(
  clerkUserId: string,
  settings: FinancialSettings
): Promise<FinancialSettingsRecord> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const filePath = path.join(process.cwd(), getE2EFilePath(clerkUserId));
  const nextRecord: FinancialSettingsRecord = {
    settings,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(nextRecord, null, 2), 'utf8');
  return nextRecord;
}

export function isFinancialSettingsStorageConfigured() {
  return Boolean(getD1Database()) || isE2EAuthEnabled();
}

export async function getStoredFinancialSettings(
  clerkUserId: string
): Promise<FinancialSettingsRecord> {
  const db = getD1Database();

  if (!db) {
    if (isE2EAuthEnabled()) {
      return readE2EFinancialSettings(clerkUserId);
    }

    return { settings: null, updatedAt: null };
  }

  const row = await db
    .prepare('SELECT settings_json, updated_at FROM user_financial_settings WHERE clerk_user_id = ? LIMIT 1')
    .bind(clerkUserId)
    .first<FinancialSettingsRow>();

  if (!row?.settings_json) {
    return { settings: null, updatedAt: null };
  }

  return {
    settings: sanitizeFinancialSettings(JSON.parse(row.settings_json)),
    updatedAt: row.updated_at ?? null,
  };
}

export async function saveFinancialSettings(
  clerkUserId: string,
  patch: FinancialSettingsPatch,
  baseSettings?: FinancialSettings
): Promise<FinancialSettingsRecord> {
  const existing = await getStoredFinancialSettings(clerkUserId);
  const nextSettings = mergeFinancialSettings(
    existing.settings ?? baseSettings ?? DEFAULT_FINANCIAL_SETTINGS,
    patch
  );
  const db = getD1Database();

  if (!db) {
    if (isE2EAuthEnabled()) {
      return writeE2EFinancialSettings(clerkUserId, nextSettings);
    }

    return {
      settings: nextSettings,
      updatedAt: new Date().toISOString(),
    };
  }

  await db
    .prepare(`
      INSERT INTO user_financial_settings (clerk_user_id, settings_json, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(clerk_user_id) DO UPDATE SET
        settings_json = excluded.settings_json,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(clerkUserId, JSON.stringify(nextSettings))
    .run();

  return getStoredFinancialSettings(clerkUserId);
}
