import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  deriveFinancialSettingsFromWorkspace,
  mergeFinancialSettings,
  sanitizeFinancialSettings,
  type FinancialSettings,
} from '@/lib/financial-settings';
import {
  getStoredFinancialSettings,
  saveFinancialSettings,
} from '@/lib/financial-settings-storage';
import { getE2ETestUser, isE2EAuthEnabled } from '@/lib/e2e-auth';
import { getOnboardingProfile } from '@/lib/onboarding-profile-storage';
import { loadRemoteWorkspace } from '@/lib/remote-user-data';
import { requireAuthenticatedUser } from '@/lib/server-auth';

const allocationEntrySchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  percentage: z.number().min(0).max(100),
});

const financialSettingsPatchSchema = z.object({
  monthlyIncome: z.number().min(0).optional(),
  annualIncome: z.number().min(0).optional(),
  incomeSource: z.string().min(1).optional(),
  currency: z.string().min(3).max(10).optional(),
  totalAssets: z.number().min(0).optional(),
  totalLiabilities: z.number().min(0).optional(),
  netWorth: z.number().optional(),
  fireTarget: z.number().min(0).optional(),
  fireTargetAge: z.number().min(30).max(100).optional(),
  currentSavingsRate: z.number().min(0).max(100).optional(),
  monthlyExpenses: z.number().min(0).optional(),
  investmentAllocation: z.array(allocationEntrySchema).optional(),
  riskProfile: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  lastUpdated: z.string().optional(),
});

function isSeededE2EUser(userId: string) {
  return isE2EAuthEnabled() && userId === getE2ETestUser().id;
}

async function buildBaseFinancialSettings(userId: string): Promise<FinancialSettings> {
  const stored = isSeededE2EUser(userId) ? null : await getStoredFinancialSettings(userId);
  if (stored?.settings) {
    return stored.settings;
  }

  const [workspaceRecord, onboardingProfile] = await Promise.all([
    loadRemoteWorkspace(userId).catch(() => ({ workspace: null, updatedAt: null })),
    getOnboardingProfile(userId).catch(() => null),
  ]);

  if (workspaceRecord.workspace) {
    return deriveFinancialSettingsFromWorkspace(workspaceRecord.workspace, onboardingProfile);
  }

  return sanitizeFinancialSettings({
    monthlyIncome: onboardingProfile?.monthlyIncome ?? 0,
    annualIncome: (onboardingProfile?.monthlyIncome ?? 0) * 12,
    riskProfile: onboardingProfile?.riskTolerance ?? 'moderate',
    fireTargetAge: onboardingProfile?.retirementAge ?? 60,
    lastUpdated: onboardingProfile?.updatedAt ?? new Date().toISOString(),
  });
}

export async function GET() {
  const { userId, error } = await requireAuthenticatedUser();
  if (error || !userId) {
    return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await buildBaseFinancialSettings(userId);
    return NextResponse.json({
      settings,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (routeError) {
    console.error('[financial-settings] GET failed', routeError);
    return NextResponse.json(
      { error: 'Failed to load financial settings.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { userId, error } = await requireAuthenticatedUser();
  if (error || !userId) {
    return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = financialSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid financial settings payload.' },
      { status: 400 }
    );
  }

  try {
    const baseSettings = await buildBaseFinancialSettings(userId);
    const normalizedPatch = {
      ...parsed.data,
      investmentAllocation: parsed.data.investmentAllocation?.map((entry, index) => ({
        id: entry.id ?? `${entry.label}-${index}`,
        label: entry.label,
        percentage: entry.percentage,
      })),
    };
    const nextSettings = mergeFinancialSettings(baseSettings, normalizedPatch);
    const saved = await saveFinancialSettings(userId, nextSettings, baseSettings);

    return NextResponse.json({
      settings: saved.settings ?? nextSettings,
      lastSyncedAt: saved.updatedAt ?? new Date().toISOString(),
    });
  } catch (routeError) {
    console.error('[financial-settings] PATCH failed', routeError);
    return NextResponse.json(
      { error: 'Failed to save financial settings.' },
      { status: 500 }
    );
  }
}
