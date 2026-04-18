'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  CalendarRange,
  FileText,
  Receipt,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAppStore, formatCurrency } from '@/store/useAppStore';
import { useFinancialSnapshot } from '@/hooks/useFinancialSnapshot';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Utilities: '#8b5cf6',
  Entertainment: '#ec4899',
  Healthcare: '#10b981',
  Education: '#f59e0b',
  Shopping: '#06b6d4',
  Housing: '#6366f1',
  Household: '#84cc16',
  Other: '#94a3b8',
};

const PORTFOLIO_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899'];

function computeHealthScore(snapshot: ReturnType<typeof useFinancialSnapshot>['snapshot']) {
  let score = 0;
  const savingsRate = snapshot.savingsRate ?? 0;
  const emergencyMonths = snapshot.emergencyFundMonths ?? 0;
  const fireProgress = snapshot.fire?.progressPct ?? 0;
  const debtRatio =
    snapshot.netWorth.gross > 0
      ? (snapshot.totalLiabilities / snapshot.netWorth.gross) * 100
      : 0;

  if (savingsRate >= 20) score += 30;
  else if (savingsRate >= 10) score += 15;
  else if (savingsRate >= 5) score += 8;

  if (emergencyMonths >= 6) score += 30;
  else if (emergencyMonths >= 3) score += 15;
  else if (emergencyMonths >= 1) score += 7;

  if (fireProgress >= 50) score += 25;
  else if (fireProgress >= 25) score += 12;
  else if (fireProgress >= 10) score += 6;

  if (debtRatio < 30) score += 15;
  else if (debtRatio < 50) score += 8;

  return Math.min(100, Math.round(score));
}

function healthLabel(score: number, isArabic: boolean) {
  if (score >= 80) return isArabic ? 'ممتاز' : 'Excellent';
  if (score >= 60) return isArabic ? 'جيد' : 'Good';
  if (score >= 40) return isArabic ? 'متوسط' : 'Fair';
  return isArabic ? 'يحتاج تحسين' : 'Needs Work';
}

function healthColor(score: number) {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-sky-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-rose-500';
}

export default function DashboardPage() {
  const locale = useAppStore((s) => s.locale);
  const appMode = useAppStore((s) => s.appMode);
  const expenseEntries = useAppStore((s) => s.expenseEntries);
  const { snapshot } = useFinancialSnapshot();
  const { isSignedIn, user } = useRuntimeUser();
  const isArabic = locale === 'ar';
  const isDemoMode = appMode === 'demo' && !isSignedIn;

  const healthScore = useMemo(() => computeHealthScore(snapshot), [snapshot]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12
      ? (isArabic ? 'صباح الخير' : 'Good morning')
      : hour < 17
        ? (isArabic ? 'مساء الخير' : 'Good afternoon')
        : (isArabic ? 'مساء الخير' : 'Good evening');
    const firstName = isDemoMode ? 'John' : (user?.firstName ?? '');
    return { timeOfDay, firstName };
  }, [isArabic, isDemoMode, user]);

  const recentExpenses = useMemo(
    () =>
      [...expenseEntries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [expenseEntries]
  );

  const spendingByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenseEntries) {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    }
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [expenseEntries]);

  const portfolioAllocation = useMemo(() => {
    const { stocks, funds } = snapshot.portfolio;
    const liquid = snapshot.savings.liquidCash;
    const locked = snapshot.netWorth.locked;
    const total = stocks + funds + liquid + locked;
    if (total === 0) return [];
    return [
      { name: isArabic ? 'أسهم' : 'Stocks', value: stocks },
      { name: isArabic ? 'صناديق' : 'Funds', value: funds },
      { name: isArabic ? 'سيولة' : 'Cash', value: liquid },
      { name: isArabic ? 'مدخرات مقيدة' : 'Locked', value: locked },
    ].filter((d) => d.value > 0);
  }, [snapshot, isArabic]);

  const scoreBreakdown = useMemo(() => {
    const savings = isDemoMode ? 85 : Math.min((snapshot.savingsRate ?? 0) * 2, 100);
    const budget = isDemoMode ? 92 : Math.max(0, Math.min(100,
      (1 - snapshot.monthlyExpenses / Math.max(snapshot.monthlyIncome, 1)) * 100 + 40
    ));
    const emergency = isDemoMode ? 78 : Math.min(((snapshot.emergencyFundMonths ?? 0) / 6) * 100, 100);
    const investment = isDemoMode ? 74 : Math.min((snapshot.fire.progressPct ?? 0) * 1.5, 100);
    return [
      { label: { en: 'Savings Rate', ar: 'معدل الادخار' }, value: savings, color: '#22c55e' },
      { label: { en: 'Budget Adherence', ar: 'الالتزام بالميزانية' }, value: budget, color: '#06b6d4' },
      { label: { en: 'Emergency Fund', ar: 'صندوق الطوارئ' }, value: emergency, color: '#3b82f6' },
      { label: { en: 'Investment Growth', ar: 'نمو الاستثمار' }, value: investment, color: '#f59e0b' },
    ];
  }, [snapshot, isDemoMode]);

  const upcomingObligations = snapshot.obligations.pending.slice(0, 3);
  const criticalAlerts = snapshot.alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = snapshot.alerts.filter((a) => a.severity === 'warning');

  const savingsRate = isDemoMode ? 22 : (snapshot.savingsRate ?? 0);
  const monthlySurplus = isDemoMode ? 3200 : snapshot.monthlySurplus;
  const monthlyIncome = isDemoMode ? 18000 : snapshot.monthlyIncome;
  const monthlyExpenses = isDemoMode ? 9800 : snapshot.monthlyExpenses;
  const netWorth = isDemoMode ? 584500 : snapshot.netWorth.net;

  const quickActions = [
    {
      href: '/expenses',
      icon: Receipt,
      label: { en: 'Scan Receipt', ar: 'مسح إيصال' },
      color: 'bg-orange-500/10 text-orange-500',
    },
    {
      href: '/advisor',
      icon: Bot,
      label: { en: 'Ask AI', ar: 'اسأل المستشار' },
      color: 'bg-violet-500/10 text-violet-500',
    },
    {
      href: '/reports',
      icon: FileText,
      label: { en: 'View Reports', ar: 'التقارير' },
      color: 'bg-sky-500/10 text-sky-500',
    },
    {
      href: '/budget-planning',
      icon: CalendarRange,
      label: { en: 'Plan Budget', ar: 'تخطيط الموازنة' },
      color: 'bg-emerald-500/10 text-emerald-500',
    },
  ];

  return (
    <DashboardShell>
      <div className="rhythm-page w-full space-y-6">
        {/* Personalized greeting */}
        <div>
          <h1 className="text-2xl font-bold">
            {isArabic
              ? `${greeting.timeOfDay}${greeting.firstName ? `، ${greeting.firstName}` : ''}! 👋`
              : `${greeting.timeOfDay}${greeting.firstName ? `, ${greeting.firstName}` : ''}! 👋`}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isArabic ? 'نظرة شاملة على وضعك المالي' : "Here's your financial overview"}
          </p>
        </div>

        {/* Health score + KPIs */}
        <div className="rhythm-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Health score card — spans 2 cols on lg+ */}
          <Card className="rhythm-card lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center gap-5">
                {/* Circular gauge with score inside */}
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={healthScore >= 80 ? '#22c55e' : healthScore >= 60 ? '#0ea5e9' : healthScore >= 40 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${healthScore} ${100 - healthScore}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-xl font-bold leading-none ${healthColor(healthScore)}`}>{healthScore}</span>
                    <span className="text-[10px] text-muted-foreground leading-none mt-0.5">/100</span>
                  </div>
                </div>
                {/* Animated score breakdown bars */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {isArabic ? 'تفصيل النتيجة' : 'Score Breakdown'}
                  </p>
                  <div className="space-y-2">
                    {scoreBreakdown.map((bar, i) => (
                      <div key={bar.label.en}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground">{isArabic ? bar.label.ar : bar.label.en}</span>
                          <span className="font-medium">{bar.value.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden bg-muted">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: bar.color }}
                            initial={{ width: '0%' }}
                            animate={{ width: `${bar.value}%` }}
                            transition={{ duration: 0.7, delay: i * 0.12 + 0.15, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className={`text-xs font-medium mt-3 ${healthColor(healthScore)}`}>
                {healthLabel(healthScore, isArabic)}
              </p>
            </CardContent>
          </Card>

          {/* KPI cards */}
          {[
            {
              label: { en: 'Net Worth', ar: 'صافي الثروة' },
              value: formatCurrency(netWorth, 'SAR', locale),
              icon: Wallet,
              color: 'text-amber-500',
              iconBg: 'bg-amber-500/10',
            },
            {
              label: { en: 'Monthly Income', ar: 'الدخل الشهري' },
              value: formatCurrency(monthlyIncome, 'SAR', locale),
              icon: TrendingUp,
              color: 'text-emerald-500',
              iconBg: 'bg-emerald-500/10',
            },
            {
              label: { en: 'Monthly Expenses', ar: 'المصروفات' },
              value: formatCurrency(monthlyExpenses, 'SAR', locale),
              icon: TrendingDown,
              color: 'text-rose-500',
              iconBg: 'bg-rose-500/10',
            },
            {
              label: { en: 'Monthly Surplus', ar: 'الفائض الشهري' },
              value: formatCurrency(monthlySurplus, 'SAR', locale),
              icon: ArrowUpRight,
              color: monthlySurplus >= 0 ? 'text-emerald-500' : 'text-rose-500',
              iconBg: monthlySurplus >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
            },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label.en}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.1 }}
              >
                <Card className="rhythm-card h-full transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? kpi.label.ar : kpi.label.en}
                      </p>
                      <div className={`rounded-lg p-1.5 shrink-0 ${kpi.iconBg}`}>
                        <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                      </div>
                    </div>
                    <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Alerts strip */}
        {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
          <div className="space-y-2">
            {criticalAlerts.slice(0, 2).map((alert, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-rose-600">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
                <Link href="/alerts" className="ms-auto">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    {isArabic ? 'عرض الكل' : 'View all'}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            {isArabic ? 'إجراءات سريعة' : 'Quick Actions'}
          </h2>
          <div className="rhythm-grid grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <Card className="rhythm-card hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className={`rounded-lg p-2 ${action.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">
                        {isArabic ? action.label.ar : action.label.en}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Middle row: Portfolio + Spending */}
        <div className="rhythm-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Portfolio allocation */}
          <Card className="rhythm-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {isArabic ? 'توزيع المحفظة' : 'Portfolio Allocation'}
                </CardTitle>
                <Link href="/portfolio">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                    <Briefcase className="h-3 w-3" />
                    {isArabic ? 'عرض' : 'View'}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {portfolioAllocation.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {isArabic ? 'لا توجد بيانات محفظة بعد.' : 'No portfolio data yet.'}
                  <Link href="/portfolio" className="block mt-2">
                    <Button variant="outline" size="sm">{isArabic ? 'أضف استثمارات' : 'Add investments'}</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={portfolioAllocation} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                        {portfolioAllocation.map((_, idx) => (
                          <Cell key={idx} fill={PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v, 'SAR', locale)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {portfolioAllocation.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length] }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(item.value, 'SAR', locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spending by category */}
          <Card className="rhythm-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {isArabic ? 'الإنفاق بالفئة' : 'Spending by Category'}
                </CardTitle>
                <Link href="/expenses">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                    <Receipt className="h-3 w-3" />
                    {isArabic ? 'عرض' : 'View'}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {spendingByCategory.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {isArabic ? 'لا توجد مصروفات بعد.' : 'No expenses recorded yet.'}
                  <Link href="/expenses" className="block mt-2">
                    <Button variant="outline" size="sm">{isArabic ? 'أضف مصروفات' : 'Add expenses'}</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {spendingByCategory.map((item) => {
                    const total = spendingByCategory.reduce((s, x) => s + x.amount, 0);
                    const pct = total > 0 ? (item.amount / total) * 100 : 0;
                    return (
                      <div key={item.category}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{item.category}</span>
                          <span className="font-medium">{formatCurrency(item.amount, 'SAR', locale)}</span>
                        </div>
                        <Progress
                          value={pct}
                          className="h-1.5"
                          style={{ '--progress-color': CATEGORY_COLORS[item.category] ?? '#94a3b8' } as React.CSSProperties}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: Recent transactions + Upcoming bills */}
        <div className="rhythm-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent transactions */}
          <Card className="rhythm-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {isArabic ? 'آخر المعاملات' : 'Recent Transactions'}
                </CardTitle>
                <Link href="/expenses">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    {isArabic ? 'عرض الكل' : 'View all'}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {isArabic ? 'لا توجد معاملات بعد.' : 'No transactions yet.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {recentExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: `${CATEGORY_COLORS[expense.category] ?? '#94a3b8'}20`,
                            color: CATEGORY_COLORS[expense.category] ?? '#94a3b8',
                          }}
                        >
                          {expense.category.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {expense.description || expense.merchantName || expense.category}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{expense.date}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-rose-500">
                        -{formatCurrency(expense.amount, expense.currency, locale)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming obligations */}
          <Card className="rhythm-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {isArabic ? 'الفواتير القادمة' : 'Upcoming Bills'}
                </CardTitle>
                <Link href="/budget-planning">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    {isArabic ? 'عرض الكل' : 'View all'}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingObligations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {isArabic ? 'لا توجد التزامات قادمة.' : 'No upcoming bills.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingObligations.map((ob) => {
                    const isOverdue = ob.daysUntilDue < 0;
                    const isDueSoon = ob.daysUntilDue >= 0 && ob.daysUntilDue <= 7;
                    return (
                      <div key={ob.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            isOverdue ? 'bg-rose-500/10' : isDueSoon ? 'bg-amber-500/10' : 'bg-muted'
                          }`}>
                            {isOverdue ? (
                              <AlertTriangle className="h-4 w-4 text-rose-500" />
                            ) : isDueSoon ? (
                              <Clock className="h-4 w-4 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">{ob.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isOverdue
                                ? isArabic ? `متأخر ${Math.abs(ob.daysUntilDue)} يوم` : `${Math.abs(ob.daysUntilDue)}d overdue`
                                : ob.daysUntilDue === 0
                                  ? isArabic ? 'اليوم' : 'Today'
                                  : isArabic ? `خلال ${ob.daysUntilDue} يوم` : `in ${ob.daysUntilDue}d`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(ob.amount, ob.currency, locale)}</p>
                          {ob.fundingGap > 0 && (
                            <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30">
                              {isArabic ? 'فجوة' : 'gap'} {formatCurrency(ob.fundingGap, ob.currency, locale)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FIRE progress */}
        {(snapshot.fire.fireNumber > 0 || isDemoMode) && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium">
                    {isArabic ? 'تقدم الاستقلال المالي (FIRE)' : 'Financial Independence Progress (FIRE)'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isArabic ? 'الهدف:' : 'Target:'} {formatCurrency(isDemoMode ? 4500000 : snapshot.fire.fireNumber, 'SAR', locale)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-500">
                    {isDemoMode ? '18' : (snapshot.fire.progressPct ?? 0).toFixed(0)}%
                  </p>
                  {snapshot.fire.yearsToFire !== null && !isDemoMode && (
                    <p className="text-xs text-muted-foreground">
                      ~{snapshot.fire.yearsToFire.toFixed(1)} {isArabic ? 'سنوات' : 'yrs'}
                    </p>
                  )}
                </div>
              </div>
              <Progress value={isDemoMode ? 18 : snapshot.fire.progressPct ?? 0} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{formatCurrency(isDemoMode ? 810000 : snapshot.fire.currentInvestableAssets, 'SAR', locale)}</span>
                <Link href="/fire">
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                    <Zap className="h-3 w-3" />
                    {isArabic ? 'تفاصيل' : 'Details'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
