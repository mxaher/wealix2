import { getD1Database, type D1LikeDatabase } from '@/lib/d1';
import { getE2EStorageDir, isE2EAuthEnabled } from '@/lib/e2e-auth';

export type OnboardingProfileRecord = {
  clerkUserId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  notificationChannel: string | null;
  monthlyIncome: number | null;
  riskTolerance: string | null;
  preferredMarkets: string[] | null;
  retirementAge: number | null;
  currentAge: number | null;
  retirementGoal: string | null;
  onboardingDone: boolean;
  onboardingSkipped: boolean;
  updatedAt: string | null;
};

type OnboardingRow = {
  clerk_user_id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  notification_channel: string | null;
  monthly_income: number | null;
  risk_tolerance: string | null;
  preferred_markets_json: string | null;
  retirement_age: number | null;
  current_age: number | null;
  retirement_goal: string | null;
  onboarding_done: number | boolean | null;
  onboarding_skipped: number | boolean | null;
  updated_at: string | null;
};

export type SaveOnboardingProfileInput = {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  notificationChannel?: string | null;
  monthlyIncome?: number | null;
  riskTolerance?: string | null;
  preferredMarkets?: string[] | null;
  retirementAge?: number | null;
  currentAge?: number | null;
  retirementGoal?: string | null;
  onboardingDone: boolean;
  onboardingSkipped?: boolean;
};

function normalizeBoolean(value: number | boolean | null | undefined) {
  return value === true || value === 1;
}

function parsePreferredMarkets(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : null;
  } catch {
    return null;
  }
}

function toRecord(row: OnboardingRow): OnboardingProfileRecord {
  return {
    clerkUserId: row.clerk_user_id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    notificationChannel: row.notification_channel,
    monthlyIncome: typeof row.monthly_income === 'number' ? row.monthly_income : null,
    riskTolerance: row.risk_tolerance,
    preferredMarkets: parsePreferredMarkets(row.preferred_markets_json),
    retirementAge: typeof row.retirement_age === 'number' ? row.retirement_age : null,
    currentAge: typeof row.current_age === 'number' ? row.current_age : null,
    retirementGoal: row.retirement_goal,
    onboardingDone: normalizeBoolean(row.onboarding_done),
    onboardingSkipped: normalizeBoolean(row.onboarding_skipped),
    updatedAt: row.updated_at,
  };
}

// Table created via migration: cloudflare/d1-user-onboarding-profiles.sql

function getE2EFilePath(clerkUserId: string) {
  return `${getE2EStorageDir()}/onboarding-${clerkUserId}.json`;
}

async function readE2EOnboardingProfile(clerkUserId: string): Promise<OnboardingProfileRecord | null> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const filePath = path.join(process.cwd(), getE2EFilePath(clerkUserId));

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as OnboardingProfileRecord;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeE2EOnboardingProfile(
  clerkUserId: string,
  input: SaveOnboardingProfileInput
): Promise<OnboardingProfileRecord> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const filePath = path.join(process.cwd(), getE2EFilePath(clerkUserId));
  const existing = await readE2EOnboardingProfile(clerkUserId);
  const nextRecord: OnboardingProfileRecord = {
    clerkUserId,
    email: input.email ?? existing?.email ?? null,
    name: input.name ?? existing?.name ?? null,
    phone: input.phone ?? existing?.phone ?? null,
    notificationChannel: input.notificationChannel ?? existing?.notificationChannel ?? null,
    monthlyIncome: input.monthlyIncome ?? existing?.monthlyIncome ?? null,
    riskTolerance: input.riskTolerance ?? existing?.riskTolerance ?? null,
    preferredMarkets: input.preferredMarkets ?? existing?.preferredMarkets ?? null,
    retirementAge: input.retirementAge ?? existing?.retirementAge ?? null,
    currentAge: input.currentAge ?? existing?.currentAge ?? null,
    retirementGoal: input.retirementGoal ?? existing?.retirementGoal ?? null,
    onboardingDone: input.onboardingDone,
    onboardingSkipped: input.onboardingSkipped ?? existing?.onboardingSkipped ?? false,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(nextRecord, null, 2), 'utf8');
  return nextRecord;
}

export function isOnboardingProfileStorageConfigured() {
  return Boolean(getD1Database()) || isE2EAuthEnabled();
}

export async function getOnboardingProfile(clerkUserId: string): Promise<OnboardingProfileRecord | null> {
  const db = getD1Database();

  if (!db) {
    if (isE2EAuthEnabled()) {
      return readE2EOnboardingProfile(clerkUserId);
    }

    return null;
  }

  const row = await db
    .prepare(`
      SELECT
        clerk_user_id,
        email,
        name,
        phone,
        notification_channel,
        monthly_income,
        risk_tolerance,
        preferred_markets_json,
        retirement_age,
        current_age,
        retirement_goal,
        onboarding_done,
        onboarding_skipped,
        updated_at
      FROM user_onboarding_profiles
      WHERE clerk_user_id = ?
      LIMIT 1
    `)
    .bind(clerkUserId)
    .first<OnboardingRow>();

  return row ? toRecord(row) : null;
}

export async function saveOnboardingProfile(
  clerkUserId: string,
  input: SaveOnboardingProfileInput
): Promise<OnboardingProfileRecord | null> {
  const db = getD1Database();

  if (!db) {
    if (isE2EAuthEnabled()) {
      return writeE2EOnboardingProfile(clerkUserId, input);
    }

    return null;
  }

  await db.prepare(`
      INSERT INTO user_onboarding_profiles (
        clerk_user_id,
        email,
        name,
        phone,
        notification_channel,
        monthly_income,
        risk_tolerance,
        preferred_markets_json,
        retirement_age,
        current_age,
        retirement_goal,
        onboarding_done,
        onboarding_skipped,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(clerk_user_id) DO UPDATE SET
        email = COALESCE(excluded.email, user_onboarding_profiles.email),
        name = COALESCE(excluded.name, user_onboarding_profiles.name),
        phone = COALESCE(excluded.phone, user_onboarding_profiles.phone),
        notification_channel = COALESCE(excluded.notification_channel, user_onboarding_profiles.notification_channel),
        monthly_income = COALESCE(excluded.monthly_income, user_onboarding_profiles.monthly_income),
        risk_tolerance = COALESCE(excluded.risk_tolerance, user_onboarding_profiles.risk_tolerance),
        preferred_markets_json = COALESCE(excluded.preferred_markets_json, user_onboarding_profiles.preferred_markets_json),
        retirement_age = COALESCE(excluded.retirement_age, user_onboarding_profiles.retirement_age),
        current_age = COALESCE(excluded.current_age, user_onboarding_profiles.current_age),
        retirement_goal = COALESCE(excluded.retirement_goal, user_onboarding_profiles.retirement_goal),
        onboarding_done = excluded.onboarding_done,
        onboarding_skipped = excluded.onboarding_skipped,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(
      clerkUserId,
      input.email ?? null,
      input.name ?? null,
      input.phone ?? null,
      input.notificationChannel ?? null,
      input.monthlyIncome ?? null,
      input.riskTolerance ?? null,
      input.preferredMarkets ? JSON.stringify(input.preferredMarkets) : null,
      input.retirementAge ?? null,
      input.currentAge ?? null,
      input.retirementGoal ?? null,
      input.onboardingDone ? 1 : 0,
      input.onboardingSkipped ? 1 : 0
    )
    .run();

  return getOnboardingProfile(clerkUserId);
}
