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
    financialStateVersion: 0,
    financialStateUpdatedAt: '2026-04-07T00:00:00.000Z',
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
    oneTimeExpenses: [],
    savingsAccounts: [],
    userProfile: {},
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
      oneTimeExpenses: [],
      savingsAccounts: [],
    });

    expect(useAppStore.getState().appMode).toBe('demo');
    expect(useAppStore.getState().incomeEntries.some((entry) => entry.id === 'income-remote')).toBe(false);

    useAppStore.getState().setAppMode('live');

    expect(useAppStore.getState().incomeEntries.map((entry) => entry.id)).toEqual(['income-remote']);
    expect(useAppStore.getState().startPage).toBe('portfolio');
  });

  test('treats remotely hydrated workspaces as live even if a legacy payload says demo', () => {
    const store = useAppStore.getState();

    store.syncClerkUser({
      id: 'user_remote_demo',
      email: 'remote-demo@example.com',
      name: 'Remote Demo User',
      avatarUrl: null,
      subscriptionTier: 'core',
    });
    store.setAppMode('demo');

    useAppStore.getState().hydrateRemoteWorkspace({
      appMode: 'demo',
      startPage: 'portfolio',
      notificationPreferences: useAppStore.getState().notificationPreferences,
      notificationFeed: [],
      incomeEntries: [buildIncomeEntry('income-remote-demo', 'Recovered Salary')],
      expenseEntries: [],
      receiptScans: [],
      portfolioHoldings: [],
      portfolioAnalysisHistory: [],
      investmentDecisionHistory: [],
      assets: [],
      liabilities: [],
      budgetLimits: [],
      recurringObligations: [],
      oneTimeExpenses: [],
      savingsAccounts: [],
    });

    expect(useAppStore.getState().appMode).toBe('live');
    expect(useAppStore.getState().incomeEntries.map((entry) => entry.id)).toEqual(['income-remote-demo']);
    expect(useAppStore.getState().startPage).toBe('portfolio');
  });

  test('does not restore seeded guest demo data when switching a guest workspace back to live', () => {
    useAppStore.setState((state) => ({
      ...state,
      profiles: [
        {
          id: 'guest',
          label: 'Guest',
          email: '',
          avatarUrl: null,
          appMode: 'demo',
          startPage: 'dashboard',
          user: null,
          notificationPreferences: state.notificationPreferences,
          notificationFeed: [],
          incomeEntries: [buildIncomeEntry('income-guest-demo', 'Seeded Guest Demo')],
          expenseEntries: [buildExpenseEntry('expense-guest-demo', 'Seeded Guest Expense')],
          receiptScans: [],
          portfolioHoldings: [],
          portfolioAnalysisHistory: [],
          investmentDecisionHistory: [],
          assets: [],
          liabilities: [],
          budgetLimits: [],
          recurringObligations: [],
          oneTimeExpenses: [],
          savingsAccounts: [],
        },
      ],
      activeProfileId: 'guest',
      appMode: 'demo',
      incomeEntries: [buildIncomeEntry('income-demo-current', 'Current Demo')],
      expenseEntries: [buildExpenseEntry('expense-demo-current', 'Current Demo Expense')],
    }));

    useAppStore.getState().setAppMode('live');

    expect(useAppStore.getState().appMode).toBe('live');
    expect(useAppStore.getState().incomeEntries).toEqual([]);
    expect(useAppStore.getState().expenseEntries).toEqual([]);
  });

  test('forces live mode even when a persisted signed-in profile was incorrectly saved as demo', () => {
    const store = useAppStore.getState();

    store.syncClerkUser({
      id: 'user_legacy_demo',
      email: 'legacy@example.com',
      name: 'Legacy User',
      avatarUrl: null,
      subscriptionTier: 'core',
    });
    store.addIncomeEntry(buildIncomeEntry('income-live', 'Stable Salary'));
    store.setAppMode('demo');

    useAppStore.setState((state) => ({
      profiles: state.profiles.map((profile) =>
        profile.id === 'user_legacy_demo'
          ? { ...profile, appMode: 'demo' }
          : profile
      ),
    }));

    useAppStore.getState().setAppMode('live');

    expect(useAppStore.getState().appMode).toBe('live');
    expect(useAppStore.getState().incomeEntries.map((entry) => entry.id)).toEqual(['income-live']);
  });

  test('bumps financial snapshot version for each mutation type', () => {
    const store = useAppStore.getState();

    expect(store.financialStateVersion).toBe(0);

    store.addIncomeEntry(buildIncomeEntry('income-version', 'Versioned Salary'));
    expect(useAppStore.getState().financialStateVersion).toBe(1);

    store.addExpenseEntry(buildExpenseEntry('expense-version', 'Dinner'));
    expect(useAppStore.getState().financialStateVersion).toBe(2);

    store.addAsset({
      id: 'asset-version',
      name: 'Cash reserve',
      category: 'cash',
      value: 5000,
      currency: 'SAR',
    });
    expect(useAppStore.getState().financialStateVersion).toBe(3);

    store.addRecurringObligation({
      id: 'ob-version',
      title: 'School fees',
      category: 'Education',
      amount: 4000,
      currency: 'SAR',
      dueDay: 15,
      startDate: '2026-05-01',
      frequency: 'monthly',
      status: 'upcoming',
    });
    expect(useAppStore.getState().financialStateVersion).toBe(4);

    store.addOneTimeExpense({
      id: 'one-version',
      title: 'Iqama renewal',
      amount: 2000,
      currency: 'SAR',
      dueDate: '2026-06-10',
      category: 'Other',
      priority: 'high',
      status: 'planned',
    });
    expect(useAppStore.getState().financialStateVersion).toBe(5);

    store.addSavingsAccount({
      id: 'save-version',
      name: 'Awaeed',
      type: 'awaeed',
      provider: 'Bank',
      principal: 10000,
      currentBalance: 10100,
      annualProfitRate: 4,
      termMonths: 12,
      openedAt: '2026-01-01',
      maturityDate: '2027-01-01',
      profitPayoutMethod: 'at_maturity',
      status: 'active',
    });
    expect(useAppStore.getState().financialStateVersion).toBe(6);
  });

  test('clearAllData restores the main workspace and UI state defaults', () => {
    const store = useAppStore.getState();

    store.syncClerkUser({
      id: 'user_clear',
      email: 'clear@example.com',
      name: 'Clear User',
      avatarUrl: null,
      subscriptionTier: 'pro',
    });

    store.addIncomeEntry(buildIncomeEntry('income-clear', 'Salary'));
    store.addExpenseEntry(buildExpenseEntry('expense-clear', 'Groceries'));
    store.addAsset({
      id: 'asset-clear',
      name: 'Brokerage',
      category: 'investment',
      value: 12000,
      currency: 'SAR',
    });
    store.addLiability({
      id: 'liability-clear',
      name: 'Card',
      category: 'credit_card',
      balance: 800,
      currency: 'SAR',
    });
    store.setBudgetLimits([{ category: 'Food', limit: 1000, color: '#000' }]);
    store.setStartPage('portfolio');
    store.updateNotificationPreferences({ sms: true });
    store.setAppMode('demo');
    store.setUserProfile({ monthlyIncome: 12000, riskTolerance: 'medium' });
    store.setSidebarCollapsed(true);
    store.setActiveDashboardTab('net-worth');
    store.setSelectedExchange('TASI');
    store.toggleShariahFilter();
    store.setSelectedMonth('2026-03');
    store.setActiveChatSession('chat-1');
    store.setAttachPortfolioContext(true);
    store.setIsLoading(true);
    store.setIsMobile(true);

    useAppStore.getState().clearAllData();

    const cleared = useAppStore.getState();

    expect(cleared.appMode).toBe('live');
    expect(cleared.user).toBeNull();
    expect(cleared.startPage).toBe('dashboard');
    expect(cleared.notificationPreferences.sms).toBe(false);
    expect(cleared.incomeEntries).toEqual([]);
    expect(cleared.expenseEntries).toEqual([]);
    expect(cleared.assets).toEqual([]);
    expect(cleared.liabilities).toEqual([]);
    expect(cleared.budgetLimits).toEqual([]);
    expect(cleared.portfolioHoldings).toEqual([]);
    expect(cleared.receiptScans).toEqual([]);
    expect(cleared.portfolioAnalysisHistory).toEqual([]);
    expect(cleared.investmentDecisionHistory).toEqual([]);
    expect(cleared.recurringObligations).toEqual([]);
    expect(cleared.oneTimeExpenses).toEqual([]);
    expect(cleared.savingsAccounts).toEqual([]);
    expect(cleared.notificationFeed).toEqual([]);
    expect(cleared.userProfile).toEqual({});
    expect(cleared.sidebarCollapsed).toBe(false);
    expect(cleared.activeDashboardTab).toBe('overview');
    expect(cleared.selectedExchange).toBe('all');
    expect(cleared.shariahFilterEnabled).toBe(false);
    expect(cleared.selectedMonth).toBe(new Date().toISOString().slice(0, 7));
    expect(cleared.activeChatSession).toBeNull();
    expect(cleared.attachPortfolioContext).toBe(false);
    expect(cleared.isLoading).toBe(false);
    expect(cleared.isMobile).toBe(false);
  });
});
