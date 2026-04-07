'use client';

import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Home,
  Landmark,
  Lightbulb,
  MoreHorizontal,
  PiggyBank,
  Plus,
  RefreshCw,
  ShoppingBag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardShell } from '@/components/layout';
import { StatCard } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { buildDailyPlanningSnapshot, type DailyPlanningSnapshot } from '@/lib/ai/daily-planning';
import { buildBudgetCriticalAlerts, buildDashboardInsightLines, buildFinancialPersonaFromClientContext } from '@/lib/financial-brain-surface';
import { buildWealixAIContextFromClientContext } from '@/lib/wealix-ai-context';
import { createOpaqueId } from '@/lib/ids';
import { buildForecast, buildForecastSummary, getUpcomingOccurrences } from '@/lib/recurring-obligations';
import {
  formatCurrency,
  type ExpenseEntry,
  type OneTimeExpense,
  type RecurringFrequency,
  type RecurringObligation,
  type SavingsAccount,
  useAppStore,
} from '@/store/useAppStore';

const budgetToExpenseCategory: Record<string, ExpenseEntry['category']> = {
  housing: 'Housing',
  food: 'Food',
  transport: 'Transport',
  entertainment: 'Entertainment',
  investment: 'Other',
  zakat: 'Other',
  healthcare: 'Healthcare',
  education: 'Education',
  utilities: 'Utilities',
  household_allowance: 'Household',
  other: 'Other',
};

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

const categoryIcons = {
  housing: Home,
  food: Utensils,
  transport: Landmark,
  entertainment: ChevronRight,
  investment: TrendingUp,
  zakat: PiggyBank,
  healthcare: AlertCircle,
  education: Target,
  utilities: RefreshCw,
  household_allowance: ShoppingBag,
  other: MoreHorizontal,
} satisfies Record<string, ComponentType<{ className?: string }>>;

const obligationFrequencyLabels: Record<RecurringFrequency, { en: string; ar: string }> = {
  monthly: { en: 'Monthly', ar: 'شهري' },
  quarterly: { en: 'Quarterly', ar: 'ربع سنوي' },
  semi_annual: { en: 'Every 6 months', ar: 'كل 6 أشهر' },
  annual: { en: 'Yearly', ar: 'سنوي' },
  one_time: { en: 'One-time', ar: 'مرة واحدة' },
  custom: { en: 'Custom', ar: 'مخصص' },
};

const defaultObligationForm = {
  title: '',
  category: 'household_allowance',
  amount: '',
  currency: 'SAR',
  dueDay: '1',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  frequency: 'monthly' as RecurringFrequency,
  customIntervalMonths: '',
  notes: '',
};

const defaultOneTimeExpenseForm = {
  title: '',
  category: 'other',
  amount: '',
  dueDate: new Date().toISOString().slice(0, 10),
  priority: 'medium' as OneTimeExpense['priority'],
  fundingSource: '',
  notes: '',
};

const defaultSavingsAccountForm = {
  name: '',
  type: 'awaeed' as SavingsAccount['type'],
  provider: 'Al Rajhi',
  principal: '',
  currentBalance: '',
  annualProfitRate: '4.5',
  termMonths: '6',
  openedAt: new Date().toISOString().slice(0, 10),
  maturityDate: new Date(new Date().getFullYear(), new Date().getMonth() + 6, 1).toISOString().slice(0, 10),
  purposeLabel: '',
  profitPayoutMethod: 'at_maturity' as SavingsAccount['profitPayoutMethod'],
  notes: '',
};

const sectionOrder = ['digest', 'budget', 'obligations', 'forecast'] as const;
type BudgetPlanningSection = typeof sectionOrder[number];

function categoryLabel(category: string, isArabic: boolean) {
  return isArabic ? categoryLabels[category]?.ar ?? category : categoryLabels[category]?.en ?? category;
}

function cardDirectionProps(isArabic: boolean) {
  return {
    dir: isArabic ? 'rtl' as const : 'ltr' as const,
    className: isArabic ? 'text-right' : '',
  };
}

export function BudgetPlanningPage({
  initialSnapshot,
}: {
  initialSnapshot?: DailyPlanningSnapshot | null;
}) {
  const locale = useAppStore((state) => state.locale);
  const incomeEntries = useAppStore((state) => state.incomeEntries);
  const expenseEntries = useAppStore((state) => state.expenseEntries);
  const portfolioHoldings = useAppStore((state) => state.portfolioHoldings);
  const assets = useAppStore((state) => state.assets);
  const liabilities = useAppStore((state) => state.liabilities);
  const budgetLimits = useAppStore((state) => state.budgetLimits);
  const recurringObligations = useAppStore((state) => state.recurringObligations) ?? [];
  const oneTimeExpenses = useAppStore((state) => state.oneTimeExpenses) ?? [];
  const savingsAccounts = useAppStore((state) => state.savingsAccounts) ?? [];
  const notificationPreferences = useAppStore((state) => state.notificationPreferences);
  const addExpenseEntry = useAppStore((state) => state.addExpenseEntry);
  const deleteExpenseEntry = useAppStore((state) => state.deleteExpenseEntry);
  const setBudgetLimits = useAppStore((state) => state.setBudgetLimits);
  const addRecurringObligation = useAppStore((state) => state.addRecurringObligation);
  const deleteRecurringObligation = useAppStore((state) => state.deleteRecurringObligation);
  const markObligationPaid = useAppStore((state) => state.markObligationPaid);
  const addOneTimeExpense = useAppStore((state) => state.addOneTimeExpense);
  const deleteOneTimeExpense = useAppStore((state) => state.deleteOneTimeExpense);
  const addSavingsAccount = useAppStore((state) => state.addSavingsAccount);
  const deleteSavingsAccount = useAppStore((state) => state.deleteSavingsAccount);
  const { isSignedIn, user } = useUser();
  const searchParams = useSearchParams();
  const isArabic = locale === 'ar';
  const defaultSection = searchParams.get('section');
  const initialSection = sectionOrder.includes(defaultSection as BudgetPlanningSection)
    ? (defaultSection as BudgetPlanningSection)
    : 'digest';

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddObligation, setShowAddObligation] = useState(false);
  const [showAddOneTimeExpense, setShowAddOneTimeExpense] = useState(false);
  const [showAddSavingsAccount, setShowAddSavingsAccount] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'food', description: '', amount: '' });
  const [obligationForm, setObligationForm] = useState(defaultObligationForm);
  const [oneTimeExpenseForm, setOneTimeExpenseForm] = useState(defaultOneTimeExpenseForm);
  const [savingsAccountForm, setSavingsAccountForm] = useState(defaultSavingsAccountForm);

  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const monthlyIncome = useMemo(() => {
    return incomeEntries.reduce((sum, entry) => {
      if (!entry.isRecurring) {
        return sum;
      }

      switch (entry.frequency) {
        case 'weekly':
          return sum + (entry.amount * 52) / 12;
        case 'quarterly':
          return sum + entry.amount / 3;
        case 'yearly':
          return sum + entry.amount / 12;
        default:
          return sum + entry.amount;
      }
    }, 0);
  }, [incomeEntries]);

  const spendingByCategory = expenseEntries.reduce((acc, entry) => {
    const key = budgetToExpenseCategory[entry.category] ?? entry.category.toLowerCase();
    acc[key] = (acc[key] || 0) + entry.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartBudget = budgetLimits.map((item) => ({
    category: item.category,
    budget: item.limit,
    actual: spendingByCategory[item.category] || 0,
    color: item.color || categoryColors[item.category] || '#6B7280',
  }));
  const visibleBudgetRows = useMemo(
    () => chartBudget.filter((item) => item.budget > 0 || item.actual > 0),
    [chartBudget]
  );

  const upcomingObligations = useMemo(
    () => getUpcomingOccurrences(recurringObligations, 90),
    [recurringObligations]
  );
  const actionableUpcomingObligations = useMemo(
    () => upcomingObligations.filter((item) => item.status !== 'paid'),
    [upcomingObligations]
  );
  const forecast12 = useMemo(() => buildForecast(recurringObligations, 12), [recurringObligations]);
  const summary3 = useMemo(() => buildForecastSummary(recurringObligations, 3, monthlyIncome), [monthlyIncome, recurringObligations]);
  const summary12 = useMemo(() => buildForecastSummary(recurringObligations, 12, monthlyIncome), [monthlyIncome, recurringObligations]);
  const configuredBudgetCategories = useMemo(
    () => budgetLimits.filter((item) => item.limit > 0).length,
    [budgetLimits]
  );
  const totalBudgetCapacity = useMemo(
    () => budgetLimits.reduce((sum, item) => sum + item.limit, 0),
    [budgetLimits]
  );
  const wealixContext = useMemo(
    () => buildWealixAIContextFromClientContext(user?.id ?? 'guest', {
      currency: 'SAR',
      holdings: portfolioHoldings,
      assets,
      liabilities,
      incomeEntries,
      expenseEntries,
      budgetLimits,
      recurringObligations,
      oneTimeExpenses,
      savingsAccounts,
    }),
    [user?.id, portfolioHoldings, assets, liabilities, incomeEntries, expenseEntries, budgetLimits, recurringObligations, oneTimeExpenses, savingsAccounts]
  );
  const financialBrainPersona = useMemo(
    () => buildFinancialPersonaFromClientContext(user?.id ?? 'guest', {
      currency: 'SAR',
      holdings: portfolioHoldings,
      assets,
      liabilities,
      incomeEntries,
      expenseEntries,
      budgetLimits,
      recurringObligations,
      oneTimeExpenses,
      savingsAccounts,
    }, wealixContext),
    [user?.id, portfolioHoldings, assets, liabilities, incomeEntries, expenseEntries, budgetLimits, recurringObligations, oneTimeExpenses, savingsAccounts, wealixContext]
  );
  const financialBrainInsightLines = useMemo(
    () => buildDashboardInsightLines(financialBrainPersona, wealixContext),
    [financialBrainPersona, wealixContext]
  );
  const financialBrainAlerts = useMemo(() => {
    const upgraded = buildBudgetCriticalAlerts(financialBrainPersona);
    if (upgraded.length > 0) {
      return upgraded;
    }
    return wealixContext.alerts.map((alert) => ({
      severity: alert.severity.toUpperCase() as 'INFO' | 'WARNING' | 'CRITICAL',
      category: alert.category.toUpperCase() as 'OBLIGATION' | 'CASH_FLOW' | 'BUFFER' | 'ONE-TIME',
      title: alert.title,
      detail: alert.description,
    }));
  }, [financialBrainPersona, wealixContext.alerts]);
  const unfundedOneTimeExpenses = useMemo(
    () => oneTimeExpenses.filter((item) => item.status !== 'paid'),
    [oneTimeExpenses]
  );

  const handleAddOneTimeExpense = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }

    const amount = Number(oneTimeExpenseForm.amount);
    if (!oneTimeExpenseForm.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({
        title: isArabic ? 'بيانات غير مكتملة' : 'Incomplete details',
        description: isArabic ? 'أدخل الاسم والمبلغ وتاريخ الاستحقاق.' : 'Add a title, amount, and due date.',
        variant: 'destructive',
      });
      return;
    }

    addOneTimeExpense({
      id: createOpaqueId('one-time-expense'),
      title: oneTimeExpenseForm.title.trim(),
      amount,
      currency: 'SAR',
      dueDate: oneTimeExpenseForm.dueDate,
      category: oneTimeExpenseForm.category,
      priority: oneTimeExpenseForm.priority,
      fundingSource: oneTimeExpenseForm.fundingSource.trim() || null,
      notes: oneTimeExpenseForm.notes.trim() || null,
      status: 'planned',
    });
    setOneTimeExpenseForm(defaultOneTimeExpenseForm);
    setShowAddOneTimeExpense(false);
  };

  const handleAddSavingsAccount = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }

    const principal = Number(savingsAccountForm.principal);
    const currentBalance = Number(savingsAccountForm.currentBalance || savingsAccountForm.principal);
    const annualProfitRate = Number(savingsAccountForm.annualProfitRate);
    const termMonths = Number(savingsAccountForm.termMonths);
    if (!savingsAccountForm.name.trim() || !Number.isFinite(principal) || principal <= 0 || !Number.isFinite(termMonths) || termMonths < 0) {
      toast({
        title: isArabic ? 'بيانات غير مكتملة' : 'Incomplete details',
        description: isArabic ? 'أدخل اسم الحساب والمبلغ ومدة الربط.' : 'Add the account name, amount, and term.',
        variant: 'destructive',
      });
      return;
    }

    addSavingsAccount({
      id: createOpaqueId('savings-account'),
      name: savingsAccountForm.name.trim(),
      type: savingsAccountForm.type,
      provider: savingsAccountForm.provider.trim() || 'Bank',
      principal,
      currentBalance: Number.isFinite(currentBalance) && currentBalance > 0 ? currentBalance : principal,
      annualProfitRate: Number.isFinite(annualProfitRate) ? annualProfitRate : 0,
      termMonths,
      openedAt: savingsAccountForm.openedAt,
      maturityDate: savingsAccountForm.maturityDate,
      purposeLabel: savingsAccountForm.purposeLabel.trim() || null,
      profitPayoutMethod: savingsAccountForm.profitPayoutMethod,
      status: 'active',
      autoRenew: false,
      zakatHandledByInstitution: savingsAccountForm.type === 'awaeed' || savingsAccountForm.type === 'mudarabah',
      notes: savingsAccountForm.notes.trim() || null,
    });
    setSavingsAccountForm(defaultSavingsAccountForm);
    setShowAddSavingsAccount(false);
  };

  const fallbackSnapshot = useMemo(
    () =>
      buildDailyPlanningSnapshot({
        locale,
        userId: user?.id ?? 'guest',
        notificationPreferences,
        incomeEntries,
        expenseEntries,
        budgetLimits,
        upcomingObligations,
      }),
    [budgetLimits, expenseEntries, incomeEntries, locale, notificationPreferences, upcomingObligations, user?.id]
  );
  const hasAiSnapshot = Boolean(initialSnapshot);
  const dailySnapshot = initialSnapshot ?? fallbackSnapshot;
  const completionChannels = [
    isArabic ? 'داخل التطبيق' : 'In-app',
    ...(notificationPreferences.whatsapp && notificationPreferences.planningUpdates
      ? ['WhatsApp']
      : []),
  ];

  const forecastChartData = forecast12.map((period) => ({
    month: period.label.split(' ')[0],
    obligations: period.totalAmount,
    income: monthlyIncome,
  }));

  const requireAccount = () => {
    toast({
      title: isArabic ? 'يتطلب حساباً' : 'Account required',
      description: isArabic
        ? 'أنشئ حساباً لحفظ التعديلات وإرسال الإشعارات.'
        : 'Create an account to save changes and send notifications.',
    });
  };

  const handleAddExpense = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }
    if (!newExpense.description || !newExpense.amount) {
      return;
    }

    addExpenseEntry({
      id: createOpaqueId('budget-expense'),
      category: budgetToExpenseCategory[newExpense.category] || 'Other',
      description: newExpense.description,
      amount: Number(newExpense.amount),
      currency: 'SAR',
      merchantName: null,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Card',
      notes: null,
      receiptId: null,
    });
    setNewExpense({ category: 'food', description: '', amount: '' });
    setShowAddExpense(false);
  };

  const handleAddObligation = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }
    if (!obligationForm.title || !obligationForm.amount) {
      return;
    }

    const obligation: RecurringObligation = {
      id: createOpaqueId('obligation'),
      title: obligationForm.title,
      category: obligationForm.category,
      amount: Number(obligationForm.amount),
      currency: obligationForm.currency,
      dueDay: Number(obligationForm.dueDay) || 1,
      startDate: obligationForm.startDate || new Date().toISOString().slice(0, 10),
      endDate: obligationForm.endDate || null,
      frequency: obligationForm.frequency,
      customIntervalMonths: obligationForm.frequency === 'custom' ? Number(obligationForm.customIntervalMonths) || 1 : null,
      notes: obligationForm.notes || null,
      status: 'upcoming',
    };

    addRecurringObligation(obligation);
    setObligationForm(defaultObligationForm);
    setShowAddObligation(false);
  };

  const updateBudgetLimit = (category: string, value: number) => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }
    setBudgetLimits(
      budgetLimits.map((item) => (item.category === category ? { ...item, limit: value } : item))
    );
  };

  const notificationChannelSummary = notificationPreferences.whatsapp
    ? 'WhatsApp'
    : notificationPreferences.sms
      ? 'SMS'
      : notificationPreferences.push
        ? isArabic ? 'داخل التطبيق' : 'In-app'
        : 'Email';
  const cardProps = cardDirectionProps(isArabic);

  return (
    <DashboardShell>
      <div dir={isArabic ? 'rtl' : 'ltr'} className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/5 p-6 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{isArabic ? 'تجربة موحدة' : 'Unified Experience'}</Badge>
                <Badge variant="outline">{isArabic ? 'موجز يومي ثابت' : 'Static Daily Digest'}</Badge>
                {!hasAiSnapshot && (
                  <Badge variant="secondary">{isArabic ? 'يعتمد على بياناتك الحالية' : 'Using your current data'}</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold">
                {isArabic ? 'الموازنة والتخطيط' : 'Budget & Planning'}
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {isArabic
                  ? 'صفحة واحدة تجمع الميزانية، الالتزامات، والتوقعات المستقبلية مع موجز يومي ذكي وتنبيهات مخصصة حسب تفضيلاتك.'
                  : 'One place for budget control, recurring obligations, forward planning, and a daily AI digest tailored to your notification preferences.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                <DialogTrigger asChild>
                  <Button className="gap-2" disabled={!isSignedIn}>
                    <Plus className="h-4 w-4" />
                    {isArabic ? 'إضافة مصروف' : 'Add Expense'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isArabic ? 'إضافة مصروف جديد' : 'Add New Expense'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                      <Select value={newExpense.category} onValueChange={(value) => setNewExpense((current) => ({ ...current, category: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الوصف' : 'Description'}</Label>
                      <Input value={newExpense.description} onChange={(event) => setNewExpense((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'المبلغ (SAR)' : 'Amount (SAR)'}</Label>
                      <Input type="number" value={newExpense.amount} onChange={(event) => setNewExpense((current) => ({ ...current, amount: event.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddExpense(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleAddExpense}>{isArabic ? 'إضافة' : 'Add'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddObligation} onOpenChange={setShowAddObligation}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={(event) => {
                    if (!isSignedIn) {
                      event.preventDefault();
                      requireAccount();
                    }
                  }}>
                    <Calendar className="h-4 w-4" />
                    {isArabic ? 'إضافة التزام' : 'Add Obligation'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isArabic ? 'إضافة التزام متكرر' : 'Add Recurring Obligation'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'العنوان' : 'Title'}</Label>
                      <Input value={obligationForm.title} onChange={(event) => setObligationForm((current) => ({ ...current, title: event.target.value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                        <Select value={obligationForm.category} onValueChange={(value) => setObligationForm((current) => ({ ...current, category: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'التكرار' : 'Frequency'}</Label>
                        <Select value={obligationForm.frequency} onValueChange={(value) => setObligationForm((current) => ({ ...current, frequency: value as RecurringFrequency }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(obligationFrequencyLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'المبلغ' : 'Amount'}</Label>
                        <Input type="number" value={obligationForm.amount} onChange={(event) => setObligationForm((current) => ({ ...current, amount: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'يوم الاستحقاق' : 'Due day'}</Label>
                        <Input type="number" value={obligationForm.dueDay} onChange={(event) => setObligationForm((current) => ({ ...current, dueDay: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'تاريخ البدء' : 'Start date'}</Label>
                        <Input type="date" value={obligationForm.startDate} onChange={(event) => setObligationForm((current) => ({ ...current, startDate: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'تاريخ الانتهاء' : 'End date'}</Label>
                        <Input type="date" value={obligationForm.endDate} onChange={(event) => setObligationForm((current) => ({ ...current, endDate: event.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'ملاحظات' : 'Notes'}</Label>
                      <Input value={obligationForm.notes} onChange={(event) => setObligationForm((current) => ({ ...current, notes: event.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddObligation(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleAddObligation}>{isArabic ? 'إضافة' : 'Add'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddOneTimeExpense} onOpenChange={setShowAddOneTimeExpense}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={(event) => {
                    if (!isSignedIn) {
                      event.preventDefault();
                      requireAccount();
                    }
                  }}>
                    <AlertCircle className="h-4 w-4" />
                    {isArabic ? 'مصروف لمرة واحدة' : 'One-Time Expense'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isArabic ? 'إضافة مصروف لمرة واحدة' : 'Add One-Time Expense'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'العنوان' : 'Title'}</Label>
                      <Input value={oneTimeExpenseForm.title} onChange={(event) => setOneTimeExpenseForm((current) => ({ ...current, title: event.target.value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'المبلغ' : 'Amount'}</Label>
                        <Input type="number" value={oneTimeExpenseForm.amount} onChange={(event) => setOneTimeExpenseForm((current) => ({ ...current, amount: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'تاريخ الاستحقاق' : 'Due date'}</Label>
                        <Input type="date" value={oneTimeExpenseForm.dueDate} onChange={(event) => setOneTimeExpenseForm((current) => ({ ...current, dueDate: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                        <Select value={oneTimeExpenseForm.category} onValueChange={(value) => setOneTimeExpenseForm((current) => ({ ...current, category: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'الأولوية' : 'Priority'}</Label>
                        <Select value={oneTimeExpenseForm.priority} onValueChange={(value) => setOneTimeExpenseForm((current) => ({ ...current, priority: value as OneTimeExpense['priority'] }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">{isArabic ? 'حرج' : 'Critical'}</SelectItem>
                            <SelectItem value="high">{isArabic ? 'عالٍ' : 'High'}</SelectItem>
                            <SelectItem value="medium">{isArabic ? 'متوسط' : 'Medium'}</SelectItem>
                            <SelectItem value="low">{isArabic ? 'منخفض' : 'Low'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'مصدر التمويل' : 'Funding source'}</Label>
                      <Input value={oneTimeExpenseForm.fundingSource} onChange={(event) => setOneTimeExpenseForm((current) => ({ ...current, fundingSource: event.target.value }))} placeholder={isArabic ? 'مثال: الحساب الجاري أو عوائد' : 'Example: current account or Awaeed'} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddOneTimeExpense(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleAddOneTimeExpense}>{isArabic ? 'إضافة' : 'Add'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddSavingsAccount} onOpenChange={setShowAddSavingsAccount}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={(event) => {
                    if (!isSignedIn) {
                      event.preventDefault();
                      requireAccount();
                    }
                  }}>
                    <PiggyBank className="h-4 w-4" />
                    {isArabic ? 'حساب ادخار / عوائد' : 'Savings / Awaeed'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isArabic ? 'إضافة حساب ادخار أو عوائد' : 'Add Savings or Awaeed Account'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'اسم الحساب' : 'Account name'}</Label>
                      <Input value={savingsAccountForm.name} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, name: event.target.value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'النوع' : 'Type'}</Label>
                        <Select value={savingsAccountForm.type} onValueChange={(value) => setSavingsAccountForm((current) => ({ ...current, type: value as SavingsAccount['type'] }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="current">{isArabic ? 'جاري' : 'Current'}</SelectItem>
                            <SelectItem value="awaeed">Awaeed</SelectItem>
                            <SelectItem value="mudarabah">Mudarabah</SelectItem>
                            <SelectItem value="hassad">Hassad</SelectItem>
                            <SelectItem value="standard_savings">{isArabic ? 'ادخار عادي' : 'Standard Savings'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'البنك' : 'Provider'}</Label>
                        <Input value={savingsAccountForm.provider} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, provider: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'الأصل / المبلغ' : 'Principal'}</Label>
                        <Input type="number" value={savingsAccountForm.principal} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, principal: event.target.value, currentBalance: current.currentBalance || event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'الرصيد الحالي' : 'Current balance'}</Label>
                        <Input type="number" value={savingsAccountForm.currentBalance} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, currentBalance: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'معدل الربح السنوي %' : 'Annual profit rate %'}</Label>
                        <Input type="number" value={savingsAccountForm.annualProfitRate} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, annualProfitRate: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'المدة بالأشهر' : 'Term months'}</Label>
                        <Input type="number" value={savingsAccountForm.termMonths} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, termMonths: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'تاريخ الفتح' : 'Opened at'}</Label>
                        <Input type="date" value={savingsAccountForm.openedAt} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, openedAt: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'تاريخ الاستحقاق' : 'Maturity date'}</Label>
                        <Input type="date" value={savingsAccountForm.maturityDate} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, maturityDate: event.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الغرض' : 'Purpose'}</Label>
                      <Input value={savingsAccountForm.purposeLabel} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, purposeLabel: event.target.value }))} placeholder={isArabic ? 'مثال: تجديد الإقامة' : 'Example: Iqama renewal'} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddSavingsAccount(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleAddSavingsAccount}>{isArabic ? 'إضافة' : 'Add'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title={isArabic ? 'صحة اليوم المالية' : 'Today’s Financial Health'} value={`${dailySnapshot.daily_headline.health_score_today}/100`} icon={Wallet} iconColor="text-primary bg-primary/10" />
          <StatCard title={isArabic ? 'الرصيد المتوقع' : 'Projected Month-End'} value={formatCurrency(dailySnapshot.budget_status.projected_month_end_balance, 'SAR', locale)} icon={TrendingUp} iconColor="text-emerald-500 bg-emerald-500/10" />
          <StatCard title={isArabic ? 'التزامات 30 يوماً' : '30-Day Obligations'} value={formatCurrency(actionableUpcomingObligations.filter((item) => item.daysUntilDue <= 30).reduce((sum, item) => sum + item.amount, 0), 'SAR', locale)} icon={Calendar} iconColor="text-amber-500 bg-amber-500/10" />
          <StatCard title={isArabic ? 'معدل الادخار' : 'Savings Rate'} value={`${savingsRate.toFixed(1)}%`} icon={PiggyBank} iconColor="text-sky-500 bg-sky-500/10" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? 'مستوى المخاطر' : 'Risk Level'}</p><p className="mt-2 text-xl font-semibold">{wealixContext.riskLevel}</p></CardContent></Card>
          <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? 'مصروفات لمرة واحدة' : 'One-Time Expenses'}</p><p className="mt-2 text-xl font-semibold">{formatCurrency(unfundedOneTimeExpenses.reduce((sum, item) => sum + item.amount, 0), 'SAR', locale)}</p></CardContent></Card>
          <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? 'استحقاقات العوائد' : 'Savings Maturities'}</p><p className="mt-2 text-xl font-semibold">{savingsAccounts.filter((item) => item.status === 'active' && item.type !== 'current').length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue={initialSection} className="space-y-6">
          <TabsList className="h-auto flex-wrap gap-2">
            <TabsTrigger value="digest">{isArabic ? 'الموجز اليومي' : 'Daily Digest'}</TabsTrigger>
            <TabsTrigger value="budget">{isArabic ? 'الميزانية والنشاط' : 'Budget & Activity'}</TabsTrigger>
            <TabsTrigger value="obligations">{isArabic ? 'الالتزامات' : 'Obligations'}</TabsTrigger>
            <TabsTrigger value="forecast">{isArabic ? 'التوقعات' : 'Forecast'}</TabsTrigger>
          </TabsList>

          <TabsContent value="digest" className="space-y-6">
            <div className="grid gap-6">
              <Card {...cardProps} className={`overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background ${cardProps.className}`}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>
                        {hasAiSnapshot
                          ? dailySnapshot.daily_headline.title
                          : (isArabic ? 'ملخص التخطيط اليومي' : 'Today’s planning summary')}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {hasAiSnapshot
                          ? dailySnapshot.daily_headline.subtitle
                          : isArabic
                            ? 'هذا العرض يستخدم الدخل والمصروفات والالتزامات المحفوظة حالياً حتى يصبح لديك موجز ذكي أحدث.'
                            : 'This view already uses your saved income, spending, budgets, and obligations while a newer AI digest is unavailable.'}
                      </CardDescription>
                    </div>
                    <Badge variant={!hasAiSnapshot ? 'secondary' : dailySnapshot.daily_headline.sentiment === 'alert' ? 'destructive' : 'outline'}>
                      {!hasAiSnapshot ? (isArabic ? 'جاهز' : 'Ready') : dailySnapshot.daily_headline.sentiment}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className={`grid gap-4 md:grid-cols-3 ${isArabic ? 'text-right' : ''}`}>
                  <div dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border bg-background/70 p-4">
                    {hasAiSnapshot ? (
                      <>
                        <p className="text-sm text-muted-foreground">{isArabic ? 'حالة الميزانية' : 'Budget Status'}</p>
                        <p className="mt-2 text-xl font-semibold">
                          {dailySnapshot.budget_status.overall_budget_health === 'on_track'
                            ? (isArabic ? 'ضمن المسار' : 'On track')
                            : dailySnapshot.budget_status.overall_budget_health === 'at_risk'
                              ? (isArabic ? 'تحتاج متابعة' : 'Needs attention')
                              : (isArabic ? 'متجاوزة' : 'Breached')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">{isArabic ? 'مصدر التخطيط' : 'Planning Source'}</p>
                        <p className="mt-2 text-xl font-semibold">{isArabic ? 'بياناتك الحالية' : 'Saved workspace data'}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isArabic ? 'أضف أو حدّث البنود لرؤية صورة أدق لليوم.' : 'Add or update entries to sharpen today’s view.'}
                        </p>
                      </>
                    )}
                  </div>
                  <div dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">{isArabic ? 'أيام متبقية' : 'Days Remaining'}</p>
                    <p className="mt-2 text-xl font-semibold">{dailySnapshot.budget_status.days_remaining}</p>
                  </div>
                  <div dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">
                      {hasAiSnapshot
                        ? (isArabic ? 'قناة الإشعار الأساسية' : 'Primary Channel')
                        : (isArabic ? 'سيصلك عبر' : 'You will be notified via')}
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {hasAiSnapshot ? notificationChannelSummary : completionChannels.join(' + ')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    {isArabic ? 'أولويات اليوم' : 'Today’s Priorities'}
                  </CardTitle>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {!hasAiSnapshot ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic
                        ? 'سيظهر هنا ملخص الأولويات بمجرد انتهاء التحليل الذكي لهذا اليوم.'
                        : 'Your top priorities will appear here as soon as today’s AI analysis finishes.'}
                    </div>
                  ) : dailySnapshot.tips.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'سيظهر هنا الموجز اليومي عند توفر بيانات أكثر.' : 'The daily digest will show richer guidance here as more data becomes available.'}
                    </div>
                  ) : (
                    dailySnapshot.tips.map((tip) => (
                      <div key={tip.tip_id} dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{tip.title}</p>
                            <p className="mt-2 text-sm text-muted-foreground">{tip.body}</p>
                          </div>
                          <Badge variant={tip.is_positive ? 'outline' : 'secondary'}>P{tip.priority}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{tip.impact_label}</span>
                          <span>•</span>
                          <span>{tip.data_evidence}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-rose-500" />
                    {isArabic ? 'تنبيهات تتطلب إجراء' : 'Action Notifications'}
                  </CardTitle>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {!hasAiSnapshot ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic
                        ? `ستظهر هنا التنبيهات اليومية عند توفر شيء يحتاج انتباهك. التوصيل الحالي: داخل التطبيق${notificationPreferences.whatsapp && notificationPreferences.planningUpdates ? ' + واتساب' : ''}.`
                        : `Action alerts will appear here whenever something needs attention. Current delivery setup: in-app${notificationPreferences.whatsapp && notificationPreferences.planningUpdates ? ' + WhatsApp' : ''}.`}
                    </div>
                  ) : dailySnapshot.notifications.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'لا توجد إجراءات عاجلة خلال 72 ساعة.' : 'No urgent actions in the next 72 hours.'}
                    </div>
                  ) : (
                    dailySnapshot.notifications.map((item) => (
                      <div key={item.notification_id} dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{item.title}</p>
                          <Badge variant={item.urgency === 'critical' ? 'destructive' : 'outline'}>{item.urgency}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'مؤشر الفئات' : 'Budget by Category'}</CardTitle>
                  <CardDescription>
                    {isArabic ? 'راقب كل فئة مقابل حدها الحالي وتأثيرها على نهاية الشهر.' : 'Track each category against its current limit and month-end pressure.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className={`space-y-4 ${isArabic ? 'text-right' : ''}`}>
                  {visibleBudgetRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {isArabic ? 'ابدأ بتحديد حدود الفئات.' : 'Start by setting category limits.'}
                      </p>
                      <p className="mt-2">
                        {isArabic ? 'بمجرد إدخال أي حد ستظهر هنا المقارنة بين الإنفاق الفعلي والحد الشهري لكل فئة.' : 'As soon as you add a limit, this section will compare actual spending against each monthly cap.'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowAddExpense(true)} disabled={!isSignedIn}>
                          <Plus className="me-2 h-4 w-4" />
                          {isArabic ? 'إضافة مصروف' : 'Add expense'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    visibleBudgetRows.map((item) => {
                      const percentage = item.budget > 0 ? Math.min(100, (item.actual / item.budget) * 100) : 0;
                      const overBudget = item.actual > item.budget && item.budget > 0;
                      const Icon = categoryIcons[item.category] ?? MoreHorizontal;

                      return (
                        <div key={item.category} dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${item.color}18` }}>
                                <Icon className="h-4 w-4" style={{ color: item.color }} />
                              </div>
                              <div>
                                <p className="font-medium">{categoryLabel(item.category, isArabic)}</p>
                                <p className="text-sm text-muted-foreground">{formatCurrency(item.actual, 'SAR', locale)} / {formatCurrency(item.budget, 'SAR', locale)}</p>
                              </div>
                            </div>
                            <Badge variant={overBudget ? 'destructive' : 'outline'}>
                              {overBudget ? (isArabic ? 'متجاوزة' : 'Over') : `${percentage.toFixed(0)}%`}
                            </Badge>
                          </div>
                          <Progress value={percentage} className="mt-3" />
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'إعداد الحدود' : 'Budget Setup'}</CardTitle>
                  <CardDescription>
                    {isArabic ? 'حدّث الحدود الشهرية هنا لتفعيل المقارنات والتنبيهات حسب الفئة.' : 'Update monthly limits here to power category comparisons and alerts.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className={`space-y-4 ${isArabic ? 'text-right' : ''}`}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border bg-background/70 p-4">
                      <p className="text-sm text-muted-foreground">{isArabic ? 'فئات مفعلة' : 'Active Categories'}</p>
                      <p className="mt-2 text-2xl font-semibold">{configuredBudgetCategories}/{budgetLimits.length}</p>
                    </div>
                    <div className="rounded-2xl border bg-background/70 p-4">
                      <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي الحدود' : 'Total Budgeted'}</p>
                      <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalBudgetCapacity, 'SAR', locale)}</p>
                    </div>
                  </div>
                  {configuredBudgetCategories === 0 && (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      {isArabic
                        ? 'أدخل حدّاً شهرياً واحداً على الأقل لتبدأ قراءة الالتزام لكل فئة.'
                        : 'Enter at least one monthly limit to start reading category pacing and overages.'}
                    </div>
                  )}
                  {budgetLimits.map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{categoryLabel(item.category, isArabic)}</Label>
                        <span className="text-xs text-muted-foreground">SAR</span>
                      </div>
                      <Input
                        type="number"
                        disabled={!isSignedIn}
                        value={item.limit}
                        onChange={(event) => updateBudgetLimit(item.category, Number(event.target.value) || 0)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card {...cardProps}>
              <CardHeader className={isArabic ? 'text-right' : ''}>
                <CardTitle>{isArabic ? 'سجل المصروفات' : 'Expense Log'}</CardTitle>
              </CardHeader>
              <CardContent className={isArabic ? 'text-right' : ''}>
                {expenseEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    {isArabic ? 'لا توجد مصروفات حتى الآن.' : 'No expenses yet.'}
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {expenseEntries.map((expense) => (
                        <div key={expense.id} dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center gap-4 rounded-2xl border p-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">{expense.date} • {categoryLabel(budgetToExpenseCategory[expense.category] ?? expense.category.toLowerCase(), isArabic)}</p>
                          </div>
                          <p className="font-semibold text-rose-500">-{formatCurrency(expense.amount, expense.currency, locale)}</p>
                          <Button variant="ghost" size="icon" disabled={!isSignedIn} onClick={() => deleteExpenseEntry(expense.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="obligations" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'الالتزامات القادمة' : 'Upcoming Obligations'}</CardTitle>
                  <CardDescription>{isArabic ? 'السلوك التنقلي أصبح أبسط: الإجراءات والدفعات في نفس الصفحة.' : 'Navigation is simpler now: actions and payment schedule live on the same page.'}</CardDescription>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {actionableUpcomingObligations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'لا توجد التزامات خلال 90 يوماً.' : 'No obligations due in the next 90 days.'}
                    </div>
                  ) : (
                    actionableUpcomingObligations.slice(0, 10).map((item) => (
                      <div key={`${item.obligationId}-${item.dueDate}`} dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center gap-3 rounded-2xl border p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.dueDate} • {item.daysUntilDue <= 0 ? (isArabic ? 'اليوم' : 'Today') : `${item.daysUntilDue}d`}</p>
                        </div>
                        <Badge variant={item.daysUntilDue <= 7 ? 'destructive' : 'outline'}>
                          {item.daysUntilDue <= 7 ? (isArabic ? 'قريب' : 'Soon') : (isArabic ? 'قادم' : 'Upcoming')}
                        </Badge>
                        <p className="font-semibold">{formatCurrency(item.amount, item.currency, locale)}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!isSignedIn}
                          onClick={() => {
                            markObligationPaid(item.obligationId, item.dueDate);
                            toast({
                              title: isArabic ? 'تم تسجيل السداد' : 'Payment recorded',
                              description: isArabic
                                ? `تم تحديث ${item.title} كمدفوع وسيختفي من الالتزامات القادمة.`
                                : `${item.title} was marked as paid and removed from upcoming obligations.`,
                            });
                          }}
                        >
                          <CheckCircle className="me-2 h-4 w-4" />
                          {isArabic ? 'تم الدفع' : 'Mark Paid'}
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'كل الالتزامات' : 'Recurring Setup'}</CardTitle>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {recurringObligations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'أضف الإيجار أو المدارس أو الرسوم الثابتة هنا.' : 'Add rent, school fees, and other recurring commitments here.'}
                    </div>
                  ) : (
                    recurringObligations.map((item) => (
                      <div key={item.id} dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center gap-3 rounded-2xl border p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {categoryLabel(item.category, isArabic)} • {isArabic ? obligationFrequencyLabels[item.frequency].ar : obligationFrequencyLabels[item.frequency].en}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.amount, item.currency, locale)}</p>
                        <Button variant="ghost" size="icon" disabled={!isSignedIn} onClick={() => deleteRecurringObligation(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'المصروفات لمرة واحدة' : 'One-Time Expenses'}</CardTitle>
                  <CardDescription>{isArabic ? 'هذه البنود تدخل مباشرة في التوقع الشهري ولا يتم توزيعها على المتوسط.' : 'These expenses are injected into the forecast in their exact due month.'}</CardDescription>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {oneTimeExpenses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'أضف رسوم سنوية أو مصروفاً كبيراً لمرة واحدة هنا.' : 'Add annual fees or other one-time obligations here.'}
                    </div>
                  ) : (
                    oneTimeExpenses.map((item) => (
                      <div key={item.id} dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center gap-3 rounded-2xl border p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.dueDate} • {item.priority}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.amount, item.currency, locale)}</p>
                        <Button variant="ghost" size="icon" disabled={!isSignedIn} onClick={() => deleteOneTimeExpense(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'الحسابات الادخارية والعوائد' : 'Savings & Awaeed Accounts'}</CardTitle>
                  <CardDescription>{isArabic ? 'استخدم حسابات الربح عند الاستحقاق للحاجات المرتبطة بموعد محدد.' : 'Use at-maturity profit accounts for time-bound obligations.'}</CardDescription>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {savingsAccounts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'أضف الحساب الجاري أو حساب عوائد لربط التمويل بالالتزامات.' : 'Add your current account or Awaeed accounts here.'}
                    </div>
                  ) : (
                    savingsAccounts.map((account) => (
                      <div key={account.id} dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-sm text-muted-foreground">{account.provider} • {account.type}</p>
                          </div>
                          <Badge variant="outline">{account.profitPayoutMethod}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>{formatCurrency(account.currentBalance, 'SAR', locale)}</span>
                          <span>•</span>
                          <span>{account.annualProfitRate}%</span>
                          <span>•</span>
                          <span>{account.maturityDate}</span>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button variant="ghost" size="icon" disabled={!isSignedIn} onClick={() => deleteSavingsAccount(account.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-6">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'محرك Wealix المالي' : 'Wealix Financial Brain'}</CardTitle>
                  <CardDescription>{financialBrainInsightLines.join(' ')}</CardDescription>
                </CardHeader>
              <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                {financialBrainAlerts.slice(0, 4).map((alert) => (
                  <div key={`${alert.category}-${alert.title}`} className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{alert.title}</p>
                      <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : 'outline'}>{alert.severity}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{alert.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? '3 أشهر' : 'Next 3 Months'}</p><p className="mt-2 text-2xl font-bold text-rose-500">-{formatCurrency(summary3.totalObligations, 'SAR', locale)}</p></CardContent></Card>
              <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? '12 شهراً' : 'Next 12 Months'}</p><p className="mt-2 text-2xl font-bold text-rose-500">-{formatCurrency(summary12.totalObligations, 'SAR', locale)}</p></CardContent></Card>
              <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? 'فائض متوقع' : 'Projected Surplus'}</p><p className={`mt-2 text-2xl font-bold ${summary12.projectedSurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{summary12.projectedSurplus >= 0 ? '+' : ''}{formatCurrency(summary12.projectedSurplus, 'SAR', locale)}</p></CardContent></Card>
            </div>

            <Card {...cardProps}>
              <CardHeader className={isArabic ? 'text-right' : ''}>
                <CardTitle>{isArabic ? 'مقارنة الدخل والالتزامات' : 'Income vs Obligations Forecast'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                      <Bar dataKey="income" name={isArabic ? 'الدخل' : 'Income'} fill="var(--chart-2)" radius={[6, 6, 0, 0]} opacity={0.35} />
                      <Bar dataKey="obligations" name={isArabic ? 'الالتزامات' : 'Obligations'} fill="var(--chart-5)" radius={[6, 6, 0, 0]}>
                        {forecastChartData.map((entry) => (
                          <Cell key={entry.month} fill={entry.obligations > entry.income ? '#F43F5E' : '#D4A843'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
