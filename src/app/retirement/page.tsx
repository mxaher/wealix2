'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PiggyBank,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardShell } from '@/components/layout';
import { StatCard, formatCurrency } from '@/components/shared';
import { useAppStore } from '@/store/useAppStore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Retirement calculation functions
function calculateRetirementProjection(
  currentAge: number,
  retirementAge: number,
  currentSavings: number,
  monthlyContribution: number,
  expectedReturn: number,
  inflationRate: number
) {
  const years = retirementAge - currentAge;
  const months = years * 12;
  const monthlyRate = expectedReturn / 100 / 12;
  
  // Future value of current savings
  const fvCurrentSavings = currentSavings * Math.pow(1 + monthlyRate, months);
  
  // Future value of monthly contributions (annuity)
  const fvContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  
  const totalAtRetirement = fvCurrentSavings + fvContributions;
  
  // Year by year projection
  const projection = [];
  let runningTotal = currentSavings;
  
  for (let year = 0; year <= years; year++) {
    const age = currentAge + year;
    projection.push({
      year,
      age,
      value: Math.round(runningTotal),
    });
    
    // Compound for one year
    runningTotal = runningTotal * Math.pow(1 + expectedReturn / 100, 1) + monthlyContribution * 12;
  }
  
  return {
    totalAtRetirement: Math.round(totalAtRetirement),
    projection,
  };
}

function calculateMonthlyIncome(
  totalSavings: number,
  yearsInRetirement: number,
  expectedReturn: number,
  inflationRate: number
): number {
  // Using the 4% rule adjusted for returns
  const withdrawalRate = 0.04;
  return (totalSavings * withdrawalRate) / 12;
}

export default function RetirementPage() {
  const { locale } = useAppStore();
  const isArabic = locale === 'ar';
  
  // State
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(60);
  const [currentSavings, setCurrentSavings] = useState(200000);
  const [monthlyContribution, setMonthlyContribution] = useState(5000);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [inflationRate, setInflationRate] = useState(3);
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState(15000);

  // Calculations
  const projection = useMemo(() => calculateRetirementProjection(
    currentAge,
    retirementAge,
    currentSavings,
    monthlyContribution,
    expectedReturn,
    inflationRate
  ), [currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn, inflationRate]);

  const monthlyIncomeAtRetirement = useMemo(() => 
    calculateMonthlyIncome(projection.totalAtRetirement, 25, expectedReturn, inflationRate),
    [projection.totalAtRetirement, expectedReturn, inflationRate]
  );

  const incomeGap = targetMonthlyIncome - monthlyIncomeAtRetirement;
  const isOnTrack = incomeGap <= 0;

  // Calculate required contribution to meet target
  const requiredMonthlyContribution = useMemo(() => {
    const years = retirementAge - currentAge;
    const months = years * 12;
    const monthlyRate = expectedReturn / 100 / 12;
    const targetSavings = (targetMonthlyIncome * 12) / 0.04; // Using 4% rule
    
    const fvCurrentSavings = currentSavings * Math.pow(1 + monthlyRate, months);
    const neededFromContributions = targetSavings - fvCurrentSavings;
    
    if (neededFromContributions <= 0) return 0;
    
    return Math.round(neededFromContributions / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate));
  }, [currentAge, retirementAge, currentSavings, expectedReturn, targetMonthlyIncome]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PiggyBank className="w-8 h-8 text-blue-500" />
              {isArabic ? 'مخطط التقاعد' : 'Retirement Planner'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic ? 'خطط لمستقبلك المالي' : 'Plan your financial future'}
            </p>
          </div>
        </div>

        {/* Status Card */}
        <Card className={isOnTrack ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30' : 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30'}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {isOnTrack ? (
                <div className="p-3 rounded-full bg-emerald-500/20">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-amber-500/20">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
              )}
              <div>
                <p className="text-lg font-medium">
                  {isOnTrack 
                    ? (isArabic ? 'في المسار الصحيح!' : 'On Track!') 
                    : (isArabic ? 'يحتاج انتباه' : 'Needs Attention')
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {isOnTrack
                    ? (isArabic ? 'أنت على الطريق الصحيح لتحقيق هدف التقاعد' : 'You\'re on track to meet your retirement goal')
                    : (isArabic ? `زيادة المساهمة الشهرية بـ ${formatCurrency(requiredMonthlyContribution - monthlyContribution, 'SAR', locale)}` : `Increase monthly contribution by ${formatCurrency(requiredMonthlyContribution - monthlyContribution, 'SAR', locale)}`)
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={isArabic ? 'المدخرات الحالية' : 'Current Savings'}
            value={formatCurrency(currentSavings, 'SAR', locale)}
            icon={PiggyBank}
            iconColor="text-blue-500 bg-blue-500/10"
          />
          <StatCard
            title={isArabic ? 'عند التقاعد' : 'At Retirement'}
            value={formatCurrency(projection.totalAtRetirement, 'SAR', locale)}
            icon={TrendingUp}
            iconColor="text-emerald-500 bg-emerald-500/10"
          />
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isArabic ? 'الدخل الشهري المتوقع' : 'Expected Monthly Income'}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(monthlyIncomeAtRetirement, 'SAR', locale)}</p>
              <Badge variant={isOnTrack ? 'default' : 'destructive'} className="mt-2">
                {isOnTrack 
                  ? (isArabic ? 'يحقق الهدف' : 'Meets Goal') 
                  : (isArabic ? 'تحت الهدف' : 'Below Goal')
                }
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isArabic ? 'سنوات حتى التقاعد' : 'Years to Retirement'}</p>
              <p className="text-2xl font-bold mt-1">{retirementAge - currentAge} {isArabic ? 'سنة' : 'years'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projection" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projection">{isArabic ? 'التوقعات' : 'Projection'}</TabsTrigger>
            <TabsTrigger value="inputs">{isArabic ? 'المدخلات' : 'Inputs'}</TabsTrigger>
            <TabsTrigger value="optimizer">{isArabic ? 'المحسن' : 'Optimizer'}</TabsTrigger>
          </TabsList>

          {/* Projection Tab */}
          <TabsContent value="projection" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{isArabic ? 'نمو المدخرات' : 'Savings Growth'}</CardTitle>
                  <CardDescription>
                    {isArabic ? `من عمر ${currentAge} إلى ${retirementAge}` : `From age ${currentAge} to ${retirementAge}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={projection.projection}>
                        <defs>
                          <linearGradient id="retirementGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="age" stroke="var(--muted-foreground)" />
                        <YAxis stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                        <Area type="monotone" dataKey="value" stroke="var(--chart-2)" fill="url(#retirementGradient)" name={isArabic ? 'المدخرات' : 'Savings'} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Projection Table */}
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'الجدول الزمني' : 'Timeline'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-72">
                    <div className="space-y-2">
                      {projection.projection.filter((_, i) => i % 5 === 0 || i === projection.projection.length - 1).map((row) => (
                        <div key={row.year} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{isArabic ? `عمر ${row.age}` : `Age ${row.age}`}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(row.value, 'SAR', locale)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي المساهمات' : 'Total Contributions'}</p>
                      <p className="font-medium">{formatCurrency(monthlyContribution * 12 * (retirementAge - currentAge), 'SAR', locale)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-emerald-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'عوائد الاستثمار' : 'Investment Returns'}</p>
                      <p className="font-medium">{formatCurrency(projection.totalAtRetirement - currentSavings - monthlyContribution * 12 * (retirementAge - currentAge), 'SAR', locale)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-gold" />
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'سنوات التقاعد' : 'Retirement Years'}</p>
                      <p className="font-medium">25 {isArabic ? 'سنة' : 'years'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inputs Tab */}
          <TabsContent value="inputs">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'معلمات التقاعد' : 'Retirement Parameters'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'العمر الحالي' : 'Current Age'}</Label>
                      <Input
                        type="number"
                        value={currentAge}
                        onChange={(e) => setCurrentAge(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'عمر التقاعد' : 'Retirement Age'}</Label>
                      <Input
                        type="number"
                        value={retirementAge}
                        onChange={(e) => setRetirementAge(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'المدخرات الحالية' : 'Current Savings (SAR)'}</Label>
                      <Input
                        type="number"
                        value={currentSavings}
                        onChange={(e) => setCurrentSavings(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'المساهمة الشهرية' : 'Monthly Contribution (SAR)'}</Label>
                      <Input
                        type="number"
                        value={monthlyContribution}
                        onChange={(e) => setMonthlyContribution(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'العائد المتوقع (%)' : 'Expected Return (%)'}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={expectedReturn}
                        onChange={(e) => setExpectedReturn(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الدخل الشهري المستهدف' : 'Target Monthly Income (SAR)'}</Label>
                      <Input
                        type="number"
                        value={targetMonthlyIncome}
                        onChange={(e) => setTargetMonthlyIncome(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimizer Tab */}
          <TabsContent value="optimizer">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'محسن المساهمات' : 'Contribution Optimizer'}</CardTitle>
                <CardDescription>
                  {isArabic ? 'اعرف المساهمة المطلوبة لتحقيق هدفك' : 'Find out the contribution needed to reach your goal'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'المساهمة الشهرية المطلوبة' : 'Required Monthly Contribution'}</p>
                      <p className="text-3xl font-bold text-gold">{formatCurrency(requiredMonthlyContribution, 'SAR', locale)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{isArabic ? 'المساهمة الحالية' : 'Current Contribution'}</p>
                      <p className="text-xl font-medium">{formatCurrency(monthlyContribution, 'SAR', locale)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{isArabic ? 'الفجوة الشهرية' : 'Monthly Gap'}</p>
                      <p className={`text-2xl font-bold ${requiredMonthlyContribution > monthlyContribution ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {formatCurrency(Math.abs(requiredMonthlyContribution - monthlyContribution), 'SAR', locale)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {requiredMonthlyContribution > monthlyContribution
                          ? (isArabic ? 'زيادة مطلوبة' : 'increase needed')
                          : (isArabic ? 'فائض عن الهدف' : 'surplus above goal')
                        }
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{isArabic ? 'نسبة الهدف المحقق' : 'Goal Achievement'}</p>
                      <p className="text-2xl font-bold">
                        {Math.min(100, Math.round((monthlyContribution / requiredMonthlyContribution) * 100))}%
                      </p>
                      <Progress value={Math.min(100, (monthlyContribution / requiredMonthlyContribution) * 100)} className="mt-2" />
                    </CardContent>
                  </Card>
                </div>

                <Button className="w-full" onClick={() => setMonthlyContribution(requiredMonthlyContribution)}>
                  {isArabic ? 'تحديث المساهمة للهدف' : 'Update Contribution to Goal'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
