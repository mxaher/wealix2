import type { RemoteUserWorkspace } from '@/lib/remote-user-data';
import { buildForecast, getUpcomingOccurrences } from '@/lib/recurring-obligations';
import type {
  AssetEntry,
  BudgetLimit,
  ExpenseCategory,
  ExpenseEntry,
  IncomeEntry,
  LiabilityEntry,
  OneTimeExpense,
  PortfolioHolding,
  RecurringObligation,
  SavingsAccount,
} from '@/store/useAppStore';

type GoalStatus = 'on_track' | 'watch' | 'off_track';
type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export type IncomeSourceSummary = {
  id: string;
  label: string;
  amount: number;
  normalizedMonthlyAmount: number;
  frequency: IncomeEntry['frequency'];
  recurring: boolean;
};

export type OneTimeExpenseSummary = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  priority: OneTimeExpense['priority'];
  fundingSource?: string | null;
  status?: OneTimeExpense['status'];
};

export type SavingsAccountSummary = {
  id: string;
  name: string;
  type: SavingsAccount['type'];
  provider: string;
  currentBalance: number;
  maturityDate: string;
  status: SavingsAccount['status'];
  isLiquid: boolean;
  expectedMaturityValue: number;
};

export type ObligationSummary = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysUntilDue: number;
  status: RecurringObligation['status'];
  availableFunding: number;
  fundingGap: number;
  coverageRatio: number;
};

export type ForecastRow = {
  month: string;
  label: string;
  openingBalance: number;
  income: number;
  recurringExpenses: number;
  obligationPayments: number;
  oneTimeExpenses: number;
  maturityInflows: number;
  closingBalance: number;
  status: 'ON_TRACK' | 'SURPLUS_LOW' | 'AT_RISK' | 'CRITICAL';
};

export type AlertSummary = {
  severity: 'info' | 'warning' | 'critical';
  category: 'cash_flow' | 'obligation' | 'forecast' | 'fire' | 'liquidity';
  title: string;
  description: string;
};

export type FinancialGoalSnapshot = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
  targetDate: string | null;
  monthlyContribution: number;
  status: GoalStatus;
};

export type WatchlistAlternative = {
  name: string;
  assetClass: string;
  reason: string;
};

export type FinancialWorkspaceData = {
  snapshotDate?: string;
  currency?: string;
  version?: number | string | null;
  holdings?: PortfolioHolding[];
  assets?: AssetEntry[];
  liabilities?: LiabilityEntry[];
  incomeEntries?: IncomeEntry[];
  expenseEntries?: ExpenseEntry[];
  budgetLimits?: BudgetLimit[];
  recurringObligations?: RecurringObligation[];
  oneTimeExpenses?: OneTimeExpense[];
  savingsAccounts?: SavingsAccount[];
};

export type ClientFinancialContext = FinancialWorkspaceData;

export type DecisionCheckContext = {
  holdings: PortfolioHolding[];
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  income: FinancialSnapshot['income'];
  expenses: FinancialSnapshot['expenses'];
  budgets: BudgetLimit[];
  obligations: FinancialSnapshot['obligations'];
  oneTimeExpenses: OneTimeExpense[];
  savings: FinancialSnapshot['savings'];
  forecast: FinancialSnapshot['forecast'];
  netWorth: FinancialSnapshot['netWorth'];
  liquidity: {
    liquidCash: number;
    liquidNetWorth: number;
    coverageRatio: number;
  };
};

export type FinancialSnapshot = {
  generatedAt: string;
  snapshotDate: string;
  currency: string;
  version: string;
  income: {
    monthlyNormalized: number;
    annualized: number;
    sources: IncomeSourceSummary[];
  };
  expenses: {
    monthlyNormalized: number;
    essentialMonthly: number;
    variableMonthly: number;
    oneTimeUpcoming: OneTimeExpenseSummary[];
  };
  savings: {
    liquidCash: number;
    savingsAccounts: SavingsAccountSummary[];
    totalLockedSavings: number;
  };
  budgetOverview: {
    totalBudgetLimits: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySurplus: number;
  };
  obligations: {
    pending: ObligationSummary[];
    totalPending: number;
    nextDue: ObligationSummary | null;
    coverageRatio: number;
    atRiskCount: number;
  };
  portfolio: {
    totalInvestments: number;
    stocks: number;
    funds: number;
  };
  forecast: {
    monthlyRows: ForecastRow[];
    firstAtRiskMonth: ForecastRow | null;
    firstCriticalMonth: ForecastRow | null;
    endingBalance: number;
  };
  netWorth: {
    liquid: number;
    locked: number;
    investments: number;
    obligations: number;
    gross: number;
    net: number;
    liquidNetWorth: number;
  };
  fire: {
    annualExpenses: number;
    annualSavings: number;
    fireNumber: number;
    currentInvestableAssets: number;
    progressPct: number;
    yearsToFire: number | null;
  };
  alerts: AlertSummary[];
  holdings: PortfolioHolding[];
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  budgetLimits: BudgetLimit[];
  recurringObligations: RecurringObligation[];
  oneTimeExpenses: OneTimeExpense[];
  savingsAccounts: SavingsAccount[];
  activeGoals: FinancialGoalSnapshot[];
  watchlistAlternatives: WatchlistAlternative[];
  sectorExposure: Array<{ sector: string; value: number; weightPct: number }>;
  exchangeExposure: Array<{ exchange: string; value: number; weightPct: number }>;
  assetClassExposure: Array<{ assetClass: string; value: number; weightPct: number }>;
  topHoldingWeightPct: number;
  riskProfile: RiskProfile;
  netWorthValue: number;
  totalAssets: number;
  totalLiabilities: number;
  portfolioValue: number;
  liquidReserves: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  monthlySurplus: number;
  savingsRate: number;
  emergencyFundTarget: number;
  emergencyFundMonths: number;
  netWorthLegacy: number;
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function isLiquidSavingsAccount(account: SavingsAccount) {
  return account.type === 'current' || account.type === 'standard_savings' || account.type === 'hassad';
}

function normalizeMonthlyIncome(entry: IncomeEntry) {
  if (!entry.isRecurring && !entry.date.startsWith(monthKey(new Date()))) {
    return 0;
  }

  switch (entry.frequency) {
    case 'weekly':
      return entry.amount * 52 / 12;
    case 'quarterly':
      return entry.amount / 3;
    case 'yearly':
      return entry.amount / 12;
    case 'one_time':
      return entry.amount;
    case 'monthly':
    default:
      return entry.amount;
  }
}

function averageMonthlyExpenses(entries: ExpenseEntry[]) {
  if (entries.length === 0) {
    return 0;
  }

  const totalsByMonth = entries.reduce<Record<string, number>>((acc, entry) => {
    const month = typeof entry.date === 'string' && entry.date.length >= 7
      ? entry.date.slice(0, 7)
      : monthKey(new Date());
    acc[month] = (acc[month] ?? 0) + entry.amount;
    return acc;
  }, {});

  const months = Object.keys(totalsByMonth).length || 1;
  const total = Object.values(totalsByMonth).reduce((sum, value) => sum + value, 0);
  return total / months;
}

function averageMonthlyExpensesByCategory(entries: ExpenseEntry[], categories: Set<ExpenseCategory>) {
  return averageMonthlyExpenses(entries.filter((entry) => categories.has(entry.category)));
}

function calculateYearsToFire(currentInvestableAssets: number, fireNumber: number, annualSavings: number, expectedReturn = 0.07) {
  if (fireNumber <= 0) {
    return 0;
  }
  if (currentInvestableAssets >= fireNumber) {
    return 0;
  }
  if (annualSavings <= 0) {
    return null;
  }

  let years = 0;
  let assets = currentInvestableAssets;
  while (assets < fireNumber && years < 100) {
    assets = assets * (1 + expectedReturn) + annualSavings;
    years += 1;
  }

  return years >= 100 ? null : years;
}

function classifyHoldingAssetClass(holding: PortfolioHolding) {
  if (holding.exchange === 'GOLD' || /gold|xau|ذهب/i.test(holding.name) || /xau/i.test(holding.ticker)) {
    return 'gold';
  }
  if (/btc|bitcoin|eth|ethereum|crypto/i.test(`${holding.name} ${holding.ticker}`)) {
    return 'crypto';
  }
  if (/fund|etf|reit/i.test(`${holding.name} ${holding.ticker}`)) {
    return 'funds';
  }
  return 'equities';
}

function inferRiskProfile(params: {
  emergencyFundMonths: number;
  savingsRate: number;
  riskyAssetSharePct: number;
}): RiskProfile {
  const { emergencyFundMonths, savingsRate, riskyAssetSharePct } = params;

  if (emergencyFundMonths < 3 || savingsRate < 10) {
    return 'conservative';
  }

  if (emergencyFundMonths >= 6 && savingsRate >= 25 && riskyAssetSharePct >= 60) {
    return 'aggressive';
  }

  return 'moderate';
}

function buildGoalStatus(progressPct: number): GoalStatus {
  if (progressPct >= 70) return 'on_track';
  if (progressPct >= 40) return 'watch';
  return 'off_track';
}

function buildWatchlistAlternatives(snapshot: {
  assetClassExposure: Array<{ assetClass: string; value: number; weightPct: number }>;
  exchangeExposure: Array<{ exchange: string; value: number; weightPct: number }>;
  emergencyFundMonths: number;
}): WatchlistAlternative[] {
  const alternatives: WatchlistAlternative[] = [];
  const assetClassWeights = Object.fromEntries(snapshot.assetClassExposure.map((item) => [item.assetClass, item.weightPct]));
  const exchangeWeights = Object.fromEntries(snapshot.exchangeExposure.map((item) => [item.exchange, item.weightPct]));

  if ((assetClassWeights.gold ?? 0) < 5) {
    alternatives.push({
      name: 'Gold or a gold ETF',
      assetClass: 'gold',
      reason: 'Adds a defensive asset that is currently underrepresented in the portfolio.',
    });
  }

  if ((exchangeWeights.NASDAQ ?? 0) + (exchangeWeights.NYSE ?? 0) < 20) {
    alternatives.push({
      name: 'A broad global ETF',
      assetClass: 'etf',
      reason: 'Improves diversification beyond the current regional concentration.',
    });
  }

  if (snapshot.emergencyFundMonths < 6) {
    alternatives.push({
      name: 'Emergency reserve top-up',
      assetClass: 'cash',
      reason: 'Strengthens liquidity before taking on another discretionary position.',
    });
  }

  return alternatives.slice(0, 3);
}

function getSavingsMaturityValue(account: SavingsAccount) {
  const profit = account.profitPayoutMethod === 'at_maturity'
    ? account.principal * (account.annualProfitRate / 100) * (account.termMonths / 12)
    : 0;
  return roundMoney(account.principal + profit);
}

function buildForecastRows(params: {
  liquidCash: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recurringObligations: RecurringObligation[];
  oneTimeExpenses: OneTimeExpense[];
  savingsAccounts: SavingsAccount[];
}) {
  const monthlyObligations = buildForecast(params.recurringObligations, 12);
  let openingBalance = params.liquidCash;

  return monthlyObligations.map<ForecastRow>((period) => {
    const obligationPayments = period.totalAmount;
    const oneTimeExpenses = params.oneTimeExpenses
      .filter((item) => item.status !== 'paid' && item.dueDate.slice(0, 7) === period.month)
      .reduce((sum, item) => sum + item.amount, 0);
    const maturityInflows = params.savingsAccounts
      .filter((item) => item.status === 'active' && item.maturityDate.slice(0, 7) === period.month)
      .reduce((sum, item) => sum + getSavingsMaturityValue(item), 0);
    const closingBalance = openingBalance + params.monthlyIncome - params.monthlyExpenses - obligationPayments - oneTimeExpenses + maturityInflows;

    const status = closingBalance < 0
      ? 'CRITICAL'
      : closingBalance < params.monthlyExpenses
        ? 'AT_RISK'
        : closingBalance < params.monthlyExpenses * 2
          ? 'SURPLUS_LOW'
          : 'ON_TRACK';

    const row = {
      month: period.month,
      label: period.label,
      openingBalance: roundMoney(openingBalance),
      income: roundMoney(params.monthlyIncome),
      recurringExpenses: roundMoney(params.monthlyExpenses),
      obligationPayments: roundMoney(obligationPayments),
      oneTimeExpenses: roundMoney(oneTimeExpenses),
      maturityInflows: roundMoney(maturityInflows),
      closingBalance: roundMoney(closingBalance),
      status,
    } satisfies ForecastRow;

    openingBalance = closingBalance;
    return row;
  });
}

function buildObligationSummaries(params: {
  recurringObligations: RecurringObligation[];
  liquidCash: number;
  monthlySurplus: number;
}) {
  const upcoming = getUpcomingOccurrences(params.recurringObligations, 365);
  let reservedEarlier = 0;

  return upcoming.map<ObligationSummary>((item) => {
    const due = new Date(item.dueDate);
    const now = new Date();
    const monthsRemaining = Math.max(0, (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth()));
    const availableFunding = Math.max(0, params.liquidCash + (params.monthlySurplus * monthsRemaining) - reservedEarlier);
    const fundingGap = Math.max(0, item.amount - availableFunding);
    const coverageRatio = item.amount > 0 ? availableFunding / item.amount : 1;
    reservedEarlier += item.amount;

    return {
      id: item.obligationId,
      title: item.title,
      amount: roundMoney(item.amount),
      currency: item.currency,
      dueDate: item.dueDate,
      daysUntilDue: item.daysUntilDue,
      status: item.status,
      availableFunding: roundMoney(availableFunding),
      fundingGap: roundMoney(fundingGap),
      coverageRatio: Number(coverageRatio.toFixed(2)),
    };
  });
}

function buildAlerts(params: {
  monthlySavings: number;
  obligations: ObligationSummary[];
  forecastRows: ForecastRow[];
  fireProgressPct: number;
  liquidCash: number;
  monthlyExpenses: number;
}) {
  const alerts: AlertSummary[] = [];

  if (params.monthlySavings < 0) {
    alerts.push({
      severity: 'critical',
      category: 'cash_flow',
      title: 'Monthly cash flow is negative',
      description: `Recurring expenses exceed normalized income by ${roundMoney(Math.abs(params.monthlySavings)).toLocaleString()} SAR.`,
    });
  }

  const firstUnderfunded = params.obligations.find((item) => item.fundingGap > 0);
  if (firstUnderfunded) {
    alerts.push({
      severity: firstUnderfunded.daysUntilDue <= 60 ? 'critical' : 'warning',
      category: 'obligation',
      title: `${firstUnderfunded.title} is underfunded`,
      description: `Coverage is ${firstUnderfunded.coverageRatio.toFixed(2)}x with a ${firstUnderfunded.fundingGap.toLocaleString()} SAR gap.`,
    });
  }

  const firstCritical = params.forecastRows.find((row) => row.status === 'CRITICAL');
  if (firstCritical) {
    alerts.push({
      severity: 'critical',
      category: 'forecast',
      title: `Forecast turns critical in ${firstCritical.label}`,
      description: `Projected closing balance drops to ${firstCritical.closingBalance.toLocaleString()} SAR.`,
    });
  }

  if (params.monthlyExpenses > 0 && (params.liquidCash / params.monthlyExpenses) < 3) {
    alerts.push({
      severity: 'warning',
      category: 'liquidity',
      title: 'Liquidity buffer is below 3 months',
      description: `Liquid reserves cover ${(params.liquidCash / params.monthlyExpenses).toFixed(1)} months of recurring expenses.`,
    });
  }

  if (params.fireProgressPct < 10 && params.monthlySavings <= 0) {
    alerts.push({
      severity: 'info',
      category: 'fire',
      title: 'FIRE progress is stalled',
      description: 'Investable assets are still early and there is no positive annual savings feeding the plan.',
    });
  }

  return alerts;
}

function buildSnapshotFromRawData(params: FinancialWorkspaceData): FinancialSnapshot {
  const holdings = params.holdings ?? [];
  const assets = params.assets ?? [];
  const liabilities = params.liabilities ?? [];
  const incomeEntries = params.incomeEntries ?? [];
  const expenseEntries = params.expenseEntries ?? [];
  const budgetLimits = params.budgetLimits ?? [];
  const recurringObligations = params.recurringObligations ?? [];
  const oneTimeExpenses = params.oneTimeExpenses ?? [];
  const savingsAccounts = params.savingsAccounts ?? [];
  const currency = params.currency ?? 'SAR';
  const generatedAt = new Date().toISOString();
  const snapshotDate = params.snapshotDate ?? generatedAt;
  const version = String(params.version ?? snapshotDate);

  const incomeSources = incomeEntries.map<IncomeSourceSummary>((entry) => ({
    id: entry.id,
    label: entry.sourceName || entry.source,
    amount: roundMoney(entry.amount),
    normalizedMonthlyAmount: roundMoney(normalizeMonthlyIncome(entry)),
    frequency: entry.frequency,
    recurring: entry.isRecurring,
  }));
  const monthlyIncome = incomeSources.reduce((sum, entry) => sum + entry.normalizedMonthlyAmount, 0);

  const monthlyExpenses = averageMonthlyExpenses(expenseEntries);
  const essentialMonthly = averageMonthlyExpensesByCategory(expenseEntries, new Set([
    'Housing',
    'Food',
    'Transport',
    'Utilities',
    'Healthcare',
    'Education',
    'Household',
  ]));
  const variableMonthly = averageMonthlyExpensesByCategory(expenseEntries, new Set([
    'Entertainment',
    'Shopping',
    'Other',
  ]));

  const savingsSummaries = savingsAccounts.map<SavingsAccountSummary>((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    provider: account.provider,
    currentBalance: roundMoney(account.currentBalance),
    maturityDate: account.maturityDate,
    status: account.status,
    isLiquid: isLiquidSavingsAccount(account),
    expectedMaturityValue: getSavingsMaturityValue(account),
  }));

  const liquidCash = assets
    .filter((asset) => asset.category === 'cash')
    .reduce((sum, asset) => sum + asset.value, 0)
    + savingsAccounts
      .filter((account) => account.status === 'active' && isLiquidSavingsAccount(account))
      .reduce((sum, account) => sum + account.currentBalance, 0);
  const totalLockedSavings = savingsAccounts
    .filter((account) => account.status === 'active' && !isLiquidSavingsAccount(account))
    .reduce((sum, account) => sum + account.currentBalance, 0);
  const portfolioValue = holdings.reduce((sum, holding) => sum + (holding.shares * holding.currentPrice), 0);
  const stocks = holdings
    .filter((holding) => classifyHoldingAssetClass(holding) !== 'funds')
    .reduce((sum, holding) => sum + (holding.shares * holding.currentPrice), 0);
  const funds = holdings
    .filter((holding) => classifyHoldingAssetClass(holding) === 'funds')
    .reduce((sum, holding) => sum + (holding.shares * holding.currentPrice), 0);
  const totalInvestments = portfolioValue;

  const assetsExcludingSavings = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalAssets = assetsExcludingSavings + savingsAccounts.reduce((sum, account) => sum + account.currentBalance, 0) + totalInvestments;
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  const grossNetWorth = liquidCash + totalLockedSavings + totalInvestments + assets
    .filter((asset) => asset.category !== 'cash')
    .reduce((sum, asset) => sum + asset.value, 0);
  const netWorth = totalAssets - totalLiabilities;
  const liquidNetWorth = liquidCash - totalLiabilities;

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const emergencyFundTarget = monthlyExpenses * 6;
  const emergencyFundMonths = monthlyExpenses > 0 ? liquidCash / monthlyExpenses : 0;

  const sectorExposure = Object.entries(
    holdings.reduce<Record<string, number>>((acc, holding) => {
      const key = holding.sector || 'Other';
      acc[key] = (acc[key] ?? 0) + (holding.shares * holding.currentPrice);
      return acc;
    }, {})
  ).map(([sector, value]) => ({
    sector,
    value: roundMoney(value),
    weightPct: portfolioValue > 0 ? Number(((value / portfolioValue) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.value - a.value);

  const exchangeExposure = Object.entries(
    holdings.reduce<Record<string, number>>((acc, holding) => {
      acc[holding.exchange] = (acc[holding.exchange] ?? 0) + (holding.shares * holding.currentPrice);
      return acc;
    }, {})
  ).map(([exchange, value]) => ({
    exchange,
    value: roundMoney(value),
    weightPct: portfolioValue > 0 ? Number(((value / portfolioValue) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.value - a.value);

  const assetClassExposure = Object.entries(
    holdings.reduce<Record<string, number>>((acc, holding) => {
      const key = classifyHoldingAssetClass(holding);
      acc[key] = (acc[key] ?? 0) + (holding.shares * holding.currentPrice);
      return acc;
    }, {})
  ).map(([assetClass, value]) => ({
    assetClass,
    value: roundMoney(value),
    weightPct: portfolioValue > 0 ? Number(((value / portfolioValue) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.value - a.value);

  const annualExpenses = monthlyExpenses * 12;
  const annualSavings = Math.max(monthlySavings, 0) * 12;
  const fireNumber = annualExpenses * 25;
  const currentInvestableAssets = totalInvestments + totalLockedSavings;
  const fireProgressPct = fireNumber > 0 ? (currentInvestableAssets / fireNumber) * 100 : 0;
  const yearsToFire = calculateYearsToFire(currentInvestableAssets, fireNumber, annualSavings);

  const obligationSummaries = buildObligationSummaries({
    recurringObligations,
    liquidCash,
    monthlySurplus: monthlySavings,
  });
  const totalPending = obligationSummaries.reduce((sum, item) => sum + item.amount, 0);
  const nextDue = obligationSummaries[0] ?? null;
  const obligationsCoverageRatio = totalPending > 0 ? liquidCash / totalPending : 1;
  const atRiskCount = obligationSummaries.filter((item) => item.fundingGap > 0).length;

  const forecastRows = buildForecastRows({
    liquidCash,
    monthlyIncome,
    monthlyExpenses,
    recurringObligations,
    oneTimeExpenses,
    savingsAccounts,
  });
  const firstAtRiskMonth = forecastRows.find((row) => row.status === 'AT_RISK' || row.status === 'CRITICAL') ?? null;
  const firstCriticalMonth = forecastRows.find((row) => row.status === 'CRITICAL') ?? null;

  const riskyAssetSharePct = assetClassExposure
    .filter((item) => item.assetClass === 'equities' || item.assetClass === 'crypto')
    .reduce((sum, item) => sum + item.weightPct, 0);
  const riskProfile = inferRiskProfile({ emergencyFundMonths, savingsRate, riskyAssetSharePct });

  const alerts = buildAlerts({
    monthlySavings,
    obligations: obligationSummaries,
    forecastRows,
    fireProgressPct,
    liquidCash,
    monthlyExpenses,
  });

  const activeGoals: FinancialGoalSnapshot[] = [
    {
      id: 'fire-goal',
      name: 'FIRE',
      targetAmount: roundMoney(fireNumber),
      currentAmount: roundMoney(currentInvestableAssets),
      progressPct: Number(Math.max(0, Math.min(fireProgressPct, 100)).toFixed(2)),
      targetDate: yearsToFire === null ? null : `${new Date().getFullYear() + yearsToFire}-01-01`,
      monthlyContribution: roundMoney(Math.max(monthlySavings, 0)),
      status: buildGoalStatus(fireProgressPct),
    },
    {
      id: 'emergency-fund',
      name: 'Emergency Fund',
      targetAmount: roundMoney(emergencyFundTarget),
      currentAmount: roundMoney(liquidCash),
      progressPct: Number(Math.max(0, Math.min(emergencyFundTarget > 0 ? (liquidCash / emergencyFundTarget) * 100 : 0, 100)).toFixed(2)),
      targetDate: null,
      monthlyContribution: roundMoney(Math.max(monthlySavings, 0)),
      status: buildGoalStatus(emergencyFundTarget > 0 ? (liquidCash / emergencyFundTarget) * 100 : 0),
    },
  ];

  const topHoldingWeightPct = exchangeExposure.length === 0 && holdings.length === 0
    ? 0
    : holdings
      .map((holding) => (holding.shares * holding.currentPrice))
      .sort((a, b) => b - a)[0] / Math.max(portfolioValue, 1) * 100;

  const oneTimeUpcoming = oneTimeExpenses
    .filter((item) => item.status !== 'paid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map<OneTimeExpenseSummary>((item) => ({
      id: item.id,
      title: item.title,
      amount: roundMoney(item.amount),
      dueDate: item.dueDate,
      priority: item.priority,
      fundingSource: item.fundingSource,
      status: item.status,
    }));

  const watchlistAlternatives = buildWatchlistAlternatives({
    assetClassExposure,
    exchangeExposure,
    emergencyFundMonths,
  });

  return {
    generatedAt,
    snapshotDate,
    currency,
    version,
    income: {
      monthlyNormalized: roundMoney(monthlyIncome),
      annualized: roundMoney(monthlyIncome * 12),
      sources: incomeSources,
    },
    expenses: {
      monthlyNormalized: roundMoney(monthlyExpenses),
      essentialMonthly: roundMoney(essentialMonthly),
      variableMonthly: roundMoney(variableMonthly),
      oneTimeUpcoming,
    },
    savings: {
      liquidCash: roundMoney(liquidCash),
      savingsAccounts: savingsSummaries,
      totalLockedSavings: roundMoney(totalLockedSavings),
    },
    budgetOverview: {
      totalBudgetLimits: roundMoney(budgetLimits.reduce((sum, limit) => sum + limit.limit, 0)),
      monthlyIncome: roundMoney(monthlyIncome),
      monthlyExpenses: roundMoney(monthlyExpenses),
      monthlySurplus: roundMoney(monthlySavings),
    },
    obligations: {
      pending: obligationSummaries,
      totalPending: roundMoney(totalPending),
      nextDue,
      coverageRatio: Number(obligationsCoverageRatio.toFixed(2)),
      atRiskCount,
    },
    portfolio: {
      totalInvestments: roundMoney(totalInvestments),
      stocks: roundMoney(stocks),
      funds: roundMoney(funds),
    },
    forecast: {
      monthlyRows: forecastRows,
      firstAtRiskMonth,
      firstCriticalMonth,
      endingBalance: roundMoney(forecastRows.at(-1)?.closingBalance ?? liquidCash),
    },
    netWorth: {
      liquid: roundMoney(liquidCash),
      locked: roundMoney(totalLockedSavings),
      investments: roundMoney(totalInvestments),
      obligations: roundMoney(totalLiabilities),
      gross: roundMoney(grossNetWorth),
      net: roundMoney(netWorth),
      liquidNetWorth: roundMoney(liquidNetWorth),
    },
    fire: {
      annualExpenses: roundMoney(annualExpenses),
      annualSavings: roundMoney(annualSavings),
      fireNumber: roundMoney(fireNumber),
      currentInvestableAssets: roundMoney(currentInvestableAssets),
      progressPct: Number(Math.max(0, Math.min(fireProgressPct, 100)).toFixed(2)),
      yearsToFire,
    },
    alerts,
    holdings,
    assets,
    liabilities,
    budgetLimits,
    recurringObligations,
    oneTimeExpenses,
    savingsAccounts,
    activeGoals,
    watchlistAlternatives,
    sectorExposure,
    exchangeExposure,
    assetClassExposure,
    topHoldingWeightPct: Number(topHoldingWeightPct.toFixed(2)),
    riskProfile,
    netWorthValue: roundMoney(netWorth),
    totalAssets: roundMoney(totalAssets),
    totalLiabilities: roundMoney(totalLiabilities),
    portfolioValue: roundMoney(portfolioValue),
    liquidReserves: roundMoney(liquidCash),
    monthlyIncome: roundMoney(monthlyIncome),
    monthlyExpenses: roundMoney(monthlyExpenses),
    monthlySavings: roundMoney(monthlySavings),
    monthlySurplus: roundMoney(monthlySavings),
    savingsRate: Number(savingsRate.toFixed(2)),
    emergencyFundTarget: roundMoney(emergencyFundTarget),
    emergencyFundMonths: Number(emergencyFundMonths.toFixed(2)),
    netWorthLegacy: roundMoney(netWorth),
  };
}

export function buildFinancialSnapshotFromWorkspaceData(data: FinancialWorkspaceData) {
  return buildSnapshotFromRawData(data);
}

export function buildFinancialSnapshotFromWorkspace(workspace: RemoteUserWorkspace): FinancialSnapshot {
  return buildSnapshotFromRawData({
    snapshotDate: new Date().toISOString(),
    currency: 'SAR',
    holdings: workspace.portfolioHoldings ?? [],
    assets: workspace.assets ?? [],
    liabilities: workspace.liabilities ?? [],
    incomeEntries: workspace.incomeEntries ?? [],
    expenseEntries: workspace.expenseEntries ?? [],
    budgetLimits: workspace.budgetLimits ?? [],
    recurringObligations: workspace.recurringObligations ?? [],
    oneTimeExpenses: workspace.oneTimeExpenses ?? [],
    savingsAccounts: workspace.savingsAccounts ?? [],
  });
}

export function buildFinancialSnapshotFromClientContext(context: ClientFinancialContext): FinancialSnapshot {
  return buildSnapshotFromRawData({
    snapshotDate: context.snapshotDate,
    currency: context.currency ?? 'SAR',
    version: context.version,
    holdings: context.holdings ?? [],
    assets: context.assets ?? [],
    liabilities: context.liabilities ?? [],
    incomeEntries: context.incomeEntries ?? [],
    expenseEntries: context.expenseEntries ?? [],
    budgetLimits: context.budgetLimits ?? [],
    recurringObligations: context.recurringObligations ?? [],
    oneTimeExpenses: context.oneTimeExpenses ?? [],
    savingsAccounts: context.savingsAccounts ?? [],
  });
}

export function hasCompleteFinancialContext(context: FinancialWorkspaceData | null | undefined) {
  if (!context) {
    return false;
  }

  return Array.isArray(context.holdings)
    && Array.isArray(context.assets)
    && Array.isArray(context.liabilities)
    && Array.isArray(context.incomeEntries)
    && Array.isArray(context.expenseEntries)
    && Array.isArray(context.budgetLimits)
    && Array.isArray(context.recurringObligations)
    && Array.isArray(context.oneTimeExpenses)
    && Array.isArray(context.savingsAccounts);
}

export function getMonthlyIncome(snapshot: FinancialSnapshot) {
  return snapshot.income.monthlyNormalized;
}

export function getMonthlyExpenses(snapshot: FinancialSnapshot) {
  return snapshot.expenses.monthlyNormalized;
}

export function getNetMonthlySurplus(snapshot: FinancialSnapshot) {
  return roundMoney(getMonthlyIncome(snapshot) - getMonthlyExpenses(snapshot));
}

export function getNetWorth(snapshot: FinancialSnapshot) {
  return snapshot.netWorth.net;
}

export function getLiquidNetWorth(snapshot: FinancialSnapshot) {
  return snapshot.netWorth.liquidNetWorth;
}

export function getLockedSavings(snapshot: FinancialSnapshot) {
  return snapshot.savings.totalLockedSavings;
}

export function getFireMetrics(snapshot: FinancialSnapshot) {
  return snapshot.fire;
}

export function getDecisionCheckContext(snapshot: FinancialSnapshot): DecisionCheckContext {
  return {
    holdings: snapshot.holdings,
    assets: snapshot.assets,
    liabilities: snapshot.liabilities,
    income: snapshot.income,
    expenses: snapshot.expenses,
    budgets: snapshot.budgetLimits,
    obligations: snapshot.obligations,
    oneTimeExpenses: snapshot.oneTimeExpenses,
    savings: snapshot.savings,
    forecast: snapshot.forecast,
    netWorth: snapshot.netWorth,
    liquidity: {
      liquidCash: snapshot.savings.liquidCash,
      liquidNetWorth: snapshot.netWorth.liquidNetWorth,
      coverageRatio: snapshot.obligations.coverageRatio,
    },
  };
}
