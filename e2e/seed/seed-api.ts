import type { Page } from '@playwright/test';
import type { RemoteWorkspaceSnapshot } from '../../src/store/useAppStore';

const STORAGE_KEYS = [
  'wealix-storage-v4',
  'wealthos-storage',
  'wealix-storage-v3',
  'wealix-financial-settings-v1',
  'wealix-financial-settings-broadcast',
];

const E2E_USER = {
  id: 'e2e-user',
  email: 'e2e@wealix.local',
  name: 'Wealix E2E',
  avatarUrl: null,
  locale: 'en',
  currency: 'SAR',
  subscriptionTier: 'pro',
  onboardingDone: true,
};

export async function seedWorkspace(page: Page, workspace: RemoteWorkspaceSnapshot) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  const persistWorkspace = async () => {
    const response = await page.request.put('/api/user-data', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: { workspace },
    });

    const data = await response.json().catch(() => null);
    return {
      ok: response.ok(),
      status: response.status(),
      data,
    };
  };

  const result = await persistWorkspace();

  if (!result.ok) {
    throw new Error(`Seeding workspace failed with ${result.status}: ${JSON.stringify(result.data)}`);
  }

  await page.evaluate(({ keys, nextWorkspace, e2eUser }) => {
    for (const key of keys) {
      if (key !== 'wealix-storage-v4') {
        window.localStorage.removeItem(key);
      }
    }

    const raw = window.localStorage.getItem('wealix-storage-v4');
    const parsed = raw ? JSON.parse(raw) as { state?: Record<string, unknown>; version?: number } : null;
    const state = (parsed?.state ?? {}) as Record<string, unknown>;
    const timestamp = new Date().toISOString();
    const existingProfiles = Array.isArray(state.profiles) ? state.profiles.filter((profile) => {
      return profile && typeof profile === 'object' && (profile as { id?: string }).id !== e2eUser.id;
    }) : [];

    const liveProfile = {
      id: e2eUser.id,
      label: e2eUser.name,
      email: e2eUser.email,
      avatarUrl: e2eUser.avatarUrl,
      appMode: 'live',
      startPage: nextWorkspace.startPage,
      user: e2eUser,
      notificationPreferences: nextWorkspace.notificationPreferences,
      notificationFeed: nextWorkspace.notificationFeed,
      incomeEntries: nextWorkspace.incomeEntries,
      expenseEntries: nextWorkspace.expenseEntries,
      receiptScans: nextWorkspace.receiptScans,
      portfolioHoldings: nextWorkspace.portfolioHoldings,
      portfolioAnalysisHistory: nextWorkspace.portfolioAnalysisHistory,
      investmentDecisionHistory: nextWorkspace.investmentDecisionHistory,
      assets: nextWorkspace.assets,
      liabilities: nextWorkspace.liabilities,
      budgetLimits: nextWorkspace.budgetLimits,
      recurringObligations: nextWorkspace.recurringObligations ?? [],
      oneTimeExpenses: nextWorkspace.oneTimeExpenses ?? [],
      savingsAccounts: nextWorkspace.savingsAccounts ?? [],
    };

    window.localStorage.setItem('wealix-storage-v4', JSON.stringify({
      state: {
        ...state,
        appMode: 'live',
        startPage: nextWorkspace.startPage,
        user: e2eUser,
        notificationPreferences: nextWorkspace.notificationPreferences,
        notificationFeed: nextWorkspace.notificationFeed,
        profiles: [...existingProfiles, liveProfile],
        activeProfileId: e2eUser.id,
        financialStateVersion: typeof state.financialStateVersion === 'number' ? state.financialStateVersion + 1 : 1,
        financialStateUpdatedAt: timestamp,
        incomeEntries: nextWorkspace.incomeEntries,
        expenseEntries: nextWorkspace.expenseEntries,
        receiptScans: nextWorkspace.receiptScans,
        portfolioHoldings: nextWorkspace.portfolioHoldings,
        portfolioAnalysisHistory: nextWorkspace.portfolioAnalysisHistory,
        investmentDecisionHistory: nextWorkspace.investmentDecisionHistory,
        assets: nextWorkspace.assets,
        liabilities: nextWorkspace.liabilities,
        budgetLimits: nextWorkspace.budgetLimits,
        recurringObligations: nextWorkspace.recurringObligations ?? [],
        oneTimeExpenses: nextWorkspace.oneTimeExpenses ?? [],
        savingsAccounts: nextWorkspace.savingsAccounts ?? [],
      },
      version: parsed?.version ?? 0,
    }));
  }, { keys: STORAGE_KEYS, nextWorkspace: workspace, e2eUser: E2E_USER });

  // RemoteProfileSync can still flush a debounced save from the previously loaded
  // workspace after the new spec starts. Re-applying the seed after that debounce
  // window makes the seeded persona deterministic across the full suite.
  await page.waitForTimeout(900);

  const confirmedResult = await persistWorkspace();
  if (!confirmedResult.ok) {
    throw new Error(`Seed confirmation failed with ${confirmedResult.status}: ${JSON.stringify(confirmedResult.data)}`);
  }

  // Avoid mutating the live Zustand store from inside page.evaluate here.
  // The persisted workspace is already correct in localStorage and on the API;
  // forcing a full in-page setState can trigger a long persist + render cycle
  // that stalls Playwright waiting for evaluate() to settle.
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
}
