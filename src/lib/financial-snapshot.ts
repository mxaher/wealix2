import type { RemoteUserWorkspace } from '@/lib/remote-user-data';
import type {
  AssetEntry,
  ExpenseEntry,
  IncomeEntry,
  LiabilityEntry,
  PortfolioHolding,
} from '@/store/useAppStore';

type GoalStatus = 'on_track' | 'watch' | 'off_track';
type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

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

export type FinancialSnapshot = {
  snapshotDate: string;
  currency: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  portfolioValue: number;
  liquidReserves: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  emergencyFundTarget: number;
  emergencyFundMonths: number;
  riskProfile: RiskProfile;
  holdings: PortfolioHolding[];
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  activeGoals: FinancialGoalSnapshot[];
  watchlistAlternatives: WatchlistAlternative[];
  sectorExposure: Array<{ sector: string; value: number; weightPct: number }>;
  exchangeExposure: Array<{ exchange: string; value: number; weightPct: number }>;
  assetClassExposure: Array<{ assetClass: string; value: number; weightPct: number }>;
  topHoldingWeightPct: number;
};

export type ClientFinancialContext = {
  snapshotDate?: string;
  currency?: string;
  holdings?: PortfolioHolding[];
  assets?: AssetEntry[];
  liabilities?: LiabilityEntry[];
  incomeEntries?: IncomeEntry[];
  expenseEntries?: ExpenseEntry[];
  budgetLimits?: Array<{ category: string; limit: number }>;
};

function normalizeMonthlyIncome(entry: IncomeEntry) {
  if (!entry.isRecurring && !entry.date.startsWith(new Date().toISOString().slice(0, 7))) {
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
      : new Date().toISOString().slice(0, 7);
    acc[month] = (acc[month] ?? 0) + entry.amount;
    return acc;
  }, {});

  const months = Object.keys(totalsByMonth).length || 1;
  const total = Object.values(totalsByMonth).reduce((sum, value) => sum + value, 0);
  return total / months;
}

function classifyHoldingAssetClass(holding: PortfolioHolding) {
  if (holding.exchange === 'GOLD' || /gold|xau|ذهب/i.test(holding.name) || /xau/i.test(holding.ticker)) {
    return 'gold';
  }
  if (/btc|bitcoin|eth|ethereum|crypto/i.test(`${holding.name} ${holding.ticker}`)) {
    return 'crypto';
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

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function buildSnapshotFromRawData(params: {
  snapshotDate?: string;
  currency?: string;
  holdings: PortfolioHolding[];
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
}): FinancialSnapshot {
  const {
    snapshotDate,
    currency = 'SAR',
    holdings,
    assets,
    liabilities,
    incomeEntries,
    expenseEntries,
  } = params;

  const portfolioValue = holdings.reduce((sum, holding) => sum + (holding.shares * holding.currentPrice), 0);
  const assetValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalAssets = assetValue + portfolioValue;
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const liquidReserves = assets
    .filter((asset) => asset.category === 'cash')
    .reduce((sum, asset) => sum + asset.value, 0);

  const monthlyIncome = incomeEntries.reduce((sum, entry) => sum + normalizeMonthlyIncome(entry), 0);
  const monthlyExpenses = averageMonthlyExpenses(expenseEntries);
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const emergencyFundTarget = monthlyExpenses * 6;
  const emergencyFundMonths = monthlyExpenses > 0 ? liquidReserves / monthlyExpenses : 0;

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

  const fireTarget = monthlyExpenses * 12 * 28.5;
  const fireProgress = fireTarget > 0 ? (netWorth / fireTarget) * 100 : 0;
  const emergencyProgress = emergencyFundTarget > 0 ? (liquidReserves / emergencyFundTarget) * 100 : 0;
  const riskyAssetSharePct = assetClassExposure
    .filter((item) => item.assetClass === 'equities' || item.assetClass === 'crypto')
    .reduce((sum, item) => sum + item.weightPct, 0);
  const riskProfile = inferRiskProfile({ emergencyFundMonths, savingsRate, riskyAssetSharePct });

  const activeGoals: FinancialGoalSnapshot[] = [
    {
      id: 'fire-goal',
      name: 'FIRE',
      targetAmount: roundMoney(fireTarget),
      currentAmount: roundMoney(netWorth),
      progressPct: Number(Math.max(0, Math.min(fireProgress, 100)).toFixed(2)),
      targetDate: null,
      monthlyContribution: roundMoney(Math.max(monthlySavings, 0)),
      status: buildGoalStatus(fireProgress),
    },
    {
      id: 'emergency-fund',
      name: 'Emergency Fund',
      targetAmount: roundMoney(emergencyFundTarget),
      currentAmount: roundMoney(liquidReserves),
      progressPct: Number(Math.max(0, Math.min(emergencyProgress, 100)).toFixed(2)),
      targetDate: null,
      monthlyContribution: roundMoney(Math.max(monthlySavings, 0)),
      status: buildGoalStatus(emergencyProgress),
    },
  ];

  const topHoldingWeightPct = exchangeExposure.length === 0 && holdings.length === 0
    ? 0
    : holdings
      .map((holding) => (holding.shares * holding.currentPrice))
      .sort((a, b) => b - a)[0] / Math.max(portfolioValue, 1) * 100;

  const watchlistAlternatives = buildWatchlistAlternatives({
    assetClassExposure,
    exchangeExposure,
    emergencyFundMonths,
  });

  return {
    snapshotDate: snapshotDate ?? new Date().toISOString(),
    currency,
    netWorth: roundMoney(netWorth),
    totalAssets: roundMoney(totalAssets),
    totalLiabilities: roundMoney(totalLiabilities),
    portfolioValue: roundMoney(portfolioValue),
    liquidReserves: roundMoney(liquidReserves),
    monthlyIncome: roundMoney(monthlyIncome),
    monthlyExpenses: roundMoney(monthlyExpenses),
    monthlySavings: roundMoney(monthlySavings),
    savingsRate: Number(savingsRate.toFixed(2)),
    emergencyFundTarget: roundMoney(emergencyFundTarget),
    emergencyFundMonths: Number(emergencyFundMonths.toFixed(2)),
    riskProfile,
    holdings,
    assets,
    liabilities,
    activeGoals,
    watchlistAlternatives,
    sectorExposure,
    exchangeExposure,
    assetClassExposure,
    topHoldingWeightPct: Number(topHoldingWeightPct.toFixed(2)),
  };
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
  });
}

export function buildFinancialSnapshotFromClientContext(context: ClientFinancialContext): FinancialSnapshot {
  return buildSnapshotFromRawData({
    snapshotDate: context.snapshotDate,
    currency: context.currency ?? 'SAR',
    holdings: context.holdings ?? [],
    assets: context.assets ?? [],
    liabilities: context.liabilities ?? [],
    incomeEntries: context.incomeEntries ?? [],
    expenseEntries: context.expenseEntries ?? [],
  });
}
