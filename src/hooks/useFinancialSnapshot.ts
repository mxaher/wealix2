'use client';

import { useMemo, useState } from 'react';
import { buildFinancialSnapshotFromClientContext } from '@/lib/financial-snapshot';
import { applyFinancialSettingsToSnapshot } from '@/lib/financial-settings';
import { useAppStore } from '@/store/useAppStore';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';

export function useFinancialSnapshot() {
  const locale = useAppStore((state) => state.locale);
  const financialStateVersion = useAppStore((state) => state.financialStateVersion);
  const financialStateUpdatedAt = useAppStore((state) => state.financialStateUpdatedAt);
  const holdings = useAppStore((state) => state.portfolioHoldings);
  const assets = useAppStore((state) => state.assets);
  const liabilities = useAppStore((state) => state.liabilities);
  const incomeEntries = useAppStore((state) => state.incomeEntries);
  const expenseEntries = useAppStore((state) => state.expenseEntries);
  const budgetLimits = useAppStore((state) => state.budgetLimits);
  const recurringObligations = useAppStore((state) => state.recurringObligations);
  const oneTimeExpenses = useAppStore((state) => state.oneTimeExpenses);
  const savingsAccounts = useAppStore((state) => state.savingsAccounts);
  const financialSettings = useFinancialSettingsStore((state) => state.data);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const snapshot = useMemo(() => buildFinancialSnapshotFromClientContext({
    snapshotDate: financialStateUpdatedAt,
    currency: 'SAR',
    version: `${financialStateVersion}:${refreshNonce}`,
    holdings,
    assets,
    liabilities,
    incomeEntries,
    expenseEntries,
    budgetLimits,
    recurringObligations,
    oneTimeExpenses,
    savingsAccounts,
  }), [
    assets,
    budgetLimits,
    expenseEntries,
    financialStateUpdatedAt,
    financialStateVersion,
    holdings,
    incomeEntries,
    liabilities,
    oneTimeExpenses,
    recurringObligations,
    refreshNonce,
    savingsAccounts,
  ]);

  const syncedSnapshot = useMemo(
    () => applyFinancialSettingsToSnapshot(snapshot, financialSettings),
    [financialSettings, snapshot]
  );

  return {
    snapshot: syncedSnapshot,
    locale,
    isLoading: false,
    error: null as Error | null,
    refresh: () => setRefreshNonce((value) => value + 1),
    version: financialStateVersion,
  };
}
