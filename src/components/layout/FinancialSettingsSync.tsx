'use client';

import { useEffect } from 'react';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';
import { deriveFinancialSettingsFromState } from '@/lib/financial-settings';
import { useAppStore } from '@/store/useAppStore';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';

export function FinancialSettingsSync() {
  const { isLoaded, isSignedIn } = useRuntimeUser();
  const appState = useAppStore((state) => ({
    financialStateUpdatedAt: state.financialStateUpdatedAt,
    financialStateVersion: state.financialStateVersion,
    portfolioHoldings: state.portfolioHoldings,
    assets: state.assets,
    liabilities: state.liabilities,
    incomeEntries: state.incomeEntries,
    expenseEntries: state.expenseEntries,
    budgetLimits: state.budgetLimits,
    recurringObligations: state.recurringObligations,
    oneTimeExpenses: state.oneTimeExpenses,
    savingsAccounts: state.savingsAccounts,
    userProfile: state.userProfile,
  }));
  const loadFromBackend = useFinancialSettingsStore((state) => state.loadFromBackend);
  const bootstrap = useFinancialSettingsStore((state) => state.bootstrap);
  const hasLoadedFromBackend = useFinancialSettingsStore((state) => state.hasLoadedFromBackend);

  useEffect(() => {
    bootstrap(deriveFinancialSettingsFromState(appState));
  }, [appState, bootstrap]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasLoadedFromBackend) {
      return;
    }

    void loadFromBackend();
  }, [hasLoadedFromBackend, isLoaded, isSignedIn, loadFromBackend]);

  return null;
}
