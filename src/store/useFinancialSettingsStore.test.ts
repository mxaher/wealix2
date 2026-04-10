import { beforeEach, describe, expect, test } from 'bun:test';
import { DEFAULT_FINANCIAL_SETTINGS } from '@/lib/financial-settings';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';

function resetFinancialSettingsStore() {
  useFinancialSettingsStore.setState({
    data: DEFAULT_FINANCIAL_SETTINGS,
    isLoading: false,
    error: null,
    lastSyncedAt: null,
    syncStatus: 'idle',
    hasLoadedFromBackend: false,
    lastServerData: null,
  });
}

describe('useFinancialSettingsStore', () => {
  beforeEach(() => {
    resetFinancialSettingsStore();
  });

  test('bootstrap seeds initial workspace-derived data only before backend hydration', () => {
    const seeded = {
      ...DEFAULT_FINANCIAL_SETTINGS,
      monthlyIncome: 10000,
      annualIncome: 120000,
    };

    useFinancialSettingsStore.getState().bootstrap(seeded);
    expect(useFinancialSettingsStore.getState().data.monthlyIncome).toBe(10000);

    useFinancialSettingsStore.setState({ hasLoadedFromBackend: true });
    useFinancialSettingsStore.getState().bootstrap({
      ...DEFAULT_FINANCIAL_SETTINGS,
      monthlyIncome: 22000,
      annualIncome: 264000,
    });

    expect(useFinancialSettingsStore.getState().data.monthlyIncome).toBe(10000);
  });

  test('updateFields applies optimistic local updates immediately', () => {
    useFinancialSettingsStore.getState().updateFields({
      monthlyIncome: 15000,
      annualIncome: 180000,
      totalAssets: 400000,
      totalLiabilities: 90000,
    });

    const state = useFinancialSettingsStore.getState();
    expect(state.data.monthlyIncome).toBe(15000);
    expect(state.data.annualIncome).toBe(180000);
    expect(state.data.netWorth).toBe(310000);
    expect(state.syncStatus).toBe('syncing');
  });
});
