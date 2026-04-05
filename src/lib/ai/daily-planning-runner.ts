import { extractNvidiaResponseText } from '@/app/api/internal/ai/agents/response';
import { DAILY_PLANNING_SYSTEM_PROMPT } from '@/lib/ai/daily-planning-prompt';
import { buildDailyPlanningSnapshot, type DailyPlanningSnapshot } from '@/lib/ai/daily-planning';
import { buildFinancialSnapshotFromWorkspace } from '@/lib/financial-snapshot';
import type { RemoteUserWorkspace } from '@/lib/remote-user-data';
import type { NotificationPreferences, RecurringObligation } from '@/store/useAppStore';
import { getOccurrencesInRange } from '@/lib/recurring-obligations';

type NvidiaChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
      reasoning_content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function isRamadanPeriod(_date: Date, locale: string) {
  return locale === 'sa' ? false : false;
}

function isEidWeek(_date: Date, locale: string) {
  return locale === 'sa' ? false : false;
}

function isZakatWindow(_date: Date, locale: string) {
  return locale === 'sa' ? false : false;
}

function getMonthExpenseBreakdown(workspace: RemoteUserWorkspace, currentMonth: string) {
  const expensesThisMonth = workspace.expenseEntries.filter((entry) => entry.date.startsWith(currentMonth));
  const spentByCategory = expensesThisMonth.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.category.toLowerCase();
    acc[key] = (acc[key] ?? 0) + entry.amount;
    return acc;
  }, {});

  return workspace.budgetLimits.map((budget) => {
    const spent = spentByCategory[budget.category] ?? 0;
    const remaining = budget.limit - spent;
    const pctUsed = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    return {
      category: budget.category,
      budgeted: budget.limit,
      spent,
      remaining,
      pct_used: Number(pctUsed.toFixed(1)),
    };
  });
}

function normalizeMonthlyIncomeAmount(amount: number, frequency: string) {
  switch (frequency) {
    case 'weekly':
      return (amount * 52) / 12;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
}

function getUpcomingObligations(obligations: RecurringObligation[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + days);

  return obligations.flatMap((obligation) =>
    getOccurrencesInRange(obligation, today, rangeEnd).map((occurrence) => ({
      id: obligation.id,
      name: obligation.title,
      category: obligation.category,
      amount: obligation.amount,
      currency: obligation.currency,
      due_date: occurrence.toISOString().slice(0, 10),
      days_until_due: Math.round((occurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      is_recurring: obligation.frequency !== 'one_time',
      last_paid_date: obligation.lastPaidDate ?? null,
      payment_method: 'manual',
      auto_pay_enabled: false,
    }))
  ).sort((left, right) => left.due_date.localeCompare(right.due_date));
}

function buildGoalPulse(workspace: RemoteUserWorkspace, financialSnapshot: ReturnType<typeof buildFinancialSnapshotFromWorkspace>) {
  const monthlyContribution = Math.max(financialSnapshot.monthlySavings, 0);

  return financialSnapshot.activeGoals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    type: goal.id,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    monthly_contribution_required: goal.monthlyContribution,
    actual_last_30d_contribution: monthlyContribution,
    target_date: goal.targetDate,
    on_track: goal.status === 'on_track',
    projected_completion_date: goal.targetDate,
  }));
}

function buildInvestmentSnapshot(financialSnapshot: ReturnType<typeof buildFinancialSnapshotFromWorkspace>) {
  const holdings = financialSnapshot.holdings;
  const ranked = holdings
    .map((holding) => ({
      name: holding.name,
      return_pct: holding.avgCost > 0 ? ((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100 : 0,
    }))
    .sort((left, right) => right.return_pct - left.return_pct);

  const fireGoal = financialSnapshot.activeGoals.find((goal) => goal.id === 'fire-goal');

  return {
    total_portfolio_value: financialSnapshot.portfolioValue,
    day_change_pct: 0,
    week_change_pct: 0,
    month_change_pct: 0,
    top_performing_asset: ranked[0] ?? { name: '', return_pct: 0 },
    worst_performing_asset: ranked.at(-1) ?? { name: '', return_pct: 0 },
    rebalancing_needed: financialSnapshot.topHoldingWeightPct > 35,
    rebalancing_details: financialSnapshot.topHoldingWeightPct > 35
      ? `Top holding weight is ${financialSnapshot.topHoldingWeightPct.toFixed(1)}%.`
      : null,
    FIRE_progress_pct: fireGoal?.progressPct ?? 0,
    FIRE_target_amount: fireGoal?.targetAmount ?? 0,
    FIRE_projected_date: fireGoal?.targetDate ?? null,
  };
}

function buildUserDailyContext(userId: string, workspace: RemoteUserWorkspace, previousSnapshot: DailyPlanningSnapshot | null) {
  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10);
  const monthKey = snapshotDate.slice(0, 7);
  const financialSnapshot = buildFinancialSnapshotFromWorkspace(workspace);
  const expensesThisMonth = workspace.expenseEntries.filter((entry) => entry.date.startsWith(monthKey));
  const currentMonthBudget = getMonthExpenseBreakdown(workspace, monthKey);
  const upcoming7 = getUpcomingObligations(workspace.recurringObligations ?? [], 7);
  const upcoming30 = getUpcomingObligations(workspace.recurringObligations ?? [], 30);

  const monthlyIncome = workspace.incomeEntries.reduce(
    (sum, entry) => sum + normalizeMonthlyIncomeAmount(entry.amount, entry.frequency),
    0
  );
  const incomeReceivedMtd = workspace.incomeEntries
    .filter((entry) => entry.date.startsWith(monthKey))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expensesTotalMtd = expensesThisMonth.reduce((sum, entry) => sum + entry.amount, 0);
  const daysRemaining = Math.max(0, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate());
  const projectedMonthEndBalance = incomeReceivedMtd - expensesTotalMtd;
  const largestExpense = [...expensesThisMonth].sort((left, right) => right.amount - left.amount)[0];

  return {
    snapshot_date: snapshotDate,
    user_id: userId,
    profile: {
      user_id: userId,
      locale: workspace.notificationPreferences.phoneNumber.startsWith('+966') ? 'sa' : 'global',
      currency: 'SAR',
      local_time_zone: 'Asia/Riyadh',
      preferred_notification_time: '06:00',
      financial_profile_completeness: 75,
    },
    today_calendar: {
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
      is_payday: now.getDate() === 1,
      days_until_next_payday: now.getDate() === 1 ? 0 : Math.max(0, new Date(now.getFullYear(), now.getMonth() + 1, 1).getDate() - now.getDate()),
      upcoming_obligations_in_7_days: upcoming7,
      upcoming_obligations_in_30_days: upcoming30,
      is_ramadan_period: isRamadanPeriod(now, 'sa'),
      is_eid_week: isEidWeek(now, 'sa'),
      is_zakat_window: isZakatWindow(now, 'sa'),
    },
    current_balances: {
      liquid_cash_total: financialSnapshot.liquidReserves,
      savings_total: financialSnapshot.liquidReserves,
      investment_portfolio_value: financialSnapshot.portfolioValue,
      total_liabilities: financialSnapshot.totalLiabilities,
      net_worth: financialSnapshot.netWorth,
      emergency_fund_months_coverage: financialSnapshot.emergencyFundMonths,
      last_updated_at: new Date().toISOString(),
    },
    this_month_so_far: {
      month_start_balance: financialSnapshot.liquidReserves,
      income_received_mtd: incomeReceivedMtd,
      expenses_total_mtd: expensesTotalMtd,
      expenses_by_category: currentMonthBudget,
      largest_single_expense_this_month: largestExpense
        ? { amount: largestExpense.amount, category: largestExpense.category, date: largestExpense.date }
        : null,
      days_remaining_in_month: daysRemaining,
      projected_month_end_balance: projectedMonthEndBalance,
      budget_breach_categories: currentMonthBudget.filter((item) => item.spent > item.budgeted).map((item) => item.category),
    },
    last_90_days_behavioral_signals: {
      avg_monthly_income_90d: monthlyIncome,
      avg_monthly_expenses_90d: financialSnapshot.monthlyExpenses,
      avg_savings_rate_90d: financialSnapshot.savingsRate,
      highest_spend_month_90d: expensesTotalMtd,
      categories_trending_up: currentMonthBudget.filter((item) => item.pct_used > 75).map((item) => item.category),
      categories_trending_down: currentMonthBudget.filter((item) => item.pct_used < 40).map((item) => item.category),
      income_volatility_score: 3,
      spending_consistency_score: 6,
      number_of_budget_breaches_90d: currentMonthBudget.filter((item) => item.spent > item.budgeted).length,
      largest_unplanned_expense_90d: largestExpense
        ? { amount: largestExpense.amount, category: largestExpense.category }
        : { amount: 0, category: 'none' },
    },
    obligations: getUpcomingObligations(workspace.recurringObligations ?? [], 365),
    goals: buildGoalPulse(workspace, financialSnapshot),
    investment_snapshot: buildInvestmentSnapshot(financialSnapshot),
    yesterday_tip_categories: previousSnapshot?.tips.map((tip) => tip.category) ?? [],
    yesterday_headline_title: previousSnapshot?.daily_headline.title ?? '',
  };
}

function safeParseSnapshot(content: string) {
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonSlice = firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

  return JSON.parse(jsonSlice) as DailyPlanningSnapshot;
}

export async function runNvidiaDailyPlanningForUser(params: {
  userId: string;
  workspace: RemoteUserWorkspace;
  previousSnapshot: DailyPlanningSnapshot | null;
}) {
  const context = buildUserDailyContext(params.userId, params.workspace, params.previousSnapshot);
  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  const nvidiaBase = (process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
  const nvidiaModel = process.env.NVIDIA_DAILY_PLANNING_MODEL || process.env.NVIDIA_ADVISOR_MODEL || 'nvidia/llama-3.1-nemotron-ultra-253b-v1';

  if (!nvidiaApiKey) {
    return buildDailyPlanningSnapshot({
      locale: 'en',
      userId: params.userId,
      notificationPreferences: params.workspace.notificationPreferences as NotificationPreferences,
      incomeEntries: params.workspace.incomeEntries,
      expenseEntries: params.workspace.expenseEntries,
      budgetLimits: params.workspace.budgetLimits,
      upcomingObligations: getUpcomingObligations(params.workspace.recurringObligations ?? [], 90).map((item) => ({
        obligationId: item.id,
        title: item.name,
        category: item.category,
        amount: item.amount,
        currency: item.currency,
        dueDate: item.due_date,
        daysUntilDue: item.days_until_due,
        status: item.days_until_due <= 7 ? 'due_soon' : 'upcoming',
      })),
    });
  }

  const response = await fetch(`${nvidiaBase}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${nvidiaApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: nvidiaModel,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 2800,
      messages: [
        { role: 'system', content: DAILY_PLANNING_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(context) },
      ],
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(40_000),
  });

  const payload = await response.json().catch(() => null) as NvidiaChatResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `NVIDIA request failed with status ${response.status}`);
  }

  const content = extractNvidiaResponseText(payload);
  if (!content) {
    throw new Error('Empty NVIDIA daily planning response.');
  }

  return safeParseSnapshot(content);
}
