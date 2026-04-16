'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Target,
  TrendingUp,
  Calendar,
  SlidersHorizontal,
  Zap,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider as UISlider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardShell } from '@/components/layout';
import { StatCard, FeatureGate, formatCurrency } from '@/components/shared';
import { useAppStore } from '@/store/useAppStore';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';
import { useFinancialSnapshot } from '@/hooks/useFinancialSnapshot';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

// FIRE calculation functions
function calculateFireNumber(annualExpenses: number, withdrawalRate: number): number {
  if (!withdrawalRate || withdrawalRate <= 0 || withdrawalRate > 100) return 0;
  if (annualExpenses <= 0) return 0;
  const result = annualExpenses / (withdrawalRate / 100);
  return Number.isFinite(result) ? result : 0;
}

function calculateYearsToFire(
  currentNetWorth: number,
  fireNumber: number,
  annualSavings: number,
  expectedReturn: number
) {
  if (currentNetWorth >= fireNumber) return 0;
  if (annualSavings <= 0) return null;
  
  const rate = expectedReturn / 100;
  let years = 0;
  let netWorth = currentNetWorth;
  
  while (netWorth < fireNumber && years < 100) {
    netWorth = netWorth * (1 + rate) + annualSavings;
    years++;
  }
  
  return netWorth >= fireNumber ? years : null;
}

type FireFieldKey =
  | 'withdrawalRate'
  | 'expectedReturn'
  | 'inflationRate'
  ;

type FireErrors = Partial<Record<FireFieldKey, string>>;

function calculateProjectedGrowth(
  currentNetWorth: number,
  annualSavings: number,
  expectedReturn: number,
  years: number
): { year: number; netWorth: number }[] {
  const rate = expectedReturn / 100;
  const data: { year: number; netWorth: number }[] = [];
  let netWorth = currentNetWorth;
  
  for (let i = 0; i <= years; i++) {
    data.push({ year: i, netWorth: Math.round(netWorth) });
    netWorth = netWorth * (1 + rate) + annualSavings;
  }
  
  return data;
}

export default function FirePage() {
  const { locale } = useAppStore();
  const { snapshot } = useFinancialSnapshot();
  const financialSettings = useFinancialSettingsStore((state) => state.data);
  const updateFinancialSettings = useFinancialSettingsStore((state) => state.updateFields);
  const isArabic = locale === 'ar';

  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [inflationRate, setInflationRate] = useState(3);
  const [fireType, setFireType] = useState<'lean' | 'regular' | 'fat'>('regular');
  const [errors, setErrors] = useState<FireErrors>({});
  const [additionalSavings, setAdditionalSavings] = useState(0);
  const annualExpenses = financialSettings.monthlyExpenses > 0
    ? financialSettings.monthlyExpenses * 12
    : snapshot.fire.annualExpenses;
  const currentNetWorth = snapshot.netWorth.net;
  const currentInvestableAssets = snapshot.fire.currentInvestableAssets;
  const annualSavings = financialSettings.monthlyIncome > 0 || financialSettings.monthlyExpenses > 0
    ? (financialSettings.monthlyIncome - financialSettings.monthlyExpenses) * 12
    : snapshot.fire.annualSavings;

  const fireNumber = useMemo(
    () => financialSettings.fireTarget > 0 ? financialSettings.fireTarget : snapshot.fire.fireNumber || calculateFireNumber(annualExpenses, withdrawalRate),
    [annualExpenses, financialSettings.fireTarget, snapshot.fire.fireNumber, withdrawalRate]
  );
  const yearsToFire = useMemo(
    () => calculateYearsToFire(currentInvestableAssets, fireNumber, annualSavings + additionalSavings, expectedReturn),
    [additionalSavings, annualSavings, currentInvestableAssets, expectedReturn, fireNumber]
  );
  const progress = useMemo(
    () => (
      financialSettings.fireTarget > 0
        ? (fireNumber > 0 ? Number(Math.min((currentInvestableAssets / fireNumber) * 100, 100).toFixed(2)) : 0)
        : snapshot.fire.progressPct
    ),
    [currentInvestableAssets, financialSettings.fireTarget, fireNumber, snapshot.fire.progressPct]
  );
  const projectionData = useMemo(
    () => calculateProjectedGrowth(currentInvestableAssets, annualSavings + additionalSavings, expectedReturn, Math.max((yearsToFire ?? 20) + 5, 20)),
    [additionalSavings, annualSavings, currentInvestableAssets, expectedReturn, yearsToFire]
  );

  const yearsWithOriginalSavings = calculateYearsToFire(currentInvestableAssets, fireNumber, annualSavings, expectedReturn);
  const yearsSaved = (yearsWithOriginalSavings ?? yearsToFire ?? 0) - (yearsToFire ?? 0);

  const scenarios = useMemo(() => {
    const conservative = {
      expectedReturn: 5,
      inflationRate: 4,
      yearsToFire: calculateYearsToFire(currentInvestableAssets, fireNumber, annualSavings, 5),
    };
    const baseCase = {
      expectedReturn: 7,
      inflationRate: 3,
      yearsToFire: yearsToFire,
    };
    const optimistic = {
      expectedReturn: 9,
      inflationRate: 2,
      yearsToFire: calculateYearsToFire(currentInvestableAssets, fireNumber, annualSavings, 9),
    };
    return { conservative, baseCase, optimistic };
  }, [annualSavings, currentInvestableAssets, fireNumber, yearsToFire]);

  const fireTypeMultipliers = { lean: 0.7, regular: 1, fat: 1.5 };
  const adjustedFireNumber = fireNumber * fireTypeMultipliers[fireType];
  const fireYearLabel = yearsToFire === null ? (isArabic ? 'يتطلب رفع الادخار' : 'Needs higher savings') : String(financialSettings.fireTargetAge || (new Date().getFullYear() + yearsToFire));

  const validateField = (field: FireFieldKey, value: number): string | undefined => {
    if (!Number.isFinite(value) || value <= 0) {
      return isArabic ? 'أدخل قيمة أكبر من صفر.' : 'Enter a value greater than zero.';
    }

    if (field === 'withdrawalRate' && value >= expectedReturn) {
      return isArabic
        ? 'يجب أن يكون معدل السحب أقل من العائد المتوقع لتجنب نتيجة غير منطقية.'
        : 'Withdrawal rate must stay below expected return to avoid an impossible scenario.';
    }

    if (field === 'expectedReturn' && value <= withdrawalRate) {
      return isArabic
        ? 'يجب أن يكون العائد المتوقع أعلى من معدل السحب.'
        : 'Expected return must be higher than the withdrawal rate.';
    }

    return undefined;
  };

  const updateField = (
    field: FireFieldKey,
    value: number,
    setter: (next: number) => void
  ) => {
    setter(value);
    setErrors((current) => ({
      ...current,
      [field]: validateField(field, value),
    }));
  };

  const scenarioIssue =
    withdrawalRate >= expectedReturn
      ? (isArabic
          ? 'هذا السيناريو غير ممكن حالياً لأن معدل السحب أعلى من العائد المتوقع. خفّض السحب أو ارفع العائد المتوقع.'
          : 'This scenario is not mathematically viable because the withdrawal rate is higher than the expected return. Lower the withdrawal rate or raise expected return.')
      : null;

  const inputClassName = 'rounded-xl border-border bg-background';

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Flame className="w-8 h-8 text-orange-500" />
              {isArabic ? 'متعقب FIRE' : 'FIRE Tracker'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic ? 'احسب وقت الاستقلال المالي' : 'Calculate your path to financial independence'}
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={fireType} onValueChange={(v) => setFireType(v as 'lean' | 'regular' | 'fat')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lean">LeanFIRE</SelectItem>
                <SelectItem value="regular">FIRE</SelectItem>
                <SelectItem value="fat">FatFIRE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{isArabic ? 'إعدادات FIRE المشتركة' : 'Shared FIRE Settings'}</CardTitle>
              <CardDescription>
                {isArabic
                  ? 'التعديلات هنا تنعكس فوراً في الإعدادات والدخل ولوحة التحكم.'
                  : 'Changes here instantly sync with Settings, Income, and Dashboard.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{isArabic ? 'هدف FIRE' : 'FIRE Target'}</Label>
              <Input
                type="number"
                min="0"
                value={financialSettings.fireTarget}
                onChange={(event) => updateFinancialSettings({ fireTarget: Number(event.target.value || 0) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'المصروفات الشهرية' : 'Monthly Expenses'}</Label>
              <Input
                type="number"
                min="0"
                value={financialSettings.monthlyExpenses}
                onChange={(event) => updateFinancialSettings({ monthlyExpenses: Number(event.target.value || 0) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'العمر المستهدف' : 'Target Age'}</Label>
              <Input
                type="number"
                min="30"
                max="100"
                value={financialSettings.fireTargetAge}
                onChange={(event) => updateFinancialSettings({ fireTargetAge: Number(event.target.value || 60) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* FIRE Number Hero */}
        <Card className="bg-gradient-to-br from-orange-500/10 via-gold/10 to-emerald-500/10 border-gold/30">
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-2">
                {isArabic ? 'رقم FIRE الخاص بك' : 'Your FIRE Number'}
              </p>
              <motion.p
                key={adjustedFireNumber}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl md:text-6xl font-bold text-gold mb-4"
                data-testid="fire-number"
              >
                {formatCurrency(adjustedFireNumber, 'SAR', locale)}
              </motion.p>
              <p className="text-sm text-muted-foreground">
                {isArabic
                  ? `${withdrawalRate}% معدل سحب • ${formatCurrency(annualExpenses, 'SAR', locale)} مصروفات سنوية`
                  : `${withdrawalRate}% withdrawal rate • ${formatCurrency(annualExpenses, 'SAR', locale)} annual expenses`}
              </p>
              {scenarioIssue && (
                <p className="mt-3 text-sm text-destructive">{scenarioIssue}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={isArabic ? 'صافي الثروة الحالي' : 'Current Net Worth'}
            value={formatCurrency(currentNetWorth, 'SAR', locale)}
            icon={TrendingUp}
            iconColor="text-gold bg-gold/10"
          />
          <StatCard
            title={isArabic ? 'التقدم' : 'Progress'}
            value={`${progress.toFixed(1)}%`}
            icon={Target}
            iconColor="text-emerald-500 bg-emerald-500/10"
            testId="fire-progress"
          />
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isArabic ? 'سنوات حتى FIRE' : 'Years to FIRE'}</p>
              <p className="text-2xl font-bold mt-1" data-testid="fire-years">
                {scenarioIssue
                  ? (isArabic ? 'غير ممكن' : 'Not viable')
                  : yearsToFire === 0 
                  ? (isArabic ? 'محقق!' : 'Achieved!')
                  : `${yearsToFire} ${isArabic ? 'سنة' : 'years'}`
              }
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isArabic ? 'المدخرات السنوية' : 'Annual Savings'}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(annualSavings + additionalSavings, 'SAR', locale)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">{isArabic ? 'تقدم FIRE' : 'FIRE Progress'}</span>
              <span className="font-medium" data-testid="fire-progress-bar-label">{progress.toFixed(1)}%</span>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-4" />
              {progress < 100 && (
                <div
                  className="absolute top-0 h-4 w-1 bg-gold"
                  style={{ left: '25%' }}
                />
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{formatCurrency(0, 'SAR', locale)}</span>
              <span>{formatCurrency(adjustedFireNumber, 'SAR', locale)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="calculator" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calculator">{isArabic ? 'الحاسبة' : 'Calculator'}</TabsTrigger>
            <TabsTrigger value="impact">{isArabic ? 'تأثير المدخرات' : 'Savings Impact'}</TabsTrigger>
            <TabsTrigger value="scenarios">
              <FeatureGate feature="fire.scenarios" fallback={isArabic ? 'السيناريوهات' : 'Scenarios'}>
                {isArabic ? 'السيناريوهات' : 'Scenarios'}
              </FeatureGate>
            </TabsTrigger>
          </TabsList>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inputs */}
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'معايير FIRE' : 'FIRE Parameters'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'المصروفات السنوية' : 'Annual Expenses'}</Label>
                    <Input className={inputClassName} type="number" value={annualExpenses} readOnly />
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? 'مشتقة مباشرة من المصروفات الشهرية الموحّدة في Wealix.' : 'Derived directly from the canonical monthly expense snapshot.'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'معدل السحب (%)' : 'Withdrawal Rate (%)'}</Label>
                    <Input
                      className={inputClassName}
                      type="number"
                      step="0.1"
                      value={withdrawalRate}
                      onBlur={(e) => updateField('withdrawalRate', parseFloat(e.target.value) || 0, setWithdrawalRate)}
                      onChange={(e) => updateField('withdrawalRate', parseFloat(e.target.value) || 0, setWithdrawalRate)}
                    />
                    {errors.withdrawalRate && <p className="text-sm text-destructive">{errors.withdrawalRate}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'العائد المتوقع (%)' : 'Expected Return (%)'}</Label>
                    <Input
                      className={inputClassName}
                      type="number"
                      step="0.1"
                      value={expectedReturn}
                      onBlur={(e) => updateField('expectedReturn', parseFloat(e.target.value) || 0, setExpectedReturn)}
                      onChange={(e) => updateField('expectedReturn', parseFloat(e.target.value) || 0, setExpectedReturn)}
                    />
                    {errors.expectedReturn && <p className="text-sm text-destructive">{errors.expectedReturn}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'معدل التضخم (%)' : 'Inflation Rate (%)'}</Label>
                    <Input
                      className={inputClassName}
                      type="number"
                      step="0.1"
                      value={inflationRate}
                      onBlur={(e) => updateField('inflationRate', parseFloat(e.target.value) || 0, setInflationRate)}
                      onChange={(e) => updateField('inflationRate', parseFloat(e.target.value) || 0, setInflationRate)}
                    />
                    {errors.inflationRate && <p className="text-sm text-destructive">{errors.inflationRate}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'صافي الثروة الحالي' : 'Current Net Worth'}</Label>
                    <Input className={inputClassName} type="number" value={currentNetWorth} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'المدخرات السنوية' : 'Annual Savings'}</Label>
                    <Input className={inputClassName} type="number" value={annualSavings} readOnly />
                  </div>
                </CardContent>
              </Card>

              {/* Projection Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'مسار النمو المتوقع' : 'Projected Growth Path'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={projectionData}>
                        <defs>
                          <linearGradient id="fireGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="year" stroke="var(--muted-foreground)" />
                        <YAxis stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                        <Area type="monotone" dataKey="netWorth" stroke="var(--gold)" fill="url(#fireGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 bg-gold/10 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">{isArabic ? 'تاريخ FIRE المتوقع:' : 'Estimated FIRE Date:'}</span>{' '}
                      {fireYearLabel}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Savings Impact Tab */}
          <TabsContent value="impact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  {isArabic ? 'أداة تأثير المدخرات' : 'Savings Impact Tool'}
                </CardTitle>
                <CardDescription>
                  {isArabic ? 'انظر كيف يؤثر زيادة المدخرات على وقت FIRE' : 'See how increasing savings affects your FIRE timeline'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{isArabic ? 'زيادة المدخرات السنوية' : 'Additional Annual Savings'}</Label>
                    <span className="font-medium">{formatCurrency(additionalSavings, 'SAR', locale)}</span>
                  </div>
                  <UISlider
                    value={[additionalSavings]}
                    onValueChange={([v]) => setAdditionalSavings(v)}
                    max={100000}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 SAR</span>
                    <span>100,000 SAR</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-muted/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-emerald-500/20">
                          <Zap className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{isArabic ? 'سنوات موفرة' : 'Years Saved'}</p>
                          <p className="text-2xl font-bold text-emerald-500">{yearsSaved} {isArabic ? 'سنة' : 'years'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-gold/20">
                          <Calendar className="w-6 h-6 text-gold" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{isArabic ? 'تاريخ FIRE الجديد' : 'New FIRE Date'}</p>
                          <p className="text-2xl font-bold text-gold">{fireYearLabel}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-500">
                    {isArabic
                      ? `زيادة مدخراتك بـ ${formatCurrency(additionalSavings, 'SAR', locale)} سنوياً تقربك من FIRE بـ ${yearsSaved} سنة!`
                      : `Increasing your savings by ${formatCurrency(additionalSavings, 'SAR', locale)} annually brings you ${yearsSaved} years closer to FIRE!`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios">
            <FeatureGate feature="fire.scenarios">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Conservative */}
                <Card className="border-blue-500/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-blue-500">{isArabic ? 'محافظ' : 'Conservative'}</CardTitle>
                      <AlertCircle className="w-5 h-5 text-blue-500" />
                    </div>
                    <CardDescription>5% return, 4% inflation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{scenarios.conservative.yearsToFire ?? '—'} {scenarios.conservative.yearsToFire === null ? '' : (isArabic ? 'سنة' : 'years')}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isArabic ? 'تاريخ FIRE:' : 'FIRE Date:'} {scenarios.conservative.yearsToFire === null ? '—' : new Date().getFullYear() + scenarios.conservative.yearsToFire}
                    </p>
                  </CardContent>
                </Card>

                {/* Base Case */}
                <Card className="border-gold/30 bg-gold/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gold">{isArabic ? 'الحالة الأساسية' : 'Base Case'}</CardTitle>
                      <CheckCircle className="w-5 h-5 text-gold" />
                    </div>
                    <CardDescription>7% return, 3% inflation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{scenarios.baseCase.yearsToFire ?? '—'} {scenarios.baseCase.yearsToFire === null ? '' : (isArabic ? 'سنة' : 'years')}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isArabic ? 'تاريخ FIRE:' : 'FIRE Date:'} {scenarios.baseCase.yearsToFire === null ? '—' : new Date().getFullYear() + scenarios.baseCase.yearsToFire}
                    </p>
                  </CardContent>
                </Card>

                {/* Optimistic */}
                <Card className="border-emerald-500/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-emerald-500">{isArabic ? 'متفائل' : 'Optimistic'}</CardTitle>
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                    <CardDescription>9% return, 2% inflation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{scenarios.optimistic.yearsToFire ?? '—'} {scenarios.optimistic.yearsToFire === null ? '' : (isArabic ? 'سنة' : 'years')}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isArabic ? 'تاريخ FIRE:' : 'FIRE Date:'} {scenarios.optimistic.yearsToFire === null ? '—' : new Date().getFullYear() + scenarios.optimistic.yearsToFire}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </FeatureGate>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
