import { beforeEach, describe, expect, test } from 'bun:test';
import { getPersistableWorkspaceSnapshot, useAppStore, type ExpenseEntry, type IncomeEntry } from './useAppStore';

function resetStore() {
  useAppStore.setState({
    user: null,
    locale: 'en',
    theme: 'light',
    appMode: 'demo',
    startPage: 'dashboard',
    notificationPreferences: {
      email: true,
      push: true,
      sms: false,
      whatsapp: false,
      priceAlerts: true,
      budgetAlerts: true,
      planningUpdates: true,
      statusChanges: true,
      reminders: true,
      weeklyDigest: false,
      preferredChannel: 'push',
      phoneNumber: '',
      useSamePhoneNumberForWhatsApp: true,
      whatsappNumber: '',
    },
    notificationFeed: [],
    profiles: [],
    activeProfileId: 'guest',
    incomeEntries: [],
    expenseEntries: [],
    receiptScans: [],
    portfolioHoldings: [],
    portfolioAnalysisHistory: [],
    investmentDecisionHistory: [],
    assets: [],
    liabilities: [],
    budgetLimits: [],
    recurringObligations: [],
    sidebarCollapsed: false,
    activeDashboardTab: 'overview',
    selectedExchange: 'all',
    shariahFilterEnabled: false,
    selectedMonth: '2026-04',
    activeChatSession: null,
    attachPortfolioContext: false,
    isLoading: false,
    isMobile: false,
  });
}

function buildIncomeEntry(id: string, sourceName: string): IncomeEntry {
  return {
    id,
    amount: 12000,
    currency: 'SAR',
    source: 'salary',
    sourceName,
    frequency: 'monthly',
    date: '2026-04-01',
    isRecurring: true,
  };
}

function buildExpenseEntry(id: string, description: string): ExpenseEntry {
  return {
    id,
    amount: 220,
    currency: 'SAR',
    category: 'Food',
    description,
    date: '2026-04-02',
    paymentMethod: 'Card',
  };
}

describe('useAppStore mode isolation', () => {
  beforeEach(() => {
    resetStore();
  });

  test('restores the signed-in live workspace after live -> demo -> live', () => {
    const store = useAppStore.getState();

    store.syncClerkUser({
      id: 'user_live',
      email: 'live@example.com',
      name: 'Live User',
      avatarUrl: null,
      subscriptionTier: 'core',
    });
    store.addIncomeEntry(buildIncomeEntry('income-live', 'Acme Salary'));
    store.addExpenseEntry(buildExpenseEntry('expense-live', 'Office lunch'));

    useAppStore.getState().setAppMode('demo');

    const profileDuringDemo = useAppStore.getState().profiles.find((profile) => profile.id === 'user_live');
    expect(useAppStore.getState().appMode).toBe('demo');
    expect(profileDuringDemo?.incomeEntries.map((entry) => entry.id)).toEqual(['income-live']);
    expect(profileDuringDemo?.expenseEntries.map((entry) => entry.id)).toEqual(['expense-live']);

    useAppStore.getState().setAppMode('live');

    expect(useAppStore.getState().appMode).toBe('live');
    expect(useAppStore.getState().incomeEntries.map((entry) => entry.id)).toEqual(['income-live']);
    expect(useAppStore.getState().expenseEntries.map((entry) => entry.id)).toEqual(['expense-live']);
  });

  test('keeps demo changes out of the persistable live workspace', () => {
    const store = useAppStore.getState();

    store.syncClerkUser({
      id: 'user_isolated',
      email: 'isolated@example.com',
      name: 'Isolated User',
      avatarUrl: null,
      subscriptionTier: 'pro',
    });
    store.addIncomeEntry(buildIncomeEntry('income-live', 'Consulting'));

    useAppStore.getState().setAppMode('demo');
    useAppStore.getState().addIncomeEntry(buildIncomeEntry('income-demo', 'Demo Salary'));

    const persistableWhileDemo = getPersistableWorkspaceSnapshot(useAppStore.getState());
    expect(useAppStore.getState().incomeEntries.some((entry) => entry.id === 'income-demo')).toBe(true);
    expect(persistableWhileDemo.appMode).toBe('live');
    expect(persistableWhileDemo.startPage).toBe('dashboard');
    expect(persistableWhileDemo.incomeEntries.map((entry) => entry.id)).toEqual(['income-live']);

    useAppStore.getState().setAppMode('live');

    expect(useAppStore.getState().incomeEntries.map((entry) => entry.id)).toEqual(['income-live']);
  });

  test('updates the hidden live profile when remote data refreshes during demo mode', () => {
    const store = useAppStore.getState();

    store.syncClerkUser({
      id: 'user_remote',
      email: 'remote@example.com',
      name: 'Remote User',
      avatarUrl: null,
      subscriptionTier: 'core',
    });
    store.addIncomeEntry(buildIncomeEntry('income-local', 'Local Salary'));
    store.setAppMode('demo');

    useAppStore.getState().stashRemoteWorkspace({
      appMode: 'live',
      startPage: 'portfolio',
      notificationPreferences: useAppStore.getState().notificationPreferences,
      notificationFeed: [],
      incomeEntries: [buildIncomeEntry('income-remote', 'Remote Salary')],
      expenseEntries: [],
      receiptScans: [],
      portfolioHoldings: [],
      portfolioAnalysisHistory: [],
      investmentDecisionHistory: [],
      assets: [],
      liabilities: [],
      budgetLimits: [],
      recurringObligations: [],
    });

    expect(useAppStore.getState().appMode).toBe('demo');
    expect(useAppStore.getState().incomeEntries.some((entry) => entry.id === 'income-remote')).toBe(false);

    useAppStore.getState().setAppMode('live');

    expect(useAppStore.getState().incomeEntries.map((entry) => entry.id)).toEqual(['income-remote']);
    expect(useAppStore.getState().startPage).toBe('portfolio');
  });
});
