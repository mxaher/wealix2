import type { RemoteUserWorkspace } from '@/lib/remote-user-data';
import { buildFinancialSnapshotFromClientContext, buildFinancialSnapshotFromWorkspace, type ClientFinancialContext, type FinancialSnapshot } from '@/lib/financial-snapshot';
import type { BudgetLimit, ExpenseCategory, ExpenseEntry, IncomeEntry, OneTimeExpense, RecurringObligation, SavingsAccount } from '@/store/useAppStore';

type AlertSeverity = 'info' | 'warning' | 'critical';
type AlertCategory = 'income' | 'budget' | 'obligation' | 'forecast' | 'liquidity' | 'portfolio' | 'emergency_fund';
type MonthStatus = 'ON_TRACK' | 'SURPLUS_LOW' | 'AT_RISK' | 'CRITICAL' | 'OBLIGATION_DUE';

export type WealixAIAlert = {
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
};

export type WealixForecastMonth = {
  month: string;
  label: string;
  openingBalance: number;
  income: number;
  recurringExpenses: number;
  obligationPayments: number;
  closingBalance: number;
  status: MonthStatus;
};

export type WealixAIContext = {
  snapshotDate: string;
  currency: string;
  onboardingProfile?: OnboardingProfile | null;
  healthScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  missingDataFlags: string[];
  profileCompleteness: number;
  financialSnapshot: FinancialSnapshot;
  monthlyIncome: number;
  annualIncome: number;
  monthlyExpenses: number;
  monthlySurplus: number;
  savingsRate: number;
  expenseToIncomeRatio: number;
  emergencyFundMonths: number;
  debtToIncomeRatio: number;
  liquidNetWorth: number;
  netWorthGross: number;
  netWorthNet: number;
  needsRatio: number;
  wantsRatio: number;
  savingsAndObligationsRatio: number;
  incomeVolatilityRisk: 'LOW' | 'HIGH';
  portfolioToLiquidRatio: number;
  largestExpenseCategory: {
    category: string;
    amount: number;
    sharePct: number;
  } | null;
  budgets: Array<{
    category: string;
    planned: number;
    actual: number;
    utilizationPct: number;
    variance: number;
    status: 'healthy' | 'warning' | 'breached';
  }>;
  obligations: Array<{
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    daysUntilDue: number;
    urgency: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
    status: string;
    availableFunding: number;
    fundingGap: number;
    coverageRatio: number;
  }>;
  upcomingEvents: Array<{
    type: 'obligation' | 'maturity' | 'budget';
    title: string;
    date: string;
    amount?: number;
  }>;
  forecast: WealixForecastMonth[];
  firstAtRiskMonth: WealixForecastMonth | null;
  alerts: WealixAIAlert[];
  topPriorityActions: string[];
  narrativeSummary: string;
};

export type OnboardingProfile = {
  monthlyIncome?: number | null;
  riskTolerance?: string | null;
  preferredMarkets?: string[] | null;
  retirementGoal?: string | null;
  currentAge?: number | null;
  retirementAge?: number | null;
  currency?: string | null;
};

type ContextBuildInput = {
  userId: string;
  snapshot: FinancialSnapshot;
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  budgetLimits: BudgetLimit[];
  recurringObligations: RecurringObligation[];
  oneTimeExpenses: OneTimeExpense[];
  savingsAccounts: SavingsAccount[];
  onboardingProfile?: OnboardingProfile | null;
};

const ESSENTIAL_EXPENSE_CATEGORIES = new Set<ExpenseCategory>([
  'Housing',
  'Food',
  'Transport',
  'Utilities',
  'Healthcare',
  'Education',
  'Household',
]);

const DISCRETIONARY_EXPENSE_CATEGORIES = new Set<ExpenseCategory>([
  'Entertainment',
  'Shopping',
]);

const FALLBACK_BUDGET_LIMIT_COLORS: Record<string, string> = {
  housing: '#D4A843',
  food: '#10B981',
  transport: '#3B82F6',
  entertainment: '#8B5CF6',
  utilities: '#F59E0B',
  investment: '#06B6D4',
  zakat: '#EC4899',
  other: '#6B7280',
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function normalizeBudgetLimits(
  budgetLimits: Array<BudgetLimit | Pick<BudgetLimit, 'category' | 'limit'>>
): BudgetLimit[] {
  return budgetLimits.map((budget) => ({
    ...budget,
    color: 'color' in budget && typeof budget.color === 'string'
      ? budget.color
      : FALLBACK_BUDGET_LIMIT_COLORS[budget.category.toLowerCase()] ?? '#6B7280',
  }));
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
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

function buildBudgetStatus(expenseEntries: ExpenseEntry[], budgetLimits: BudgetLimit[]) {
  const currentMonth = monthKey(new Date());
  const actuals = expenseEntries
    .filter((entry) => entry.date.startsWith(currentMonth))
    .reduce<Record<string, number>>((acc, entry) => {
      const key = entry.category.toLowerCase();
      acc[key] = (acc[key] ?? 0) + entry.amount;
      return acc;
    }, {});

  return budgetLimits.map((budget) => {
    const actual = actuals[budget.category] ?? 0;
    const utilizationPct = budget.limit > 0 ? (actual / budget.limit) * 100 : 0;
    const variance = budget.limit - actual;
    const status = utilizationPct > 110 ? 'breached' : utilizationPct > 100 ? 'warning' : 'healthy';

    return {
      category: budget.category,
      planned: roundMoney(budget.limit),
      actual: roundMoney(actual),
      utilizationPct: Number(utilizationPct.toFixed(1)),
      variance: roundMoney(variance),
      status,
    } as const;
  });
}

function categoryBreakdown(expenseEntries: ExpenseEntry[]) {
  const totals = expenseEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + entry.amount;
    return acc;
  }, {});

  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const ranked = Object.entries(totals)
    .map(([category, amount]) => ({
      category,
      amount: roundMoney(amount),
      sharePct: total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    ranked,
    needs: ranked
      .filter((item) => ESSENTIAL_EXPENSE_CATEGORIES.has(item.category as ExpenseCategory))
      .reduce((sum, item) => sum + item.amount, 0),
    wants: ranked
      .filter((item) => DISCRETIONARY_EXPENSE_CATEGORIES.has(item.category as ExpenseCategory))
      .reduce((sum, item) => sum + item.amount, 0),
  };
}

function buildAlerts(context: {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySurplus: number;
  savingsRate: number;
  expenseToIncomeRatio: number;
  emergencyFundMonths: number;
  largestExpenseCategory: WealixAIContext['largestExpenseCategory'];
  budgets: WealixAIContext['budgets'];
  obligations: WealixAIContext['obligations'];
  forecast: WealixForecastMonth[];
  portfolioToLiquidRatio: number;
  topHoldingWeightPct: number;
  topSectorWeightPct: number;
  oneTimeExpenses: OneTimeExpense[];
  savingsAccounts: SavingsAccount[];
}) {
  const alerts: WealixAIAlert[] = [];

  if (context.savingsRate < 10) {
    alerts.push({
      severity: 'critical',
      category: 'income',
      title: 'Savings rate is below 10%',
      description: `Monthly surplus is only ${roundMoney(context.monthlySurplus)} SAR, which leaves almost no room for shocks.`,
    });
  } else if (context.savingsRate < 20) {
    alerts.push({
      severity: 'warning',
      category: 'income',
      title: 'Savings rate is below the healthy range',
      description: `Savings rate is ${context.savingsRate.toFixed(1)}%, so any new obligation will tighten the plan quickly.`,
    });
  }

  if (context.expenseToIncomeRatio > 100) {
    alerts.push({
      severity: 'critical',
      category: 'budget',
      title: 'Monthly spending exceeds income',
      description: `Expense-to-income is ${context.expenseToIncomeRatio.toFixed(1)}%, which means debt pressure is likely if unchanged.`,
    });
  } else if (context.expenseToIncomeRatio > 90) {
    alerts.push({
      severity: 'warning',
      category: 'budget',
      title: 'Monthly buffer is too thin',
      description: `Expense-to-income is ${context.expenseToIncomeRatio.toFixed(1)}%, leaving limited monthly flexibility.`,
    });
  }

  for (const budget of context.budgets.filter((item) => item.utilizationPct > 110)) {
    alerts.push({
      severity: 'warning',
      category: 'budget',
      title: `${budget.category} budget is breached`,
      description: `${budget.category} is at ${budget.utilizationPct.toFixed(1)}% of plan, overshooting by ${Math.abs(budget.variance).toLocaleString()} SAR.`,
    });
  }

  for (const obligation of context.obligations.filter((item) => item.fundingGap > 0 || (item.daysUntilDue <= 30 && item.coverageRatio < 1))) {
    alerts.push({
      severity: obligation.daysUntilDue <= 30 || obligation.coverageRatio < 0.8 ? 'critical' : 'warning',
      category: 'obligation',
      title: `${obligation.title} is underfunded`,
      description: `${obligation.fundingGap.toLocaleString()} SAR gap remains for ${obligation.dueDate} with only ${obligation.coverageRatio.toFixed(2)}x coverage.`,
    });
  }

  for (const expense of context.oneTimeExpenses.filter((item) => item.status !== 'paid')) {
    const daysUntilDue = Math.round((new Date(expense.dueDate).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 60) {
      alerts.push({
        severity: daysUntilDue <= 30 ? 'critical' : 'warning',
        category: 'forecast',
        title: `${expense.title} is approaching`,
        description: `${expense.amount.toLocaleString()} SAR is due on ${expense.dueDate} as a one-time expense.`,
      });
    }
  }

  for (const account of context.savingsAccounts.filter((item) => item.status === 'active')) {
    const daysUntilMaturity = Math.round((new Date(account.maturityDate).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
    if (daysUntilMaturity <= 30 && account.type !== 'current') {
      const maturityValue = account.principal + (account.principal * (account.annualProfitRate / 100) * (account.termMonths / 12));
      alerts.push({
        severity: 'warning',
        category: 'liquidity',
        title: `${account.name} matures soon`,
        description: `Expected maturity value is ${roundMoney(maturityValue).toLocaleString()} SAR on ${account.maturityDate}.`,
      });
    }
  }

  const firstNegativeMonth = context.forecast.find((item) => item.closingBalance < 0);
  if (firstNegativeMonth) {
    alerts.push({
      severity: 'critical',
      category: 'forecast',
      title: `Forecast turns negative in ${firstNegativeMonth.label}`,
      description: `Projected closing balance is ${firstNegativeMonth.closingBalance.toLocaleString()} SAR after obligations.`,
    });
  } else {
    const firstLowBufferMonth = context.forecast.find((item) => item.closingBalance < context.monthlyExpenses);
    if (firstLowBufferMonth) {
      alerts.push({
        severity: 'warning',
        category: 'forecast',
        title: `Low cash buffer in ${firstLowBufferMonth.label}`,
        description: `Projected balance falls to ${firstLowBufferMonth.closingBalance.toLocaleString()} SAR, below one month of expenses.`,
      });
    }
  }

  if (context.emergencyFundMonths < 3) {
    alerts.push({
      severity: 'critical',
      category: 'emergency_fund',
      title: 'Emergency fund is below the minimum floor',
      description: `Liquid cash covers only ${context.emergencyFundMonths.toFixed(1)} months of expenses.`,
    });
  }

  if (context.portfolioToLiquidRatio > 3) {
    alerts.push({
      severity: 'warning',
      category: 'portfolio',
      title: 'Portfolio is large versus liquid cash',
      description: `Portfolio-to-liquid ratio is ${context.portfolioToLiquidRatio.toFixed(1)}x, which increases liquidity risk if cash flow tightens.`,
    });
  }

  if (context.topSectorWeightPct > 60 || context.topHoldingWeightPct > 25) {
    alerts.push({
      severity: 'warning',
      category: 'portfolio',
      title: 'Portfolio concentration risk is elevated',
      description: `Top sector is ${context.topSectorWeightPct.toFixed(1)}% and top holding is ${context.topHoldingWeightPct.toFixed(1)}% of the portfolio.`,
    });
  }

  return alerts.slice(0, 12);
}

function buildNarrativeSummary(context: Pick<WealixAIContext,
  'monthlyIncome' |
  'monthlyExpenses' |
  'monthlySurplus' |
  'savingsRate' |
  'emergencyFundMonths' |
  'portfolioToLiquidRatio' |
  'obligations' |
  'firstAtRiskMonth' |
  'largestExpenseCategory' |
  'alerts'
>) {
  const nearTermObligation = context.obligations.find((item) => item.daysUntilDue <= 90);
  const largestExpenseLine = context.largestExpenseCategory
    ? `Largest expense pressure is ${context.largestExpenseCategory.category} at ${context.largestExpenseCategory.amount.toLocaleString()} SAR (${context.largestExpenseCategory.sharePct.toFixed(1)}% of logged spend).`
    : 'Expense concentration is not available yet.';
  const obligationLine = nearTermObligation
    ? `Nearest obligation is ${nearTermObligation.title} for ${nearTermObligation.amount.toLocaleString()} SAR due on ${nearTermObligation.dueDate} with ${nearTermObligation.coverageRatio.toFixed(2)}x projected coverage.`
    : 'No material obligation is due in the next 90 days.';
  const forecastLine = context.firstAtRiskMonth
    ? `The first forecast stress point is ${context.firstAtRiskMonth.label}, where projected closing cash falls to ${context.firstAtRiskMonth.closingBalance.toLocaleString()} SAR.`
    : 'The 12-month forecast remains above the monthly expense floor with current assumptions.';

  return [
    `Monthly income is ${context.monthlyIncome.toLocaleString()} SAR against ${context.monthlyExpenses.toLocaleString()} SAR of recurring outflow, leaving a ${context.monthlySurplus.toLocaleString()} SAR monthly surplus and a ${context.savingsRate.toFixed(1)}% savings rate.`,
    obligationLine,
    largestExpenseLine,
    `Emergency liquidity stands at ${context.emergencyFundMonths.toFixed(1)} months of coverage and portfolio-to-liquid is ${context.portfolioToLiquidRatio.toFixed(1)}x.`,
    forecastLine,
    context.alerts[0] ? `Top alert right now: ${context.alerts[0].title}.` : 'No active critical alerts are open right now.',
  ].join(' ');
}

function buildTopPriorityActions(alerts: WealixAIAlert[], largestExpenseCategory: WealixAIContext['largestExpenseCategory']) {
  const actions = alerts.slice(0, 3).map((alert) => alert.description);
  if (largestExpenseCategory) {
    actions.push(`Use ${largestExpenseCategory.category} as the main optimization lever before cutting smaller categories.`);
  }
  return actions.slice(0, 3);
}

function buildContext(input: ContextBuildInput): WealixAIContext {
  const { snapshot, expenseEntries, budgetLimits } = input;
  const profile = input.onboardingProfile;

  // Use profile monthlyIncome as override when income entries are sparse (< 1 entry)
  const derivedMonthlyIncome = roundMoney(snapshot.income.monthlyNormalized);
  const monthlyIncome = (
    profile?.monthlyIncome &&
    profile.monthlyIncome > 0 &&
    input.incomeEntries.length < 1
  )
    ? roundMoney(profile.monthlyIncome)
    : derivedMonthlyIncome;
  const monthlyExpenses = roundMoney(snapshot.expenses.monthlyNormalized);
  const monthlySurplus = roundMoney(snapshot.monthlySavings);
  const annualIncome = roundMoney((monthlyIncome * 12));
  const expenseToIncomeRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;
  const debtToIncomeRatio = annualIncome > 0 ? (snapshot.totalLiabilities / annualIncome) * 100 : 0;
  const liquidNetWorth = roundMoney(snapshot.netWorth.liquidNetWorth);
  const expenseBreakdown = categoryBreakdown(expenseEntries);
  const needsRatio = monthlyIncome > 0 ? (expenseBreakdown.needs / monthlyIncome) * 100 : 0;
  const wantsRatio = monthlyIncome > 0 ? (expenseBreakdown.wants / monthlyIncome) * 100 : 0;
  const savingsAndObligationsRatio = monthlyIncome > 0 ? (Math.max(monthlySurplus, 0) / monthlyIncome) * 100 : 0;
  const budgets = buildBudgetStatus(expenseEntries, budgetLimits);
  const obligations: WealixAIContext['obligations'] = snapshot.obligations.pending.map((item) => ({
    id: item.id,
    title: item.title,
    amount: item.amount,
    dueDate: item.dueDate,
    daysUntilDue: item.daysUntilDue,
    urgency: item.daysUntilDue <= 30
      ? 'IMMEDIATE'
      : item.daysUntilDue <= 90
        ? 'HIGH'
        : item.daysUntilDue <= 180
          ? 'MEDIUM'
          : 'LOW',
    status: item.status ?? 'upcoming',
    availableFunding: item.availableFunding,
    fundingGap: item.fundingGap,
    coverageRatio: item.coverageRatio,
  }));
  const forecast: WealixForecastMonth[] = snapshot.forecast.monthlyRows.map((row) => ({
    month: row.month,
    label: row.label,
    openingBalance: row.openingBalance,
    income: row.income,
    recurringExpenses: row.recurringExpenses + row.oneTimeExpenses - row.maturityInflows,
    obligationPayments: row.obligationPayments,
    closingBalance: row.closingBalance,
    status: row.status === 'SURPLUS_LOW' ? 'SURPLUS_LOW' : row.status,
  }));
  const firstAtRiskMonth = forecast.find((item) => item.status === 'CRITICAL' || item.status === 'AT_RISK') ?? null;
  const topSectorWeightPct = snapshot.sectorExposure[0]?.weightPct ?? 0;
  const portfolioToLiquidRatio = liquidNetWorth > 0 ? snapshot.portfolioValue / liquidNetWorth : snapshot.portfolioValue > 0 ? 999 : 0;
  const largestExpenseCategory = expenseBreakdown.ranked[0] ?? null;

  const alerts = buildAlerts({
    monthlyIncome,
    monthlyExpenses,
    monthlySurplus,
    savingsRate: snapshot.savingsRate,
    expenseToIncomeRatio,
    emergencyFundMonths: snapshot.emergencyFundMonths,
    largestExpenseCategory,
    budgets,
    obligations,
    forecast,
    portfolioToLiquidRatio,
    topHoldingWeightPct: snapshot.topHoldingWeightPct,
    topSectorWeightPct,
    oneTimeExpenses: input.oneTimeExpenses,
    savingsAccounts: input.savingsAccounts,
  }).sort((left, right) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    return rank[left.severity] - rank[right.severity];
  });

  const missingDataFlags = [
    ...(input.incomeEntries.length > 0 ? [] : ['income_entries']),
    ...(input.expenseEntries.length > 0 ? [] : ['expense_entries']),
    ...(budgetLimits.length > 0 ? [] : ['budget_limits']),
    ...(input.recurringObligations.length > 0 ? [] : ['recurring_obligations']),
    ...(input.oneTimeExpenses.length > 0 ? [] : ['one_time_expenses']),
    ...(input.savingsAccounts.length > 0 ? [] : ['savings_accounts']),
    ...(snapshot.holdings.length > 0 ? [] : ['portfolio_holdings']),
  ];

  const healthPenalty = (
    alerts.filter((item) => item.severity === 'critical').length * 16
    + alerts.filter((item) => item.severity === 'warning').length * 7
    + (missingDataFlags.length * 3)
  );
  const healthScore = Math.max(18, Math.min(96, 88 - healthPenalty));
  const riskLevel = healthScore < 35
    ? 'CRITICAL'
    : healthScore < 55
      ? 'HIGH'
      : healthScore < 75
        ? 'MEDIUM'
        : 'LOW';

  return {
    snapshotDate: snapshot.snapshotDate,
    currency: profile?.currency ?? snapshot.currency,
    onboardingProfile: profile ?? null,
    healthScore,
    riskLevel,
    missingDataFlags,
    profileCompleteness: Math.max(0, 100 - (missingDataFlags.length * 18)),
    financialSnapshot: snapshot,
    monthlyIncome,
    annualIncome,
    monthlyExpenses,
    monthlySurplus,
    savingsRate: snapshot.savingsRate,
    expenseToIncomeRatio: Number(expenseToIncomeRatio.toFixed(1)),
    emergencyFundMonths: snapshot.emergencyFundMonths,
    debtToIncomeRatio: Number(debtToIncomeRatio.toFixed(1)),
    liquidNetWorth,
    netWorthGross: snapshot.totalAssets,
    netWorthNet: snapshot.netWorth.net,
    needsRatio: Number(needsRatio.toFixed(1)),
    wantsRatio: Number(wantsRatio.toFixed(1)),
    savingsAndObligationsRatio: Number(savingsAndObligationsRatio.toFixed(1)),
    incomeVolatilityRisk: input.incomeEntries.length > 0 && input.incomeEntries[0]
      ? (() => {
          const bySource = input.incomeEntries.reduce<Record<string, number>>((acc, entry) => {
            const key = entry.sourceName || entry.source;
            acc[key] = (acc[key] ?? 0) + normalizeMonthlyIncome(entry);
            return acc;
          }, {});
          const dominantShare = Object.values(bySource).sort((a, b) => b - a)[0] ?? 0;
          return monthlyIncome > 0 && (dominantShare / monthlyIncome) > 0.8 ? 'HIGH' : 'LOW';
        })()
      : 'LOW',
    portfolioToLiquidRatio: Number(portfolioToLiquidRatio.toFixed(2)),
    largestExpenseCategory,
    budgets,
    obligations,
    upcomingEvents: [
      ...obligations.slice(0, 5).map((item) => ({
        type: 'obligation' as const,
        title: item.title,
        date: item.dueDate,
        amount: item.amount,
      })),
      ...input.oneTimeExpenses
        .filter((item) => item.status !== 'paid')
        .slice(0, 5)
        .map((item) => ({
          type: 'budget' as const,
          title: item.title,
          date: item.dueDate,
          amount: item.amount,
        })),
      ...input.savingsAccounts
        .filter((item) => item.status === 'active' && item.type !== 'current')
        .slice(0, 5)
        .map((item) => ({
          type: 'maturity' as const,
          title: item.name,
          date: item.maturityDate,
          amount: roundMoney(item.principal + (item.principal * (item.annualProfitRate / 100) * (item.termMonths / 12))),
        })),
    ],
    forecast,
    firstAtRiskMonth,
    alerts,
    topPriorityActions: buildTopPriorityActions(alerts, largestExpenseCategory),
    narrativeSummary: buildNarrativeSummary({
      monthlyIncome,
      monthlyExpenses,
      monthlySurplus,
      savingsRate: snapshot.savingsRate,
      emergencyFundMonths: snapshot.emergencyFundMonths,
      portfolioToLiquidRatio,
      obligations,
      firstAtRiskMonth,
      largestExpenseCategory,
      alerts,
    }),
  };
}

export function buildWealixAIContext(userId: string, workspace: RemoteUserWorkspace, onboardingProfile?: OnboardingProfile | null): WealixAIContext {
  return buildContext({
    userId,
    snapshot: buildFinancialSnapshotFromWorkspace(workspace),
    incomeEntries: workspace.incomeEntries ?? [],
    expenseEntries: workspace.expenseEntries ?? [],
    budgetLimits: workspace.budgetLimits ?? [],
    recurringObligations: workspace.recurringObligations ?? [],
    oneTimeExpenses: workspace.oneTimeExpenses ?? [],
    savingsAccounts: workspace.savingsAccounts ?? [],
    onboardingProfile: onboardingProfile ?? null,
  });
}

export function buildWealixAIContextFromClientContext(userId: string, context: ClientFinancialContext & {
  recurringObligations?: RecurringObligation[];
  oneTimeExpenses?: OneTimeExpense[];
  savingsAccounts?: SavingsAccount[];
  onboardingProfile?: OnboardingProfile | null;
}) {
  return buildContext({
    userId,
    snapshot: buildFinancialSnapshotFromClientContext(context),
    incomeEntries: context.incomeEntries ?? [],
    expenseEntries: context.expenseEntries ?? [],
    budgetLimits: normalizeBudgetLimits(context.budgetLimits ?? []),
    recurringObligations: context.recurringObligations ?? [],
    oneTimeExpenses: context.oneTimeExpenses ?? [],
    savingsAccounts: context.savingsAccounts ?? [],
    onboardingProfile: context.onboardingProfile ?? null,
  });
}

export function buildCompactWealixAIContext(context: WealixAIContext, locale: 'ar' | 'en' = 'en') {
  const lines = [
    `Snapshot date: ${context.snapshotDate}`,
    `Currency: ${context.currency}`,
    `Health score: ${context.healthScore}/100`,
    `Risk level: ${context.riskLevel}`,
    `Monthly income: ${context.monthlyIncome.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} SAR`,
    `Monthly expenses: ${context.monthlyExpenses.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} SAR`,
    `Monthly surplus: ${context.monthlySurplus.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} SAR`,
    `Savings rate: ${context.savingsRate.toFixed(1)}%`,
    `Expense-to-income: ${context.expenseToIncomeRatio.toFixed(1)}%`,
    `Emergency fund coverage: ${context.emergencyFundMonths.toFixed(1)} months`,
    `Portfolio-to-liquid: ${context.portfolioToLiquidRatio.toFixed(2)}x`,
    `Narrative summary: ${context.narrativeSummary}`,
  ];

  if (context.obligations.length > 0) {
    lines.push('Upcoming obligations:');
    lines.push(...context.obligations.slice(0, 5).map((item) =>
      `- ${item.title}: ${item.amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} SAR due ${item.dueDate} | gap ${item.fundingGap.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} SAR | coverage ${item.coverageRatio.toFixed(2)}x`
    ));
  }

  if (context.budgets.length > 0) {
    lines.push('Budget status:');
    lines.push(...context.budgets.slice(0, 6).map((item) =>
      `- ${item.category}: plan ${item.planned.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} | actual ${item.actual.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} | utilization ${item.utilizationPct.toFixed(1)}%`
    ));
  }

  if (context.forecast.length > 0) {
    lines.push('12-month forecast:');
    lines.push(...context.forecast.slice(0, 6).map((item) =>
      `- ${item.label}: open ${item.openingBalance.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} | obligations ${item.obligationPayments.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} | close ${item.closingBalance.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} | ${item.status}`
    ));
  }

  if (context.alerts.length > 0) {
    lines.push('Alerts:');
    lines.push(...context.alerts.slice(0, 6).map((item) => `- [${item.severity.toUpperCase()}] ${item.title}: ${item.description}`));
  }

  return lines.join('\n');
}
