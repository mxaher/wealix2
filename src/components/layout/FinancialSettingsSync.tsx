'use client';

import { useEffect, useMemo } from 'react';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';
import { deriveFinancialSettingsFromState } from '@/lib/financial-settings';
import { useAppStore } from '@/store/useAppStore';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';
import { useShallow } from 'zustand/react/shallow';

export function FinancialSettingsSync() {
  const { isLoaded, isSignedIn } = useRuntimeUser();
  const appState = useAppStore(
    useShallow((state) => ({
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
    }))
  );
  const loadFromBackend = useFinancialSettingsStore((state) => state.loadFromBackend);
  const bootstrap = useFinancialSettingsStore((state) => state.bootstrap);
  const hasLoadedFromBackend = useFinancialSettingsStore((state) => state.hasLoadedFromBackend);
  const currentData = useFinancialSettingsStore((state) => state.data);
  const derivedSettings = useMemo(() => deriveFinancialSettingsFromState(appState), [appState]);
  const currentSignature = useMemo(
    () => JSON.stringify(currentData),
    [currentData]
  );
  const derivedSignature = useMemo(
    () => JSON.stringify(derivedSettings),
    [derivedSettings]
  );

  useEffect(() => {
    if (hasLoadedFromBackend || currentSignature === derivedSignature) {
      return;
    }

    bootstrap(derivedSettings);
  }, [bootstrap, currentSignature, derivedSettings, derivedSignature, hasLoadedFromBackend]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasLoadedFromBackend) {
      return;
    }

    void loadFromBackend();
  }, [hasLoadedFromBackend, isLoaded, isSignedIn, loadFromBackend]);

  return null;
}
