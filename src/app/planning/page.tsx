'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RefreshCw,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardShell } from '@/components/layout';
import { StatCard } from '@/components/shared';
import { useAppStore, formatCurrency } from '@/store/useAppStore';
import { buildForecast, buildForecastSummary, type ForecastPeriod } from '@/lib/recurring-obligations';

const categoryColors: Record<string, string> = {
  housing: '#D4A843',
  food: '#10B981',
  transport: '#3B82F6',
  entertainment: '#8B5CF6',
  investment: '#06B6D4',
  zakat: '#EC4899',
  healthcare: '#F43F5E',
  education: '#14B8A6',
  utilities: '#F59E0B',
  household_allowance: '#0EA5E9',
  other: '#6B7280',
};

const categoryLabels: Record<string, { en: string; ar: string }> = {
  housing: { en: 'Housing', ar: 'السكن' },
  food: { en: 'Food', ar: 'الطعام' },
  transport: { en: 'Transport', ar: 'المواصلات' },
  entertainment: { en: 'Entertainment', ar: 'الترفيه' },
  investment: { en: 'Investment', ar: 'الاستثمار' },
  zakat: { en: 'Zakat & Charity', ar: 'الزكاة والصدقات' },
  healthcare: { en: 'Healthcare', ar: 'الرعاية الصحية' },
  education: { en: 'Education', ar: 'التعليم' },
  utilities: { en: 'Utilities', ar: 'الفواتير' },
  household_allowance: { en: 'Household Allowance', ar: 'المصروف المنزلي' },
  other: { en: 'Other', ar: 'أخرى' },
};

function PeriodCard({ period, locale, isArabic }: { period: ForecastPeriod; locale: 'ar' | 'en'; isArabic: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{period.label}</p>
            <p className="text-xs text-muted-foreground">
              {period.obligations.length} {isArabic ? 'التزام' : 'obligation(s)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-bold text-lg ${period.totalAmount > 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
            {period.totalAmount > 0 ? `-${formatCurrency(period.totalAmount, 'SAR', locale)}` : '—'}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && period.obligations.length > 0 && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="space-y-2 border-t pt-3">
            {period.obligations.map((obl) => (
              <div key={obl.id} className="flex items-center gap-2 text-sm">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: categoryColors[obl.category] || '#6B7280' }}
                />
                <span className="flex-1 truncate">{obl.title}</span>
                <span className="text-xs text-muted-foreground">{obl.dueDate}</span>
                <span className="font-medium">{formatCurrency(obl.amount, obl.currency, locale)}</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${obl.status === 'paid' ? 'text-emerald-500' : obl.status === 'overdue' ? 'text-rose-500' : obl.status === 'due_soon' ? 'text-amber-500' : 'text-blue-500'}`}
                >
                  {obl.status === 'paid' ? (isArabic ? 'مدفوع' : 'Paid') : obl.status === 'overdue' ? (isArabic ? 'متأخر' : 'Overdue') : obl.status === 'due_soon' ? (isArabic ? 'قريباً' : 'Due soon') : (isArabic ? 'قادم' : 'Upcoming')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function PlanningPage() {
  const locale = useAppStore((s) => s.locale);
  const incomeEntries = useAppStore((s) => s.incomeEntries);
  const recurringObligations = useAppStore((s) => s.recurringObligations);
  const isArabic = locale === 'ar';

  const monthlyIncome = useMemo(() => {
    return incomeEntries.reduce((sum, e) => {
      if (!e.isRecurring) return sum;
      switch (e.frequency) {
        case 'weekly': return sum + e.amount * 52 / 12;
        case 'quarterly': return sum + e.amount / 3;
        case 'yearly': return sum + e.amount / 12;
        default: return sum + e.amount;
      }
    }, 0);
  }, [incomeEntries]);

  const summary3 = useMemo(() => buildForecastSummary(recurringObligations, 3, monthlyIncome), [recurringObligations, monthlyIncome]);
  const summary6 = useMemo(() => buildForecastSummary(recurringObligations, 6, monthlyIncome), [recurringObligations, monthlyIncome]);
  const summary12 = useMemo(() => buildForecastSummary(recurringObligations, 12, monthlyIncome), [recurringObligations, monthlyIncome]);
  const forecast12 = useMemo(() => buildForecast(recurringObligations, 12), [recurringObligations]);

  const chartData = useMemo(() =>
    forecast12.map((p) => ({
      month: p.label.split(' ')[0], // short month
      obligations: p.totalAmount,
      income: monthlyIncome,
      surplus: Math.max(0, monthlyIncome - p.totalAmount),
    })),
    [forecast12, monthlyIncome]
  );

  // Decision insights
  const insights = useMemo(() => {
    const items: Array<{ type: 'warning' | 'ok' | 'info'; en: string; ar: string }> = [];

    if (summary12.projectedSurplus < 0) {
      items.push({
        type: 'warning',
        en: `Obligations exceed income over 12 months by ${formatCurrency(Math.abs(summary12.projectedSurplus), 'SAR', 'en')}. Review or reduce commitments before making new investments.`,
        ar: `الالتزامات تتجاوز الدخل خلال 12 شهراً بمقدار ${formatCurrency(Math.abs(summary12.projectedSurplus), 'SAR', 'ar')}. راجع التزاماتك قبل أي استثمارات جديدة.`,
      });
    } else if (summary12.projectedSurplus < monthlyIncome * 2) {
      items.push({
        type: 'info',
        en: `Cash flow is tight over the next 12 months. Surplus of ${formatCurrency(summary12.projectedSurplus, 'SAR', 'en')} leaves limited room for discretionary spending.`,
        ar: `التدفق النقدي ضيق خلال الـ 12 شهراً القادمة. الفائض ${formatCurrency(summary12.projectedSurplus, 'SAR', 'ar')} يترك مساحة محدودة للإنفاق التقديري.`,
      });
    } else {
      items.push({
        type: 'ok',
        en: `Strong projected surplus of ${formatCurrency(summary12.projectedSurplus, 'SAR', 'en')} over 12 months. Good conditions to consider savings or investments.`,
        ar: `فائض متوقع قوي ${formatCurrency(summary12.projectedSurplus, 'SAR', 'ar')} على مدى 12 شهراً. ظروف جيدة للنظر في المدخرات أو الاستثمارات.`,
      });
    }

    if (summary12.heaviestMonth) {
      items.push({
        type: 'info',
        en: `Heaviest obligation month: ${summary12.heaviestMonth.label} with ${formatCurrency(summary12.heaviestMonth.totalAmount, 'SAR', 'en')} due. Plan liquidity ahead of time.`,
        ar: `الشهر الأعلى التزامات: ${summary12.heaviestMonth.label} بمبلغ ${formatCurrency(summary12.heaviestMonth.totalAmount, 'SAR', 'ar')}. خطط للسيولة مسبقاً.`,
      });
    }

    if (summary3.monthlyAverage > monthlyIncome * 0.7 && monthlyIncome > 0) {
      items.push({
        type: 'warning',
        en: 'Obligations consume over 70% of income in the next 3 months. Delay non-essential purchases.',
        ar: 'الالتزامات تستهلك أكثر من 70% من الدخل في الأشهر الثلاثة القادمة. أجّل المشتريات غير الضرورية.',
      });
    }

    return items;
  }, [summary3, summary12, monthlyIncome]);

  const hasObligations = recurringObligations.length > 0;

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isArabic ? 'التخطيط المالي' : 'Financial Planning'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic
                ? 'رؤية مستقبلية للالتزامات والتدفق النقدي لاتخاذ قرارات مالية أفضل'
                : 'Forward-looking cash flow and obligations view to support better financial decisions'}
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/budget?tab=obligations">
              <RefreshCw className="w-4 h-4" />
              {isArabic ? 'إدارة الالتزامات' : 'Manage Obligations'}
            </Link>
          </Button>
        </div>

        {!hasObligations && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">{isArabic ? 'لا توجد التزامات بعد' : 'No obligations added yet'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isArabic
                    ? 'أضف الإيجار والمصروف المنزلي والرسوم المدرسية وغيرها من الالتزامات المتكررة لرؤية توقعات التدفق النقدي.'
                    : 'Add rent, household allowance, school fees, and other recurring obligations to see cash flow projections.'}
                </p>
              </div>
              <Button asChild className="btn-primary gap-2 rounded-xl">
                <Link href="/budget">
                  <ArrowRight className="w-4 h-4" />
                  {isArabic ? 'إضافة الالتزامات' : 'Add Obligations'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isArabic ? 'الأشهر الـ 3 القادمة' : 'Next 3 Months'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold text-rose-500">
                -{formatCurrency(summary3.totalObligations, 'SAR', locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'متوسط شهري: ' : 'Monthly avg: '}{formatCurrency(summary3.monthlyAverage, 'SAR', locale)}
              </p>
              <p className={`text-sm font-medium ${summary3.projectedSurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {summary3.projectedSurplus >= 0 ? '+' : ''}{formatCurrency(summary3.projectedSurplus, 'SAR', locale)} {isArabic ? 'فائض متوقع' : 'projected surplus'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isArabic ? 'الأشهر الـ 6 القادمة' : 'Next 6 Months'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold text-rose-500">
                -{formatCurrency(summary6.totalObligations, 'SAR', locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'متوسط شهري: ' : 'Monthly avg: '}{formatCurrency(summary6.monthlyAverage, 'SAR', locale)}
              </p>
              <p className={`text-sm font-medium ${summary6.projectedSurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {summary6.projectedSurplus >= 0 ? '+' : ''}{formatCurrency(summary6.projectedSurplus, 'SAR', locale)} {isArabic ? 'فائض متوقع' : 'projected surplus'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isArabic ? 'الـ 12 شهراً القادمة' : 'Next 12 Months'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold text-rose-500">
                -{formatCurrency(summary12.totalObligations, 'SAR', locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'متوسط شهري: ' : 'Monthly avg: '}{formatCurrency(summary12.monthlyAverage, 'SAR', locale)}
              </p>
              <p className={`text-sm font-medium ${summary12.projectedSurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {summary12.projectedSurplus >= 0 ? '+' : ''}{formatCurrency(summary12.projectedSurplus, 'SAR', locale)} {isArabic ? 'فائض متوقع' : 'projected surplus'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Forecast Chart */}
        {hasObligations && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {isArabic ? 'التوقعات الشهرية للـ 12 شهراً' : '12-Month Monthly Forecast'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'الدخل مقابل الالتزامات المجدولة' : 'Income vs scheduled obligations'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" fontSize={11} stroke="var(--color-muted-foreground)" />
                    <YAxis fontSize={11} stroke="var(--color-muted-foreground)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value, 'SAR', locale),
                        name === 'income' ? (isArabic ? 'الدخل' : 'Income') : name === 'obligations' ? (isArabic ? 'الالتزامات' : 'Obligations') : (isArabic ? 'الفائض' : 'Surplus'),
                      ]}
                    />
                    {monthlyIncome > 0 && (
                      <Bar dataKey="income" name="income" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} opacity={0.5} />
                    )}
                    <Bar dataKey="obligations" name="obligations" fill="var(--color-chart-5)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decision Insights */}
        {insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                {isArabic ? 'دعم القرار المالي' : 'Financial Decision Support'}
              </CardTitle>
              <CardDescription>
                {isArabic
                  ? 'هذا دعم تخطيطي وليس نصيحة مالية مضمونة'
                  : 'This is planning support, not guaranteed financial advice'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={`flex gap-3 rounded-lg p-3 ${insight.type === 'warning' ? 'bg-rose-500/10 border border-rose-500/20' : insight.type === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}
                >
                  {insight.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                  ) : insight.type === 'ok' ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                  ) : (
                    <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                  )}
                  <p className="text-sm">{isArabic ? insight.ar : insight.en}</p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                {isArabic
                  ? 'هذه تحليلات تخطيطية. استشر مختصاً مالياً قبل اتخاذ قرارات استثمارية كبيرة.'
                  : 'These are planning insights. Consult a financial professional before making major investment decisions.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Period Detail Tabs */}
        <Tabs defaultValue="3m">
          <TabsList>
            <TabsTrigger value="3m">{isArabic ? '3 أشهر' : '3 Months'}</TabsTrigger>
            <TabsTrigger value="6m">{isArabic ? '6 أشهر' : '6 Months'}</TabsTrigger>
            <TabsTrigger value="12m">{isArabic ? '12 شهراً' : '12 Months'}</TabsTrigger>
          </TabsList>

          {([
            { value: '3m', summary: summary3 },
            { value: '6m', summary: summary6 },
            { value: '12m', summary: summary12 },
          ] as const).map(({ value, summary }) => (
            <TabsContent key={value} value={value} className="space-y-3 mt-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي الالتزامات' : 'Total Obligations'}</p>
                  <p className="text-xl font-bold text-rose-500">-{formatCurrency(summary.totalObligations, 'SAR', locale)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{isArabic ? 'الدخل المتوقع' : 'Expected Income'}</p>
                  <p className="text-xl font-bold text-emerald-500">+{formatCurrency(summary.totalIncome, 'SAR', locale)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{isArabic ? 'الفائض المتوقع' : 'Projected Surplus'}</p>
                  <p className={`text-xl font-bold ${summary.projectedSurplus >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                    {summary.projectedSurplus >= 0 ? '+' : ''}{formatCurrency(summary.projectedSurplus, 'SAR', locale)}
                  </p>
                </div>
              </div>
              {summary.periods.map((period) => (
                <PeriodCard key={period.month} period={period} locale={locale} isArabic={isArabic} />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardShell>
  );
}
