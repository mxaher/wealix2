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

  const syncedSnapshot = useMemo(() => {
    const withSettings = applyFinancialSettingsToSnapshot(snapshot, financialSettings);

    // Income entries and expense entries are the authoritative source of truth
    // for monthly income, expenses, and surplus. applyFinancialSettingsToSnapshot
    // overwrites those fields with financialSettings.monthlyIncome which is a
    // value frozen at onboarding time and not kept in sync with actual entries.
    // Restore the live entry-computed values here so the dashboard always
    // reflects what the user has entered on the Income / Expenses pages.
    const liveMonthlyIncome = snapshot.income.monthlyNormalized;
    const liveMonthlyExpenses = snapshot.expenses.monthlyNormalized;
    const liveMonthlySurplus = liveMonthlyIncome - liveMonthlyExpenses;

    return {
      ...withSettings,
      income: snapshot.income,
      expenses: {
        ...withSettings.expenses,
        monthlyNormalized: liveMonthlyExpenses,
      },
      monthlyIncome: liveMonthlyIncome,
      monthlyExpenses: liveMonthlyExpenses,
      monthlySavings: liveMonthlySurplus,
      monthlySurplus: liveMonthlySurplus,
      budgetOverview: {
        ...withSettings.budgetOverview,
        monthlyIncome: liveMonthlyIncome,
        monthlyExpenses: liveMonthlyExpenses,
        monthlySurplus: liveMonthlySurplus,
      },
    };
  }, [financialSettings, snapshot]);

  return {
    snapshot: syncedSnapshot,
    locale,
    isLoading: false,
    error: null as Error | null,
    refresh: () => setRefreshNonce((value) => value + 1),
    version: financialStateVersion,
  };
}
