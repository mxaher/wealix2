import { buildFinancialSnapshotFromClientContext } from '@/lib/financial-snapshot';
import type { OnboardingProfileRecord } from '@/lib/onboarding-profile-storage';
import type { RemoteUserWorkspace } from '@/lib/remote-user-data';
import type { AppState } from '@/store/useAppStore';

export type FinancialRiskProfile = 'conservative' | 'moderate' | 'aggressive';

export interface AllocationEntry {
  id: string;
  label: string;
  percentage: number;
}

export interface FinancialSettings {
  monthlyIncome: number;
  annualIncome: number;
  incomeSource: string;
  currency: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  fireTarget: number;
  fireTargetAge: number;
  currentSavingsRate: number;
  monthlyExpenses: number;
  investmentAllocation: AllocationEntry[];
  riskProfile: FinancialRiskProfile;
  lastUpdated: string;
}

export type FinancialSettingsPatch = Partial<FinancialSettings>;

type SnapshotLikeState = Pick<
  AppState,
  | 'financialStateUpdatedAt'
  | 'financialStateVersion'
  | 'portfolioHoldings'
  | 'assets'
  | 'liabilities'
  | 'incomeEntries'
  | 'expenseEntries'
  | 'budgetLimits'
  | 'recurringObligations'
  | 'oneTimeExpenses'
  | 'savingsAccounts'
  | 'userProfile'
>;

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  monthlyIncome: 0,
  annualIncome: 0,
  incomeSource: 'salary',
  currency: 'SAR',
  totalAssets: 0,
  totalLiabilities: 0,
  netWorth: 0,
  fireTarget: 0,
  fireTargetAge: 60,
  currentSavingsRate: 0,
  monthlyExpenses: 0,
  investmentAllocation: [],
  riskProfile: 'moderate',
  lastUpdated: new Date(0).toISOString(),
};

function roundMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function sanitizeAllocation(entries: unknown): AllocationEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const candidate = entry as Partial<AllocationEntry>;
      const label = typeof candidate.label === 'string' && candidate.label.trim()
        ? candidate.label.trim()
        : `Allocation ${index + 1}`;
      const percentage = clampPercentage(Number(candidate.percentage));

      if (percentage <= 0) {
        return null;
      }

      return {
        id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `${label}-${index}`,
        label,
        percentage,
      } satisfies AllocationEntry;
    })
    .filter((entry): entry is AllocationEntry => Boolean(entry));
}

export function sanitizeFinancialSettings(input: unknown): FinancialSettings {
  const candidate = (input && typeof input === 'object' ? input : {}) as Partial<FinancialSettings>;
  const monthlyIncome = roundMoney(Number(candidate.monthlyIncome));
  const annualIncome = roundMoney(
    Number.isFinite(Number(candidate.annualIncome))
      ? Number(candidate.annualIncome)
      : monthlyIncome * 12
  );
  const totalAssets = roundMoney(Number(candidate.totalAssets));
  const totalLiabilities = roundMoney(Number(candidate.totalLiabilities));
  const monthlyExpenses = roundMoney(Number(candidate.monthlyExpenses));
  const currentSavingsRate = clampPercentage(Number(candidate.currentSavingsRate));
  const fireTarget = roundMoney(Number(candidate.fireTarget));
  const riskProfile = candidate.riskProfile === 'conservative' || candidate.riskProfile === 'aggressive'
    ? candidate.riskProfile
    : 'moderate';

  return {
    monthlyIncome,
    annualIncome,
    incomeSource: typeof candidate.incomeSource === 'string' && candidate.incomeSource.trim()
      ? candidate.incomeSource.trim()
      : DEFAULT_FINANCIAL_SETTINGS.incomeSource,
    currency: typeof candidate.currency === 'string' && candidate.currency.trim()
      ? candidate.currency.trim().toUpperCase()
      : DEFAULT_FINANCIAL_SETTINGS.currency,
    totalAssets,
    totalLiabilities,
    netWorth: roundMoney(
      Number.isFinite(Number(candidate.netWorth))
        ? Number(candidate.netWorth)
        : totalAssets - totalLiabilities
    ),
    fireTarget,
    fireTargetAge: Number.isFinite(Number(candidate.fireTargetAge))
      ? Math.max(30, Math.min(100, Math.round(Number(candidate.fireTargetAge))))
      : DEFAULT_FINANCIAL_SETTINGS.fireTargetAge,
    currentSavingsRate,
    monthlyExpenses,
    investmentAllocation: sanitizeAllocation(candidate.investmentAllocation),
    riskProfile,
    lastUpdated: typeof candidate.lastUpdated === 'string' && candidate.lastUpdated
      ? candidate.lastUpdated
      : new Date().toISOString(),
  };
}

export function mergeFinancialSettings(
  current: FinancialSettings,
  patch: FinancialSettingsPatch
): FinancialSettings {
  return sanitizeFinancialSettings({
    ...current,
    ...patch,
    lastUpdated: patch.lastUpdated ?? new Date().toISOString(),
    annualIncome: patch.monthlyIncome !== undefined && patch.annualIncome === undefined
      ? roundMoney(Number(patch.monthlyIncome) * 12)
      : patch.annualIncome ?? current.annualIncome,
    netWorth:
      patch.netWorth !== undefined
        ? patch.netWorth
        : roundMoney(
            (patch.totalAssets ?? current.totalAssets) - (patch.totalLiabilities ?? current.totalLiabilities)
          ),
  });
}

export function deriveInvestmentAllocation(
  holdings: SnapshotLikeState['portfolioHoldings']
): AllocationEntry[] {
  const total = holdings.reduce((sum, holding) => sum + (holding.shares * holding.currentPrice), 0);
  if (total <= 0) {
    return [];
  }

  const grouped = holdings.reduce<Record<string, number>>((acc, holding) => {
    const label = holding.sector?.trim() || holding.exchange || 'Other';
    acc[label] = (acc[label] ?? 0) + (holding.shares * holding.currentPrice);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([label, value], index) => ({
      id: `${label}-${index}`,
      label,
      percentage: clampPercentage((value / total) * 100),
    }))
    .sort((left, right) => right.percentage - left.percentage);
}

export function deriveFinancialSettingsFromState(state: SnapshotLikeState): FinancialSettings {
  const snapshot = buildFinancialSnapshotFromClientContext({
    snapshotDate: state.financialStateUpdatedAt,
    currency: 'SAR',
    version: state.financialStateVersion,
    holdings: state.portfolioHoldings,
    assets: state.assets,
    liabilities: state.liabilities,
    incomeEntries: state.incomeEntries,
    expenseEntries: state.expenseEntries,
    budgetLimits: state.budgetLimits,
    recurringObligations: state.recurringObligations,
    oneTimeExpenses: state.oneTimeExpenses,
    savingsAccounts: state.savingsAccounts,
  });

  return sanitizeFinancialSettings({
    monthlyIncome: state.userProfile.monthlyIncome ?? snapshot.monthlyIncome,
    annualIncome: (state.userProfile.monthlyIncome ?? snapshot.monthlyIncome) * 12,
    incomeSource: state.incomeEntries[0]?.source ?? DEFAULT_FINANCIAL_SETTINGS.incomeSource,
    currency: state.incomeEntries[0]?.currency ?? DEFAULT_FINANCIAL_SETTINGS.currency,
    totalAssets: snapshot.totalAssets,
    totalLiabilities: snapshot.totalLiabilities,
    netWorth: snapshot.netWorth.net,
    fireTarget: snapshot.fire.fireNumber,
    fireTargetAge: state.userProfile.retirementAge ?? DEFAULT_FINANCIAL_SETTINGS.fireTargetAge,
    currentSavingsRate: snapshot.savingsRate,
    monthlyExpenses: snapshot.monthlyExpenses,
    investmentAllocation: deriveInvestmentAllocation(state.portfolioHoldings),
    riskProfile:
      state.userProfile.riskTolerance === 'conservative' || state.userProfile.riskTolerance === 'aggressive'
        ? state.userProfile.riskTolerance
        : snapshot.riskProfile,
    lastUpdated: state.financialStateUpdatedAt,
  });
}

export function deriveFinancialSettingsFromWorkspace(
  workspace: RemoteUserWorkspace,
  onboardingProfile?: OnboardingProfileRecord | null
): FinancialSettings {
  const snapshot = buildFinancialSnapshotFromClientContext({
    snapshotDate: onboardingProfile?.updatedAt ?? new Date().toISOString(),
    currency: 'SAR',
    version: onboardingProfile?.updatedAt ?? Date.now(),
    holdings: workspace.portfolioHoldings,
    assets: workspace.assets,
    liabilities: workspace.liabilities,
    incomeEntries: workspace.incomeEntries,
    expenseEntries: workspace.expenseEntries,
    budgetLimits: workspace.budgetLimits,
    recurringObligations: workspace.recurringObligations ?? [],
    oneTimeExpenses: workspace.oneTimeExpenses ?? [],
    savingsAccounts: workspace.savingsAccounts ?? [],
  });

  return sanitizeFinancialSettings({
    monthlyIncome: onboardingProfile?.monthlyIncome ?? snapshot.monthlyIncome,
    annualIncome: (onboardingProfile?.monthlyIncome ?? snapshot.monthlyIncome) * 12,
    incomeSource: workspace.incomeEntries[0]?.source ?? DEFAULT_FINANCIAL_SETTINGS.incomeSource,
    currency: workspace.incomeEntries[0]?.currency ?? DEFAULT_FINANCIAL_SETTINGS.currency,
    totalAssets: snapshot.totalAssets,
    totalLiabilities: snapshot.totalLiabilities,
    netWorth: snapshot.netWorth.net,
    fireTarget: snapshot.fire.fireNumber,
    fireTargetAge: onboardingProfile?.retirementAge ?? DEFAULT_FINANCIAL_SETTINGS.fireTargetAge,
    currentSavingsRate: snapshot.savingsRate,
    monthlyExpenses: snapshot.monthlyExpenses,
    investmentAllocation: deriveInvestmentAllocation(workspace.portfolioHoldings),
    riskProfile:
      onboardingProfile?.riskTolerance === 'conservative' || onboardingProfile?.riskTolerance === 'aggressive'
        ? onboardingProfile.riskTolerance
        : snapshot.riskProfile,
    lastUpdated: onboardingProfile?.updatedAt ?? new Date().toISOString(),
  });
}

export function applyFinancialSettingsToSnapshot<T extends {
  currency: string;
  income: { monthlyNormalized: number; annualized: number };
  expenses: { monthlyNormalized: number };
  budgetOverview: { monthlyIncome: number; monthlyExpenses: number; monthlySurplus: number };
  netWorth: { net: number };
  fire: {
    annualExpenses: number;
    annualSavings: number;
    fireNumber: number;
    progressPct: number;
    currentInvestableAssets: number;
  };
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  monthlySurplus: number;
  savingsRate: number;
  netWorthValue: number;
  totalAssets: number;
  totalLiabilities: number;
}>(snapshot: T, settings: FinancialSettings): T {
  const monthlySavings = roundMoney(settings.monthlyIncome - settings.monthlyExpenses);
  const annualSavings = roundMoney(monthlySavings * 12);
  const fireProgress = settings.fireTarget > 0
    ? clampPercentage((snapshot.fire.currentInvestableAssets / settings.fireTarget) * 100)
    : 0;

  return {
    ...snapshot,
    currency: settings.currency,
    income: {
      ...snapshot.income,
      monthlyNormalized: settings.monthlyIncome,
      annualized: settings.annualIncome,
    },
    expenses: {
      ...snapshot.expenses,
      monthlyNormalized: settings.monthlyExpenses,
    },
    budgetOverview: {
      ...snapshot.budgetOverview,
      monthlyIncome: settings.monthlyIncome,
      monthlyExpenses: settings.monthlyExpenses,
      monthlySurplus: monthlySavings,
    },
    fire: {
      ...snapshot.fire,
      annualExpenses: roundMoney(settings.monthlyExpenses * 12),
      annualSavings,
      fireNumber: settings.fireTarget,
      progressPct: fireProgress,
    },
    monthlyIncome: settings.monthlyIncome,
    monthlyExpenses: settings.monthlyExpenses,
    monthlySavings,
    monthlySurplus: monthlySavings,
    savingsRate: settings.currentSavingsRate,
    netWorthValue: snapshot.netWorth.net,
    totalAssets: snapshot.totalAssets,
    totalLiabilities: snapshot.totalLiabilities,
  };
}
