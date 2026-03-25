'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Briefcase,
  Flame,
  Receipt,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Building2,
  Car,
  Landmark,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardShell } from '@/components/layout';
import { StatCard, CurrencyDisplay, DashboardSkeleton } from '@/components/shared';
import { useAppStore, formatCurrency, formatPercent } from '@/store/useAppStore';
import {
  LineChart,
  Line,
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
import { useState, useEffect } from 'react';

// Mock data for demonstration
const mockNetWorthData = [
  { month: 'Jan', value: 450000 },
  { month: 'Feb', value: 465000 },
  { month: 'Mar', value: 448000 },
  { month: 'Apr', value: 472000 },
  { month: 'May', value: 489000 },
  { month: 'Jun', value: 512000 },
  { month: 'Jul', value: 525000 },
  { month: 'Aug', value: 518000 },
  { month: 'Sep', value: 542000 },
  { month: 'Oct', value: 568000 },
  { month: 'Nov', value: 585000 },
  { month: 'Dec', value: 612450 },
];

const mockHoldings = [
  { ticker: '2222.SR', name: 'Saudi Aramco', shares: 100, avgCost: 32.5, currentPrice: 35.2, change: 2.3, isShariah: true },
  { ticker: '1120.SR', name: 'Al Rajhi Bank', shares: 50, avgCost: 98.0, currentPrice: 105.5, change: 1.8, isShariah: true },
  { ticker: 'COMI.CA', name: 'CIB Egypt', shares: 200, avgCost: 45.0, currentPrice: 52.3, change: -0.5, isShariah: false },
  { ticker: 'AAPL', name: 'Apple Inc.', shares: 25, avgCost: 175.0, currentPrice: 182.5, change: 1.2, isShariah: false },
  { ticker: '1180.SR', name: 'Maaden', shares: 75, avgCost: 45.0, currentPrice: 48.2, change: 0.8, isShariah: true },
];

const mockTransactions = [
  { id: 1, category: 'food', description: 'Grocery Shopping', amount: -450, date: '2025-01-15' },
  { id: 2, category: 'transport', description: 'Uber Rides', amount: -120, date: '2025-01-14' },
  { id: 3, category: 'investment', description: 'Stock Purchase', amount: -5000, date: '2025-01-13' },
  { id: 4, category: 'housing', description: 'Rent Payment', amount: -4500, date: '2025-01-01' },
  { id: 5, category: 'zakat', description: 'Charity Donation', amount: -1000, date: '2025-01-10' },
];

const mockMarketData = [
  { name: 'TASI', value: '12,458.32', change: 1.2 },
  { name: 'EGX 30', value: '32,156.78', change: -0.5 },
  { name: 'S&P 500', value: '5,842.15', change: 0.8 },
  { name: 'Gold', value: '2,648.50', change: 0.3 },
  { name: 'USD/SAR', value: '3.75', change: 0.0 },
];

const budgetData = [
  { name: 'Housing', value: 4500, color: '#D4A843' },
  { name: 'Food', value: 2500, color: '#10B981' },
  { name: 'Transport', value: 800, color: '#3B82F6' },
  { name: 'Investment', value: 5000, color: '#8B5CF6' },
  { name: 'Other', value: 1500, color: '#6B7280' },
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
  const { locale } = useAppStore();
  const isArabic = locale === 'ar';
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <DashboardShell>
        <DashboardSkeleton />
      </DashboardShell>
    );
  }

  const totalNetWorth = 612450;
  const totalAssets = 750000;
  const totalLiabilities = 137550;
  const portfolioValue = 485000;
  const todayGain = 3250;
  const todayGainPercent = 0.67;
  const fireProgress = 40.8;
  const yearsToFire = 18;

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {isArabic ? 'لوحة التحكم' : 'Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic
                ? 'مرحباً بك مجدداً! إليك نظرة عامة على وضعك المالي'
                : 'Welcome back! Here\'s your financial overview'}
            </p>
          </div>
          <Button className="gap-2 bg-gold hover:bg-gold-dark text-navy-dark">
            <Sparkles className="w-4 h-4" />
            {isArabic ? 'رؤية الذكاء الاصطناعي' : 'AI Insight'}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={isArabic ? 'صافي الثروة' : 'Net Worth'}
            value={formatCurrency(totalNetWorth, 'SAR', locale)}
            change={5.2}
            changeLabel={isArabic ? 'هذا الشهر' : 'this month'}
            icon={Wallet}
            iconColor="text-gold bg-gold/10"
          />
          <StatCard
            title={isArabic ? 'قيمة المحفظة' : 'Portfolio Value'}
            value={formatCurrency(portfolioValue, 'SAR', locale)}
            change={todayGainPercent}
            changeLabel={isArabic ? 'اليوم' : 'today'}
            icon={Briefcase}
            iconColor="text-emerald-500 bg-emerald-500/10"
          />
          <StatCard
            title={isArabic ? 'تقدم FIRE' : 'FIRE Progress'}
            value={`${fireProgress.toFixed(1)}%`}
            icon={Flame}
            iconColor="text-orange-500 bg-orange-500/10"
          />
          <StatCard
            title={isArabic ? 'الميزانية الشهرية' : 'Monthly Budget'}
            value="67%"
            change={-12}
            changeLabel={isArabic ? 'متبقي' : 'remaining'}
            icon={Receipt}
            iconColor="text-blue-500 bg-blue-500/10"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Net Worth Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gold" />
                {isArabic ? 'اتجاه صافي الثروة' : 'Net Worth Trend'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'آخر 12 شهراً' : 'Last 12 months'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockNetWorthData}>
                    <defs>
                      <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="month"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value, 'SAR', locale), '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--gold)"
                      strokeWidth={2}
                      fill="url(#netWorthGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* FIRE Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                {isArabic ? 'تقدم FIRE' : 'FIRE Progress'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Ring */}
              <div className="relative w-40 h-40 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${fireProgress * 4.4} 440`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{fireProgress.toFixed(0)}%</span>
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? 'مكتمل' : 'complete'}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isArabic ? 'الهدف' : 'Target'}
                  </span>
                  <span className="font-medium">1,500,000 SAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isArabic ? 'الحالي' : 'Current'}
                  </span>
                  <span className="font-medium">{formatCurrency(totalNetWorth, 'SAR', locale)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isArabic ? 'سنوات متبقية' : 'Years to FIRE'}
                  </span>
                  <span className="font-medium text-gold">{yearsToFire} {isArabic ? 'سنة' : 'years'}</span>
                </div>
              </div>

              <Button className="w-full" variant="outline">
                {isArabic ? 'عرض التفاصيل' : 'View Details'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Holdings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{isArabic ? 'أفضل الممتلكات' : 'Top Holdings'}</CardTitle>
                <Button variant="ghost" size="sm">
                  {isArabic ? 'عرض الكل' : 'View All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {mockHoldings.map((holding, index) => {
                    const marketValue = holding.shares * holding.currentPrice;
                    const gainLoss = (holding.currentPrice - holding.avgCost) * holding.shares;
                    const gainLossPercent = ((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100;

                    return (
                      <motion.div
                        key={holding.ticker}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {holding.ticker.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{holding.ticker}</span>
                            {holding.isShariah && (
                              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                {isArabic ? 'شريعة' : 'Shariah'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground truncate block">
                            {holding.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(marketValue, 'SAR', locale)}
                          </div>
                          <div className={`text-sm flex items-center justify-end gap-1 ${gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {gainLoss >= 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {gainLossPercent.toFixed(2)}%
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Budget Overview */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? 'الميزانية الشهرية' : 'Monthly Budget'}</CardTitle>
              <CardDescription>
                {isArabic ? 'يناير 2025' : 'January 2025'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {budgetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {budgetData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{isArabic ? item.name : item.name}</span>
                    </div>
                    <span>{formatCurrency(item.value, 'SAR', locale)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Third Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? 'المعاملات الأخيرة' : 'Recent Transactions'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {mockTransactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        {categoryIcons[tx.category] || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm truncate block">
                          {tx.description}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tx.date}
                        </span>
                      </div>
                      <span className={`font-medium ${tx.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {tx.amount < 0 ? '' : '+'}{formatCurrency(Math.abs(tx.amount), 'SAR', locale)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Market Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? 'نظرة السوق' : 'Market Snapshot'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockMarketData.map((market, index) => (
                  <div
                    key={market.name}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium">{market.name}</span>
                    <div className="text-right">
                      <div className="font-medium">{market.value}</div>
                      <div className={`text-xs ${market.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Insight */}
          <Card className="bg-gradient-to-br from-primary/10 to-gold/10 border-gold/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-gold" />
                {isArabic ? 'رؤية الذكاء الاصطناعي' : 'AI Insight'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {isArabic
                  ? 'محفظتك تظهر أداءً قوياً هذا الشهر مع عائد إجمالي 5.2%. فكر في إعادة توازن توزيعك بزيادة استثماراتك في القطاع المصرفي السعودي.'
                  : 'Your portfolio is showing strong performance this month with a total return of 5.2%. Consider rebalancing your allocation by increasing your Saudi banking sector investments.'}
              </p>
              <Button className="w-full bg-gold hover:bg-gold-dark text-navy-dark">
                <Sparkles className="w-4 h-4 mr-2" />
                {isArabic ? 'تحليل كامل' : 'Full Analysis'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Assets & Liabilities Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-500" />
                {isArabic ? 'الأصول' : 'Assets'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Landmark className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <span className="font-medium">{isArabic ? 'نقد ومدخرات' : 'Cash & Savings'}</span>
                      <span className="text-xs text-muted-foreground block">4 {isArabic ? 'حسابات' : 'accounts'}</span>
                    </div>
                  </div>
                  <span className="font-medium">{formatCurrency(250000, 'SAR', locale)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <span className="font-medium">{isArabic ? 'استثمارات' : 'Investments'}</span>
                      <span className="text-xs text-muted-foreground block">5 {isArabic ? 'أسهم' : 'stocks'}</span>
                    </div>
                  </div>
                  <span className="font-medium">{formatCurrency(485000, 'SAR', locale)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <span className="font-medium">{isArabic ? 'عقارات' : 'Real Estate'}</span>
                      <span className="text-xs text-muted-foreground block">1 {isArabic ? 'عقار' : 'property'}</span>
                    </div>
                  </div>
                  <span className="font-medium">{formatCurrency(15000, 'SAR', locale)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between">
                <span className="font-medium">{isArabic ? 'إجمالي الأصول' : 'Total Assets'}</span>
                <span className="font-bold text-emerald-500">{formatCurrency(totalAssets, 'SAR', locale)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-rose-500" />
                {isArabic ? 'الالتزامات' : 'Liabilities'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                      <Landmark className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <span className="font-medium">{isArabic ? 'قرض عقاري' : 'Mortgage'}</span>
                      <span className="text-xs text-muted-foreground block">{isArabic ? 'متبقي 18 سنة' : '18 years left'}</span>
                    </div>
                  </div>
                  <span className="font-medium">{formatCurrency(120000, 'SAR', locale)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <span className="font-medium">{isArabic ? 'قرض سيارة' : 'Car Loan'}</span>
                      <span className="text-xs text-muted-foreground block">{isArabic ? 'متبقي 3 سنوات' : '3 years left'}</span>
                    </div>
                  </div>
                  <span className="font-medium">{formatCurrency(17550, 'SAR', locale)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between">
                <span className="font-medium">{isArabic ? 'إجمالي الالتزامات' : 'Total Liabilities'}</span>
                <span className="font-bold text-rose-500">{formatCurrency(totalLiabilities, 'SAR', locale)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
