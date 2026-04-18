'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Flame,
  Wallet,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Minus,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAppStore, formatCurrency } from '@/store/useAppStore';
import { useFinancialSnapshot } from '@/hooks/useFinancialSnapshot';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function InsightsPage() {
  const locale = useAppStore((s) => s.locale);
  const appMode = useAppStore((s) => s.appMode);
  const expenseEntries = useAppStore((s) => s.expenseEntries);
  const incomeEntries = useAppStore((s) => s.incomeEntries);
  const { snapshot } = useFinancialSnapshot();
  const { isSignedIn } = useRuntimeUser();
  const isArabic = locale === 'ar';
  const isDemoMode = appMode === 'demo' && !isSignedIn;

  const savingsRate = isDemoMode ? 22 : (snapshot.savingsRate ?? 0);
  const emergencyMonths = isDemoMode ? 4.2 : (snapshot.emergencyFundMonths ?? 0);
  const emergencyTarget = 6;
  const fireProgress = isDemoMode ? 18 : (snapshot.fire?.progressPct ?? 0);
  const monthlyIncome = isDemoMode ? 18000 : snapshot.monthlyIncome;
  const monthlyExpenses = isDemoMode ? 9800 : snapshot.monthlyExpenses;
  const netWorth = isDemoMode ? 584500 : snapshot.netWorth.net;

  // Monthly spending trend — last 6 months from real expense entries
  const spendingTrend = useMemo(() => {
    if (isDemoMode) {
      return [
        { month: 'Nov', income: 18000, expenses: 11200 },
        { month: 'Dec', income: 18000, expenses: 12800 },
        { month: 'Jan', income: 18000, expenses: 10400 },
        { month: 'Feb', income: 19500, expenses: 9900 },
        { month: 'Mar', income: 18000, expenses: 10100 },
        { month: 'Apr', income: 18000, expenses: 9800 },
      ];
    }
    const now = new Date();
    const months: { month: string; income: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleString(isArabic ? 'ar-SA' : 'en-US', { month: 'short' });
      const exp = expenseEntries
        .filter((e) => e.date.startsWith(key))
        .reduce((s, e) => s + e.amount, 0);
      const inc = incomeEntries
        .filter((e) => e.date.startsWith(key))
        .reduce((s, e) => s + e.amount, 0);
      months.push({ month: label, income: inc, expenses: exp });
    }
    return months;
  }, [expenseEntries, incomeEntries, isDemoMode, isArabic]);

  // Spending by category
  const categoryTotals = useMemo(() => {
    if (isDemoMode) {
      return [
        { category: 'Housing', amount: 3500 },
        { category: 'Food', amount: 2200 },
        { category: 'Transport', amount: 1400 },
        { category: 'Shopping', amount: 900 },
        { category: 'Entertainment', amount: 600 },
        { category: 'Healthcare', amount: 400 },
        { category: 'Utilities', amount: 800 },
      ];
    }
    const totals: Record<string, number> = {};
    for (const e of expenseEntries) {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    }
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseEntries, isDemoMode]);

  const topCategory = categoryTotals[0];

  // AI-style insight bullets derived from real data
  const insights = useMemo(() => {
    const list: { icon: React.ReactNode; text: string; severity: 'good' | 'warn' | 'info' }[] = [];

    if (savingsRate >= 20)
      list.push({ icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, text: isArabic ? `معدل الادخار ${savingsRate.toFixed(0)}% — ممتاز. أنت تتجاوز النسبة المُوصى بها (20%).` : `Savings rate ${savingsRate.toFixed(0)}% — excellent, above the recommended 20%.`, severity: 'good' });
    else if (savingsRate >= 10)
      list.push({ icon: <Minus className="h-4 w-4 text-amber-500" />, text: isArabic ? `معدل الادخار ${savingsRate.toFixed(0)}%. حاول الوصول إلى 20% عبر تقليص المصروفات المتغيرة.` : `Savings rate ${savingsRate.toFixed(0)}%. Try reaching 20% by trimming variable expenses.`, severity: 'warn' });
    else
      list.push({ icon: <AlertTriangle className="h-4 w-4 text-rose-500" />, text: isArabic ? `معدل الادخار ${savingsRate.toFixed(0)}% — منخفض. أضف دخلاً إضافياً أو راجع مصروفاتك.` : `Savings rate ${savingsRate.toFixed(0)}% — low. Add income or review recurring expenses.`, severity: 'warn' });

    if (emergencyMonths >= 6)
      list.push({ icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />, text: isArabic ? `صندوق الطوارئ يغطي ${emergencyMonths.toFixed(1)} أشهر — أنت بأمان.` : `Emergency fund covers ${emergencyMonths.toFixed(1)} months — you're well covered.`, severity: 'good' });
    else
      list.push({ icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, text: isArabic ? `صندوق الطوارئ ${emergencyMonths.toFixed(1)} أشهر (الهدف 6). تحتاج ${formatCurrency((emergencyTarget - emergencyMonths) * monthlyExpenses, 'SAR', locale)} إضافية.` : `Emergency fund at ${emergencyMonths.toFixed(1)} months (target: 6). Need ${formatCurrency((emergencyTarget - emergencyMonths) * monthlyExpenses, 'SAR', locale)} more.`, severity: 'warn' });

    if (topCategory)
      list.push({ icon: <BarChart3 className="h-4 w-4 text-sky-500" />, text: isArabic ? `${topCategory.category} هو أكبر فئة إنفاق بـ ${formatCurrency(topCategory.amount, 'SAR', locale)}.` : `${topCategory.category} is your largest spending category at ${formatCurrency(topCategory.amount, 'SAR', locale)}.`, severity: 'info' });

    if (fireProgress >= 25)
      list.push({ icon: <Flame className="h-4 w-4 text-amber-500" />, text: isArabic ? `اكتملت ${fireProgress.toFixed(0)}% من هدف الاستقلال المالي FIRE.` : `${fireProgress.toFixed(0)}% of FIRE goal reached — strong progress.`, severity: 'good' });
    else
      list.push({ icon: <Flame className="h-4 w-4 text-muted-foreground" />, text: isArabic ? `FIRE: ${fireProgress.toFixed(0)}% مكتمل. زيادة الاستثمارات تسرّع تحقيق الهدف.` : `FIRE: ${fireProgress.toFixed(0)}% complete. Growing investments will accelerate your timeline.`, severity: 'info' });

    return list;
  }, [savingsRate, emergencyMonths, topCategory, fireProgress, monthlyExpenses, isArabic, locale]);

  const scoreCards = [
    {
      title: { en: 'Savings Rate', ar: 'معدل الادخار' },
      value: `${savingsRate.toFixed(0)}%`,
      target: '20%',
      progress: Math.min(100, (savingsRate / 20) * 100),
      icon: Wallet,
      color: savingsRate >= 20 ? 'text-emerald-500' : savingsRate >= 10 ? 'text-amber-500' : 'text-rose-500',
    },
    {
      title: { en: 'Emergency Fund', ar: 'صندوق الطوارئ' },
      value: `${emergencyMonths.toFixed(1)} mo`,
      target: '6 mo',
      progress: Math.min(100, (emergencyMonths / 6) * 100),
      icon: ShieldCheck,
      color: emergencyMonths >= 6 ? 'text-emerald-500' : emergencyMonths >= 3 ? 'text-amber-500' : 'text-rose-500',
    },
    {
      title: { en: 'FIRE Progress', ar: 'تقدم FIRE' },
      value: `${fireProgress.toFixed(0)}%`,
      target: '100%',
      progress: fireProgress,
      icon: Flame,
      color: fireProgress >= 50 ? 'text-emerald-500' : 'text-amber-500',
    },
    {
      title: { en: 'Net Worth', ar: 'صافي الثروة' },
      value: formatCurrency(netWorth, 'SAR', locale),
      target: null,
      progress: null,
      icon: TrendingUp,
      color: netWorth >= 0 ? 'text-gold' : 'text-rose-500',
    },
  ];

  return (
    <DashboardShell>
      <div className="rhythm-page w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{isArabic ? 'الرؤى المالية' : 'Financial Insights'}</h1>
          <p className="text-sm text-muted-foreground">
            {isArabic ? 'تحليل ذكي لوضعك المالي' : 'Intelligent analysis of your financial position'}
          </p>
        </div>

        {/* Score cards */}
        <div className="rhythm-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
          {scoreCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title.en}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className="rhythm-card h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? card.title.ar : card.title.en}
                      </p>
                      <Icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                    {card.target && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isArabic ? 'الهدف:' : 'Target:'} {card.target}
                      </p>
                    )}
                    {card.progress !== null && (
                      <Progress value={card.progress} className="h-1 mt-2" />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* AI Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{isArabic ? 'ملاحظات مالية' : 'Financial Observations'}</CardTitle>
            <CardDescription>
              {isArabic ? 'مستخلصة من بياناتك الحالية' : 'Derived from your current data'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 rounded-lg bg-muted/40 p-3"
              >
                <div className="mt-0.5 shrink-0">{insight.icon}</div>
                <p className="text-sm leading-relaxed">{insight.text}</p>
              </motion.div>
            ))}
            <div className="pt-1">
              <Link href="/advisor">
                <Button variant="outline" size="sm" className="gap-2">
                  {isArabic ? 'اسأل المستشار الذكي للمزيد' : 'Ask AI Advisor for deeper insights'}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Income vs Expenses trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isArabic ? 'الدخل مقابل المصروفات (6 أشهر)' : 'Income vs Expenses (6 months)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, 'SAR', locale)} />
                  <Line type="monotone" dataKey="income" name={isArabic ? 'الدخل' : 'Income'} stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expenses" name={isArabic ? 'المصروفات' : 'Expenses'} stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        {categoryTotals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {isArabic ? 'الإنفاق حسب الفئة' : 'Spending by Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryTotals.slice(0, 7)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" stroke="var(--muted-foreground)" fontSize={11} width={72} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, 'SAR', locale)} />
                    <Bar dataKey="amount" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget alerts from snapshot */}
        {snapshot.alerts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{isArabic ? 'تنبيهات نشطة' : 'Active Alerts'}</CardTitle>
                <Link href="/alerts">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    {isArabic ? 'عرض الكل' : 'View all'}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {snapshot.alerts.slice(0, 4).map((alert, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-lg p-3 ${
                  alert.severity === 'critical' ? 'bg-rose-500/10' : alert.severity === 'warning' ? 'bg-amber-500/10' : 'bg-muted/40'
                }`}>
                  {alert.severity === 'critical' ? (
                    <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                  ) : alert.severity === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`ms-auto shrink-0 text-xs ${
                      alert.severity === 'critical' ? 'border-rose-500/30 text-rose-500' :
                      alert.severity === 'warning' ? 'border-amber-500/30 text-amber-500' : ''
                    }`}
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
