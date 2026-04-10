'use client';
import Link from 'next/link';
import {
 TrendingUp,
 Wallet,
 Briefcase,
 Flame,
 Receipt,
 Sparkles,
 Calendar,
 AlertTriangle,
 ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardShell } from '@/components/layout';
import { FinancialSettingsSyncBadge, StatCard, DashboardSkeleton } from '@/components/shared';
import { useAppStore, formatCurrency } from '@/store/useAppStore';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';
import { getFireMetrics, getMonthlyExpenses, getMonthlyIncome, getNetMonthlySurplus, getNetWorth } from '@/lib/financial-snapshot';
import { useFinancialSnapshot } from '@/hooks/useFinancialSnapshot';
import {
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 AreaChart,
 Area,
 PieChart,
 Pie,
 Cell,
} from 'recharts';
import { useState, useEffect, useMemo } from 'react';

const mockNetWorthData = [
 { month: 'Jan', value: 525000 },
 { month: 'Feb', value: 531000 },
 { month: 'Mar', value: 528500 },
 { month: 'Apr', value: 536000 },
 { month: 'May', value: 542000 },
 { month: 'Jun', value: 549500 },
 { month: 'Jul', value: 556000 },
 { month: 'Aug', value: 552500 },
 { month: 'Sep', value: 561500 },
 { month: 'Oct', value: 568000 },
 { month: 'Nov', value: 576500 },
 { month: 'Dec', value: 587500 },
];

const mockHoldings = [
 { ticker: '2222.SR', name: 'Saudi Aramco', shares: 100, avgCost: 32.5, currentPrice: 35.2, change: 2.3, isShariah: true },
 { ticker: '1120.SR', name: 'Al Rajhi Bank', shares: 50, avgCost: 98.0, currentPrice: 105.5, change: 1.8, isShariah: true },
 { ticker: 'COMI.CA', name: 'CIB Egypt', shares: 200, avgCost: 45.0, currentPrice: 52.3, change: -0.5, isShariah: false },
 { ticker: 'AAPL', name: 'Apple Inc.', shares: 25, avgCost: 175.0, currentPrice: 182.5, change: 1.2, isShariah: false },
 { ticker: '1180.SR', name: 'Maaden', shares: 75, avgCost: 45.0, currentPrice: 48.2, change: 0.8, isShariah: true },
];

const mockTransactions = [
 { id: 1, category: 'food', description: 'Groceries and pantry', amount: -1850, date: '2026-03-15' },
 { id: 2, category: 'transport', description: 'Fuel and ride sharing', amount: -950, date: '2026-03-14' },
 { id: 3, category: 'investment', description: 'Monthly portfolio contribution', amount: -4000, date: '2026-03-13' },
 { id: 4, category: 'housing', description: 'Rent payment', amount: -7200, date: '2026-03-01' },
 { id: 5, category: 'other', description: 'Utilities and internet', amount: -980, date: '2026-03-10' },
];

const mockMarketData = [
 { name: 'TASI', value: '12,458.32', change: 1.2 },
 { name: 'EGX 30', value: '32,156.78', change: -0.5 },
 { name: 'S&P 500', value: '5,842.15', change: 0.8 },
 { name: 'Gold', value: '2,648.50', change: 0.3 },
 { name: 'USD/SAR', value: '3.75', change: 0.0 },
];

const budgetData = [
 { name: 'Housing', value: 7200, color: '#006aff' },
 { name: 'Food', value: 1850, color: '#00bb7f' },
 { name: 'Transport', value: 950, color: '#00b7d7' },
 { name: 'Entertainment', value: 1350, color: '#00bfff' },
 { name: 'Utilities', value: 980, color: '#99a1af' },
];

const categoryIcons: Record<string, React.ReactNode> = {
 food: '🍽️',
 transport: '🚗',
 investment: '📈',
 housing: '🏠',
 zakat: '🕌',
 other: '📦',
};

export default function DashboardPage() {
 const {
 locale,
 appMode,
 expenseEntries,
 } = useAppStore();
 const { snapshot } = useFinancialSnapshot();
 const financialSettings = useFinancialSettingsStore((state) => state.data);
 const isArabic = locale === 'ar';
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 const timer = setTimeout(() => setIsLoading(false), 450);
 return () => clearTimeout(timer);
 }, []);

 const isDemoMode = appMode === 'demo';
 const monthlyIncome = getMonthlyIncome(snapshot);
 const monthlyExpenses = getMonthlyExpenses(snapshot);
 const monthlySurplus = getNetMonthlySurplus(snapshot);
 const fireMetrics = getFireMetrics(snapshot);
 const totalNetWorth = isDemoMode ? 587500 : getNetWorth(snapshot);
 const portfolioValue = isDemoMode ? 452000 : snapshot.portfolio.totalInvestments;
 const todayGainPercent = isDemoMode ? 0.67 : 0;
 const fireProgress = isDemoMode ? 40.8 : fireMetrics.progressPct;
 const holdings = isDemoMode ? mockHoldings : snapshot.holdings.map((holding) => ({
 ...holding,
 change: holding.avgCost > 0 ? ((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100 : 0,
 }));

 const transactions = isDemoMode
 ? mockTransactions
 : expenseEntries
 .map((entry) => ({
 id: entry.id,
 category: entry.category.toLowerCase(),
 description: entry.description,
 amount: -entry.amount,
 date: entry.date,
 }))
 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
 .slice(0, 5);

 const marketData = isDemoMode ? mockMarketData : [];
 const netWorthChartData = isDemoMode
 ? mockNetWorthData
 : snapshot.totalAssets > 0 || snapshot.totalLiabilities > 0
 ? [
 {
 month: isArabic ? 'الآن' : 'Now',
 value: totalNetWorth,
 },
 ]
 : [];

 const liveSpendingByCategory = expenseEntries.reduce<Record<string, number>>((acc, entry) => {
 acc[entry.category] = (acc[entry.category] ?? 0) + entry.amount;
 return acc;
 }, {});

 const spendingChartData = isDemoMode
 ? budgetData
 : Object.entries(liveSpendingByCategory).map(([name, value], index) => ({
 name,
 value,
 color: ['#006aff', '#00bb7f', '#00b7d7', '#00bfff', '#99a1af', '#6366f1'][index % 6],
 }));

 const hasLiveData =
 monthlyIncome > 0 ||
 monthlyExpenses > 0 ||
 portfolioValue > 0 ||
 snapshot.totalAssets > 0 ||
 snapshot.totalLiabilities > 0 ||
 holdings.length > 0;

 const budgetUsage = isDemoMode
 ? 67
 : monthlyIncome > 0
 ? Math.min(100, Math.round((monthlyExpenses / monthlyIncome) * 100))
 : 0;
 const upcomingObligations = snapshot.obligations.pending.slice(0, 4);
 const forecastSummary3 = {
 totalObligations: snapshot.forecast.monthlyRows.slice(0, 3).reduce((sum, period) => sum + period.obligationPayments, 0),
 projectedSurplus: snapshot.forecast.monthlyRows.slice(0, 3).reduce((sum, period) => sum + (period.income - period.recurringExpenses - period.obligationPayments - period.oneTimeExpenses + period.maturityInflows), 0),
 periods: snapshot.forecast.monthlyRows.slice(0, 3),
 };
 const aiInsightSentences = (() => {
 if (isDemoMode) {
 return [
 isArabic ? 'الدخل والمصروفات والمحفظة تتجمع هنا في قراءة واحدة واضحة.' : 'Income, expenses, and portfolio are rolled into one clear operating view.',
 isArabic ? 'تقدم FIRE يتحدث مباشرة مع نفس بيانات صافي الثروة والادخار.' : 'FIRE progress is speaking directly to the same net-worth and savings data.',
 isArabic ? 'راقب الالتزامات القادمة والسيولة قبل أي قرار استثماري جديد.' : 'Watch near-term obligations and liquidity before any new investment move.',
 isArabic ? 'كلما أضفت بيانات حقيقية، تصبح هذه القراءة أكثر دقة.' : 'As you add real data, this operating brief becomes more precise.',
 ];
 }

 const obligationAlert = snapshot.obligations.pending.find((item) => item.fundingGap > 0) ?? snapshot.obligations.nextDue;
 const firstForecastStress = snapshot.forecast.firstAtRiskMonth;
 return [
 `${isArabic ? 'الدخل الشهري الموحّد' : 'Canonical monthly income'} ${formatCurrency(monthlyIncome, 'SAR', locale)} ${isArabic ? 'مقابل مصروفات' : 'against expenses of'} ${formatCurrency(monthlyExpenses, 'SAR', locale)}.`,
 obligationAlert
 ? `${isArabic ? 'أقرب التزام' : 'Nearest obligation'} ${obligationAlert.title} ${isArabic ? 'بقيمة' : 'for'} ${formatCurrency(obligationAlert.amount, 'SAR', locale)} ${isArabic ? 'ويتبقى له' : 'is due in'} ${obligationAlert.daysUntilDue} ${isArabic ? 'يوماً' : 'days'}.`
 : (isArabic ? 'لا توجد فجوات التزام حرجة حالياً.' : 'There are no critical obligation gaps right now.'),
 `${isArabic ? 'صافي الثروة' : 'Net worth'} ${formatCurrency(totalNetWorth, 'SAR', locale)} ${isArabic ? 'وصافي الثروة السائلة' : 'and liquid net worth'} ${formatCurrency(snapshot.netWorth.liquidNetWorth, 'SAR', locale)}.`,
 firstForecastStress
 ? `${isArabic ? 'أول شهر ضغط في التوقع' : 'First forecast stress month'} ${firstForecastStress.label} ${isArabic ? 'برصيد إغلاق' : 'with a closing balance of'} ${formatCurrency(firstForecastStress.closingBalance, 'SAR', locale)}.`
 : `${isArabic ? 'مسار FIRE الحالي' : 'Current FIRE path'} ${fireMetrics.yearsToFire === null ? (isArabic ? 'يحتاج رفع الادخار' : 'needs higher savings') : `${fireMetrics.yearsToFire} ${isArabic ? 'سنة تقريباً' : 'years out'}`}.`,
 ];
 })();

 if (isLoading) {
 return (
 <DashboardShell>
 <DashboardSkeleton />
 </DashboardShell>
 );
 }

 return (
 <DashboardShell>
 <div className="space-y-6">
 <section className="card-hover overflow-hidden rounded-[20px] border border-border bg-card p-6 shadow-card">
 <div className="absolute" />
 <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
 <div className="space-y-3">
 <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
 {isArabic ? 'نظام تشغيل الثروة الشخصية' : 'Personal Wealth Operating System'}
 </span>
 <div>
 <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
 {isArabic ? 'نظرة أوضح على ثروتك الحالية' : 'A clearer operating view of your wealth'}
 </h1>
 <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
 {isArabic
 ? isDemoMode
 ? 'هذا عرض تجريبي كامل لواجهة Wealix مع بيانات توضيحية لمتابعة الدخل والمصروفات والاستثمارات والتقدم نحو الاستقلال المالي.'
 : 'الوضع المباشر نشط. أضف الدخل والمصروفات والأصول لتبدأ لوحة التحكم بإظهار أرقامك الفعلية.'
 : isDemoMode
 ? 'This is the full Wealix demo workspace, showing how income, expenses, portfolio, and FIRE planning come together in one command center.'
 : 'Live mode is active. Add income, expenses, and assets to start building your real financial operating view.'}
 </p>
 </div>
 </div>
 <div className="flex flex-wrap gap-3">
 <Button asChild className="btn-primary gap-2 rounded-xl">
 <Link href="/advisor">
 <Sparkles className="h-4 w-4" />
 {isArabic ? 'تحليل ذكي' : 'Run AI Insight'}
 </Link>
 </Button>
 <Button asChild variant="outline" className="rounded-xl border-border bg-background/80">
 <Link href="/reports">
 {isArabic ? 'فتح التقارير' : 'Open Reports'}
 </Link>
 </Button>
 </div>
 </div>
 </section>

 <Card>
 <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
 <div>
 <p className="text-sm font-medium">{isArabic ? 'ملخص الإعدادات المالية المشتركة' : 'Shared Financial Settings'}</p>
 <p className="text-sm text-muted-foreground">
 {isArabic
 ? `دخل شهري ${formatCurrency(financialSettings.monthlyIncome, financialSettings.currency, locale)}، هدف FIRE ${formatCurrency(financialSettings.fireTarget, financialSettings.currency, locale)}، وصافي ثروة ${formatCurrency(financialSettings.netWorth, financialSettings.currency, locale)}.`
 : `Monthly income ${formatCurrency(financialSettings.monthlyIncome, financialSettings.currency, locale)}, FIRE target ${formatCurrency(financialSettings.fireTarget, financialSettings.currency, locale)}, and net worth ${formatCurrency(financialSettings.netWorth, financialSettings.currency, locale)}.`}
 </p>
 </div>
 <FinancialSettingsSyncBadge isArabic={isArabic} />
 </CardContent>
 </Card>

 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
 <StatCard
 title={isArabic ? 'صافي الثروة' : 'Net Worth'}
 value={formatCurrency(totalNetWorth, 'SAR', locale)}
 change={isDemoMode ? 5.2 : undefined}
 changeLabel={isDemoMode ? (isArabic ? 'هذا الشهر' : 'this month') : undefined}
 icon={Wallet}
 iconColor="text-primary bg-primary/10"
 testId="dashboard-net-worth"
 />
 <StatCard
 title={isArabic ? 'قيمة المحفظة' : 'Portfolio Value'}
 value={formatCurrency(portfolioValue, 'SAR', locale)}
 change={todayGainPercent}
 changeLabel={isArabic ? 'اليوم' : 'today'}
 icon={Briefcase}
 iconColor="text-accent bg-accent/10"
 />
 <StatCard
 title={isArabic ? 'تقدم FIRE' : 'FIRE Progress'}
 value={`${fireProgress.toFixed(1)}%`}
 icon={Flame}
 iconColor="text-orange-500 bg-orange-500/10"
 testId="dashboard-fire-progress"
 />
 <StatCard
 title={isArabic ? 'الميزانية الشهرية' : 'Monthly Budget'}
 value={`${budgetUsage}%`}
 change={isDemoMode ? -12 : undefined}
 changeLabel={isDemoMode ? (isArabic ? 'متبقي' : 'remaining') : undefined}
 icon={Receipt}
 iconColor="text-cyan-500 bg-cyan-500/10"
 />
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 <StatCard
 title={isArabic ? 'الدخل الشهري' : 'Monthly Income'}
 value={formatCurrency(monthlyIncome, 'SAR', locale)}
 icon={TrendingUp}
 iconColor="text-emerald-500 bg-emerald-500/10"
 variant="compact"
 testId="dashboard-monthly-income"
 />
 <StatCard
 title={isArabic ? 'المصروفات الشهرية' : 'Monthly Expenses'}
 value={formatCurrency(monthlyExpenses, 'SAR', locale)}
 icon={Receipt}
 iconColor="text-rose-500 bg-rose-500/10"
 variant="compact"
 testId="dashboard-monthly-expenses"
 />
 <StatCard
 title={isArabic ? 'الفائض الشهري' : 'Monthly Surplus'}
 value={`${monthlySurplus >= 0 ? '+' : ''}${formatCurrency(monthlySurplus, 'SAR', locale)}`}
 icon={Wallet}
 iconColor={monthlySurplus >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}
 variant="compact"
 testId="dashboard-monthly-surplus"
 />
 </div>

 {!isDemoMode && !hasLiveData && (
 <Card className="rounded-[20px] border-dashed border-border bg-card shadow-card">
 <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
 <div>
 <h2 className="text-lg font-semibold">
 {isArabic ? 'المساحة نظيفة وجاهزة' : 'This workspace is clean and ready'}
 </h2>
 <p className="mt-1 text-sm text-muted-foreground">
 {isArabic
 ? 'لا توجد بيانات تجريبية لهذا المستخدم. أضف الدخل والمصروفات والمحفظة لتبدأ Wealix في تكوين الصورة المالية الحقيقية.'
 : 'There is no demo data for this user. Add income, expenses, and holdings to start building your real financial picture.'}
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <Button asChild variant="outline" className="rounded-xl"><a href="/income">{isArabic ? 'إضافة دخل' : 'Add Income'}</a></Button>
 <Button asChild variant="outline" className="rounded-xl"><a href="/expenses">{isArabic ? 'إضافة مصروف' : 'Add Expense'}</a></Button>
 <Button asChild className="btn-primary rounded-xl"><a href="/portfolio">{isArabic ? 'إضافة محفظة' : 'Add Portfolio'}</a></Button>
 </div>
 </CardContent>
 </Card>
 )}

 <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
 <Card className="card-hover xl:col-span-3">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Sparkles className="h-5 w-5 text-primary" />
 {isArabic ? 'الملخص الذكي اليومي' : 'AI Insight'}
 </CardTitle>
 <CardDescription>{isArabic ? 'أربع جمل مبنية على السياق المالي الموحد' : 'A four-sentence brief built from the unified financial context'}</CardDescription>
 </CardHeader>
 <CardContent className="grid gap-3 md:grid-cols-2">
 {aiInsightSentences.map((sentence, index) => (
 <div key={index} className="rounded-xl border border-border bg-background/70 p-4 text-sm leading-6 text-foreground">
 {sentence}
 </div>
 ))}
 </CardContent>
 </Card>

 <Card className="card-hover xl:col-span-2">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="flex items-center gap-2">
 <TrendingUp className="h-5 w-5 text-primary" />
 {isArabic ? 'اتجاه صافي الثروة' : 'Net Worth Trend'}
 </CardTitle>
 <CardDescription>
 {isArabic ? 'آخر 12 شهراً' : 'Last 12 months'}
 </CardDescription>
 </div>
 <Button asChild variant="outline" size="sm" className="gap-1 text-xs rounded-xl shrink-0">
 <Link href="/reports">
 {isArabic ? 'تقرير صافي الثروة' : 'Net Worth Report'}
 </Link>
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={netWorthChartData}>
 <defs>
 <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.24} />
 <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
 <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
 <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
 <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
 <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fill="url(#netWorthGradient)" strokeWidth={2} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>

 <Card className="card-hover">
 <CardHeader>
 <CardTitle>{isArabic ? 'الإنفاق حسب الفئة' : 'Spending Mix'}</CardTitle>
 <CardDescription>{isArabic ? 'التوزيع الحالي' : 'Current distribution'}</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie data={spendingChartData} dataKey="value" nameKey="name" innerRadius={66} outerRadius={96} paddingAngle={4}>
 {spendingChartData.map((entry) => (
 <Cell key={entry.name} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 </div>

 <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
 <Card className="card-hover xl:col-span-2">
 <CardHeader>
 <CardTitle>{isArabic ? 'آخر المعاملات' : 'Recent Activity'}</CardTitle>
 <CardDescription>{isArabic ? 'مراجعة سريعة لآخر الحركات' : 'A quick review of the latest financial moves'}</CardDescription>
 </CardHeader>
 <CardContent>
 <ScrollArea className="h-80">
 <div className="space-y-3">
 {transactions.length > 0 ? transactions.map((transaction) => (
 <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
 <div className="flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-lg">
 {categoryIcons[transaction.category] ?? '•'}
 </div>
 <div>
 <p className="font-medium text-foreground">{transaction.description}</p>
 <p className="text-sm text-muted-foreground">{transaction.date}</p>
 </div>
 </div>
 <p className="financial-number text-sm font-semibold text-loss">
 {formatCurrency(Math.abs(transaction.amount), 'SAR', locale)}
 </p>
 </div>
 )) : (
 <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
 {isArabic ? 'لا توجد معاملات بعد' : 'No transactions yet'}
 </div>
 )}
 </div>
 </ScrollArea>
 </CardContent>
 </Card>

 <div className="space-y-6">
 <Card className="card-hover">
 <CardHeader>
 <CardTitle>{isArabic ? 'الأسواق والمتابعة' : 'Markets Snapshot'}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {marketData.length > 0 ? marketData.map((market) => (
 <div key={market.name} className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
 <div>
 <p className="font-medium">{market.name}</p>
 <p className="text-sm text-muted-foreground">{market.value}</p>
 </div>
 <span className={market.change >= 0 ? 'text-profit' : 'text-loss'}>
 {market.change >= 0 ? '+' : ''}
 {market.change}%
 </span>
 </div>
 )) : (
 <p className="text-sm text-muted-foreground">
 {isArabic ? 'أضف بياناتك لعرض لقطات السوق المرتبطة بمحفظتك.' : 'Add your live data to see market snapshots tied to your portfolio.'}
 </p>
 )}
 </CardContent>
 </Card>

 <Card className="card-hover">
 <CardHeader>
 <CardTitle>{isArabic ? 'تقدم نحو FIRE' : 'FIRE Progress'}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <div className="mb-2 flex items-center justify-between text-sm">
 <span className="text-muted-foreground">{isArabic ? 'الوصول إلى الهدف' : 'Goal completion'}</span>
 <span className="financial-number font-semibold">{fireProgress.toFixed(1)}%</span>
 </div>
 <Progress value={fireProgress} className="h-2.5" />
 </div>
 <p className="text-sm leading-6 text-muted-foreground">
 {isArabic
 ? 'يصير هذا المؤشر أكثر دقة كلما أضفت الأصول والدخل والمصروفات الحقيقية.'
 : 'This indicator becomes more accurate as you add your actual assets, income, and expenses.'}
 </p>
 </CardContent>
 </Card>

 <Card className="card-hover">
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle>{isArabic ? 'أكبر المراكز' : 'Top Holdings'}</CardTitle>
 <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
 <Link href="/portfolio">
 {isArabic ? 'عرض المحفظة' : 'View Portfolio'}
 <ChevronRight className="w-3 h-3" />
 </Link>
 </Button>
 </div>
 </CardHeader>
 <CardContent className="space-y-3">
 {holdings.slice(0, 4).map((holding) => (
 <div key={holding.ticker} className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
 <div>
 <p className="font-medium">{holding.name}</p>
 <p className="text-sm text-muted-foreground">{holding.ticker}</p>
 </div>
 <span className={holding.change >= 0 ? 'text-profit' : 'text-loss'}>
 {holding.change >= 0 ? '+' : ''}
 {holding.change.toFixed(1)}%
 </span>
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 </div>

 {/* Upcoming Obligations + 3-Month Forecast */}
 <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
 <Card className="card-hover">
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2">
 <Calendar className="h-5 w-5 text-primary" />
 {isArabic ? 'الالتزامات القادمة (30 يوماً)' : 'Upcoming Obligations (30 days)'}
 </CardTitle>
 <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
 <Link href="/planning">
 {isArabic ? 'كل التوقعات' : 'Full forecast'}
 <ChevronRight className="w-3 h-3" />
 </Link>
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {upcomingObligations.length === 0 ? (
 <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
 {isArabic ? 'لا توجد التزامات مستحقة في الـ 30 يوماً القادمة.' : 'No obligations due in the next 30 days.'}
 <div className="mt-2">
 <Button asChild variant="link" size="sm" className="text-xs">
 <Link href="/budget">{isArabic ? 'إضافة التزامات' : 'Add obligations'}</Link>
 </Button>
 </div>
 </div>
 ) : (
 <div className="space-y-2">
 {upcomingObligations.map((occ) => (
 <div key={`${occ.id}-${occ.dueDate}`} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
 <div>
 <p className="font-medium text-sm">{occ.title}</p>
 <p className="text-xs text-muted-foreground">
 {occ.dueDate} · {occ.daysUntilDue === 0 ? (isArabic ? 'اليوم' : 'Today') : occ.daysUntilDue < 0 ? (isArabic ? 'متأخر' : 'Overdue') : (isArabic ? `خلال ${occ.daysUntilDue} يوم` : `in ${occ.daysUntilDue}d`)}
 </p>
 </div>
 <span className={`font-semibold text-sm ${occ.status === 'overdue' ? 'text-rose-500' : occ.status === 'due_soon' ? 'text-amber-500' : ''}`}>
 {formatCurrency(occ.amount, occ.currency, locale)}
 </span>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 <Card className="card-hover">
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2">
 <TrendingUp className="h-5 w-5 text-primary" />
 {isArabic ? 'توقعات 3 أشهر' : '3-Month Forecast'}
 </CardTitle>
 <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
 <Link href="/planning">
 {isArabic ? 'التخطيط الكامل' : 'Full plan'}
 <ChevronRight className="w-3 h-3" />
 </Link>
 </Button>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div className="rounded-xl bg-rose-500/10 p-3">
 <p className="text-xs text-muted-foreground">{isArabic ? 'إجمالي الالتزامات' : 'Total Obligations'}</p>
 <p className="text-lg font-bold text-rose-500">
 -{formatCurrency(forecastSummary3.totalObligations, 'SAR', locale)}
 </p>
 </div>
 <div className={`rounded-xl p-3 ${forecastSummary3.projectedSurplus >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
 <p className="text-xs text-muted-foreground">{isArabic ? 'الفائض المتوقع' : 'Projected Surplus'}</p>
 <p className={`text-lg font-bold ${forecastSummary3.projectedSurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
 {forecastSummary3.projectedSurplus >= 0 ? '+' : ''}{formatCurrency(forecastSummary3.projectedSurplus, 'SAR', locale)}
 </p>
 </div>
 </div>

 {forecastSummary3.projectedSurplus < 0 && (
 <div className="flex gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-600">
 <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
 <span>{isArabic ? 'الالتزامات تتجاوز الدخل المتوقع في الـ 3 أشهر القادمة.' : 'Obligations exceed expected income in the next 3 months.'}</span>
 </div>
 )}

 <div className="space-y-2">
 {forecastSummary3.periods.map((period) => (
 <div key={period.month} className="flex items-center justify-between rounded-xl border px-3 py-2">
 <span className="text-sm font-medium">{period.label}</span>
 <span className="text-sm text-rose-500 font-medium">
 {period.obligationPayments > 0 ? `-${formatCurrency(period.obligationPayments, 'SAR', locale)}` : '—'}
 </span>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </DashboardShell>
 );
}
