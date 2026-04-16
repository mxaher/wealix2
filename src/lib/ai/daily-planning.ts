import type { BudgetLimit, ExpenseEntry, IncomeEntry, Locale, NotificationPreferences } from '@/store/useAppStore';
import type { UpcomingOccurrence } from '@/lib/recurring-obligations';

export interface DailyPlanningSnapshot {
  snapshot_date: string;
  run_id: string;
  user_id: string;
  analysis_quality: 'full' | 'partial' | 'degraded';
  missing_data_flags: string[];
  daily_headline: {
    title: string;
    subtitle: string;
    sentiment: 'positive' | 'neutral' | 'caution' | 'alert';
    health_score_today: number;
    health_score_delta: number;
  };
  budget_status: {
    month_label: string;
    days_elapsed: number;
    days_remaining: number;
    income_received_mtd: number;
    expenses_total_mtd: number;
    projected_month_end_balance: number;
    overall_budget_health: 'on_track' | 'at_risk' | 'breached';
    categories: Array<{
      category: string;
      budgeted: number;
      spent: number;
      remaining: number;
      pct_used: number;
      projected_eom_spend: number;
      status: 'healthy' | 'warning' | 'breached';
      trend: 'increasing' | 'stable' | 'decreasing';
    }>;
  };
  obligations_today: Array<{
    id: string;
    name: string;
    amount: number;
    currency: string;
    due_date: string;
    days_until_due: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    balance_adequate: boolean;
    auto_pay_enabled: boolean;
    action_required: boolean;
    note: string;
  }>;
  tips: Array<{
    tip_id: string;
    priority: 1 | 2 | 3 | 4 | 5;
    category: 'spending' | 'saving' | 'investing' | 'debt' | 'obligation' | 'goal' | 'behavior';
    icon_hint: 'warning' | 'lightbulb' | 'trending_up' | 'trending_down' | 'calendar' | 'fire' | 'target';
    title: string;
    body: string;
    impact_label: string;
    data_evidence: string;
    is_positive: boolean;
  }>;
  goal_pulse: Array<{
    goal_id: string;
    goal_name: string;
    progress_pct: number;
    on_track: boolean;
    days_to_target: number;
    monthly_gap: number;
    today_nudge: string;
  }>;
  notifications: Array<{
    notification_id: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    deliver_at: string;
    channel: Array<'push' | 'in_app'>;
    title: string;
    body: string;
    cta_label: string;
    cta_route: '/budget-planning' | '/portfolio' | '/fire' | '/reports';
    auto_dismiss_hours: number;
  }>;
  investment_note: {
    include: boolean;
    title: string;
    body: string;
    rebalancing_alert: boolean;
  };
}

interface BuildDailyPlanningSnapshotInput {
  locale: Locale;
  userId: string;
  notificationPreferences: NotificationPreferences;
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  budgetLimits: BudgetLimit[];
  upcomingObligations: UpcomingOccurrence[];
}

const categoryToBudgetKey: Record<ExpenseEntry['category'], string> = {
  Housing: 'housing',
  Food: 'food',
  Transport: 'transport',
  Entertainment: 'entertainment',
  Healthcare: 'healthcare',
  Education: 'education',
  Shopping: 'household_allowance',
  Household: 'household_allowance',
  Utilities: 'utilities',
  Other: 'other',
};

export function buildDailyPlanningSnapshot({
  locale,
  userId,
  notificationPreferences,
  incomeEntries,
  expenseEntries,
  budgetLimits,
  upcomingObligations,
}: BuildDailyPlanningSnapshotInput): DailyPlanningSnapshot {
  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const totalDays = monthEnd.getDate();
  const daysElapsed = Math.min(totalDays, Math.max(1, now.getDate()));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const monthKey = snapshotDate.slice(0, 7);

  const incomeReceivedMtd = incomeEntries
    .filter((entry) => entry.date.startsWith(monthKey))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expensesMtd = expenseEntries
    .filter((entry) => entry.date.startsWith(monthKey))
    .reduce((sum, entry) => sum + entry.amount, 0);

  const categories = budgetLimits.map((budget) => {
    const spent = expenseEntries
      .filter((entry) => categoryToBudgetKey[entry.category] === budget.category)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const projected = (spent / daysElapsed) * totalDays;
    const remaining = budget.limit - spent;
    const pctUsed = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    const delta = projected - budget.limit;

    return {
      category: budget.category,
      budgeted: budget.limit,
      spent,
      remaining,
      pct_used: Number(pctUsed.toFixed(1)),
      projected_eom_spend: Number(projected.toFixed(2)),
      status: delta > 0 && spent > budget.limit ? 'breached' : delta > 0 ? 'warning' : 'healthy',
      trend: delta > 150 ? 'increasing' : delta < -150 ? 'decreasing' : 'stable',
    } as const;
  });

  const projectedMonthEndBalance = Number((incomeReceivedMtd - expensesMtd).toFixed(2));
  const overallBudgetHealth = projectedMonthEndBalance < 0
    ? 'breached'
    : categories.some((category) => category.status !== 'healthy')
      ? 'at_risk'
      : 'on_track';

  const healthScoreToday = Math.max(
    18,
    Math.min(
      92,
      Math.round(
        82
        - (overallBudgetHealth === 'breached' ? 38 : overallBudgetHealth === 'at_risk' ? 18 : 0)
        - upcomingObligations.filter((item) => item.daysUntilDue <= 7).length * 8
        - categories.filter((category) => category.status === 'breached').length * 10
      )
    )
  );

  const primaryObligation = upcomingObligations[0];
  const headlineTitle = overallBudgetHealth === 'breached'
    ? (locale === 'ar' ? 'التزامات هذا الشهر تضغط على السيولة' : 'This month needs tighter cash control')
    : overallBudgetHealth === 'at_risk'
      ? (locale === 'ar' ? 'هناك بعض الفئات التي تحتاج ضبطاً هذا الأسبوع' : 'A few categories need attention this week')
      : (locale === 'ar' ? 'ميزانيتك ومسارك الشهري تحت السيطرة' : 'Budget and planning are aligned today');

  const headlineSubtitle = primaryObligation
    ? locale === 'ar'
      ? `أقرب التزام هو ${primaryObligation.title} بقيمة ${primaryObligation.amount.toLocaleString('ar-SA')} ${primaryObligation.currency} خلال ${Math.max(primaryObligation.daysUntilDue, 0)} يوم.`
      : `Next obligation: ${primaryObligation.title} for ${primaryObligation.currency} ${primaryObligation.amount.toLocaleString('en-US')} in ${Math.max(primaryObligation.daysUntilDue, 0)} day(s).`
    : locale === 'ar'
      ? `الرصيد المتوقع لنهاية الشهر ${projectedMonthEndBalance.toLocaleString('ar-SA')} ريال.`
      : `Projected month-end balance is SAR ${projectedMonthEndBalance.toLocaleString('en-US')}.`;

  const tips: DailyPlanningSnapshot['tips'] = [];

  const topRiskCategory = categories
    .filter((category) => category.status !== 'healthy')
    .sort((left, right) => (right.projected_eom_spend - right.budgeted) - (left.projected_eom_spend - left.budgeted))[0];

  if (topRiskCategory) {
    const overshoot = Math.max(0, topRiskCategory.projected_eom_spend - topRiskCategory.budgeted);
    tips.push({
      tip_id: `tip-${snapshotDate}-budget`,
      priority: 1,
      category: 'spending',
      icon_hint: 'warning',
      title: locale === 'ar' ? 'أوقف التسرب الأعلى' : 'Contain the top leak',
      body: locale === 'ar'
        ? `فئة ${topRiskCategory.category} تتجه لتجاوز الميزانية بنحو ${overshoot.toLocaleString('ar-SA')} ريال هذا الشهر. خفّض أي إنفاق جديد في هذه الفئة اليوم.`
        : `${topRiskCategory.category} is trending SAR ${overshoot.toLocaleString('en-US')} above budget this month. Pause any new spend in this category today.`,
      impact_label: locale === 'ar' ? `يحمي حتى ${overshoot.toLocaleString('ar-SA')} ريال` : `Protects up to SAR ${overshoot.toLocaleString('en-US')}`,
      data_evidence: `${topRiskCategory.category}: ${topRiskCategory.pct_used}% used`,
      is_positive: false,
    });
  }

  if (primaryObligation) {
    tips.push({
      tip_id: `tip-${snapshotDate}-obligation`,
      priority: 2,
      category: 'obligation',
      icon_hint: 'calendar',
      title: locale === 'ar' ? 'غطِّ الالتزام القادم' : 'Cover the next bill',
      body: locale === 'ar'
        ? `${primaryObligation.title} مستحق بقيمة ${primaryObligation.amount.toLocaleString('ar-SA')} ${primaryObligation.currency} بتاريخ ${primaryObligation.dueDate}. راجع تمويله أو فعّل الدفع التلقائي هذا الأسبوع.`
        : `${primaryObligation.title} is due for ${primaryObligation.currency} ${primaryObligation.amount.toLocaleString('en-US')} on ${primaryObligation.dueDate}. Confirm funding or turn on auto-pay this week.`,
      impact_label: locale === 'ar' ? 'يحمي السداد في موعده' : 'Protects on-time payment',
      data_evidence: `${primaryObligation.title} due in ${primaryObligation.daysUntilDue}d`,
      is_positive: healthScoreToday >= 65,
    });
  }

  const notifications: DailyPlanningSnapshot['notifications'] = upcomingObligations
    .filter((item) => item.daysUntilDue <= 3)
    .slice(0, 3)
    .map((item, index) => ({
      notification_id: `notif-${snapshotDate}-${index + 1}`,
      urgency: (item.daysUntilDue <= 1 ? 'critical' : 'high') as 'critical' | 'high',
      deliver_at: new Date().toISOString(),
      channel: notificationPreferences.push
        ? (['push', 'in_app'] as Array<'push' | 'in_app'>)
        : (['in_app'] as Array<'push' | 'in_app'>),
      title: locale === 'ar' ? `التزام قريب: ${item.title}` : `Upcoming obligation: ${item.title}`,
      body: locale === 'ar'
        ? `${item.amount.toLocaleString('ar-SA')} ${item.currency} مستحقة في ${item.dueDate}. راجعها الآن.`
        : `${item.currency} ${item.amount.toLocaleString('en-US')} is due on ${item.dueDate}. Review it now.`,
      cta_label: locale === 'ar' ? 'راجع الآن' : 'Review Now',
      cta_route: '/budget-planning' as const,
      auto_dismiss_hours: 24,
    }));

  return {
    snapshot_date: snapshotDate,
    run_id: `daily-${snapshotDate}-${userId || 'guest'}`,
    user_id: userId || 'guest',
    analysis_quality: budgetLimits.length && upcomingObligations.length ? 'full' : 'partial',
    missing_data_flags: [
      ...(budgetLimits.length ? [] : ['budget_limits']),
      ...(upcomingObligations.length ? [] : ['upcoming_obligations']),
    ],
    daily_headline: {
      title: headlineTitle,
      subtitle: headlineSubtitle,
      sentiment: healthScoreToday >= 80 ? 'positive' : healthScoreToday >= 60 ? 'neutral' : healthScoreToday >= 40 ? 'caution' : 'alert',
      health_score_today: healthScoreToday,
      health_score_delta: 0,
    },
    budget_status: {
      month_label: monthStart.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' }),
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      income_received_mtd: incomeReceivedMtd,
      expenses_total_mtd: expensesMtd,
      projected_month_end_balance: projectedMonthEndBalance,
      overall_budget_health: overallBudgetHealth,
      categories,
    },
    obligations_today: upcomingObligations.slice(0, 6).map((item) => ({
      id: item.obligationId,
      name: item.title,
      amount: item.amount,
      currency: item.currency,
      due_date: item.dueDate,
      days_until_due: item.daysUntilDue,
      urgency: item.daysUntilDue <= 3 ? 'critical' : item.daysUntilDue <= 7 ? 'high' : item.daysUntilDue <= 14 ? 'medium' : 'low',
      balance_adequate: projectedMonthEndBalance >= item.amount,
      auto_pay_enabled: false,
      action_required: item.daysUntilDue <= 7,
      note: locale === 'ar'
        ? `هذا الالتزام ${item.daysUntilDue <= 7 ? 'يحتاج متابعة هذا الأسبوع' : 'مجدول لاحقاً هذا الشهر'}.`
        : `This obligation ${item.daysUntilDue <= 7 ? 'needs attention this week' : 'is scheduled later this month'}.`,
    })),
    tips: tips.slice(0, 5),
    goal_pulse: [],
    notifications,
    investment_note: {
      include: false,
      title: '',
      body: '',
      rebalancing_alert: false,
    },
  };
}
