'use client';

import { useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import {
  Receipt,
  Plus,
  TrendingUp,
  TrendingDown,
  Home,
  Utensils,
  Car,
  Film,
  TrendingUp as Investment,
  Heart,
  MoreHorizontal,
  Trash2,
  PiggyBank,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DashboardShell } from '@/components/layout';
import { StatCard } from '@/components/shared';
import { useAppStore, formatCurrency, type ExpenseEntry } from '@/store/useAppStore';
import { toast } from '@/hooks/use-toast';
import { createOpaqueId } from '@/lib/ids';

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
  other: 'Other',
};

const categoryIcons: Record<string, React.ReactNode> = {
  housing: <Home className="w-4 h-4" />,
  food: <Utensils className="w-4 h-4" />,
  transport: <Car className="w-4 h-4" />,
  entertainment: <Film className="w-4 h-4" />,
  investment: <Investment className="w-4 h-4" />,
  zakat: <Heart className="w-4 h-4" />,
  healthcare: <Heart className="w-4 h-4" />,
  education: <PiggyBank className="w-4 h-4" />,
  utilities: <Home className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
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
  other: { en: 'Other', ar: 'أخرى' },
};

const mockTrendData = [
  { month: 'Oct', expenses: 16500, income: 25500 },
  { month: 'Nov', expenses: 17100, income: 25500 },
  { month: 'Dec', expenses: 16850, income: 25500 },
  { month: 'Jan', expenses: 17400, income: 25500 },
  { month: 'Feb', expenses: 17050, income: 25500 },
];

export default function BudgetPage() {
  const locale = useAppStore((state) => state.locale);
  const incomeEntries = useAppStore((state) => state.incomeEntries);
  const expenseEntries = useAppStore((state) => state.expenseEntries);
  const budgetLimits = useAppStore((state) => state.budgetLimits);
  const addExpenseEntry = useAppStore((state) => state.addExpenseEntry);
  const deleteExpenseEntry = useAppStore((state) => state.deleteExpenseEntry);
  const setBudgetLimits = useAppStore((state) => state.setBudgetLimits);
  const isArabic = locale === 'ar';
  const { isSignedIn } = useUser();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'food', description: '', amount: '' });

  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const spendingByCategory = expenseEntries.reduce((acc, entry) => {
    const key = entry.category.toLowerCase();
    acc[key] = (acc[key] || 0) + entry.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartBudget = budgetLimits.map((item) => ({
    category: item.category,
    limit: item.limit,
    color: item.color || categoryColors[item.category] || '#6B7280',
  }));

  const budgetVsActual = chartBudget.map((item) => ({
    category: item.category,
    budget: item.limit,
    actual: spendingByCategory[item.category] || 0,
  }));

  const trendData = useMemo(() => {
    if (!isSignedIn) {
      return [...mockTrendData, { month: 'Jan', expenses: totalExpenses, income: totalIncome }];
    }
    return [{ month: isArabic ? 'الحالي' : 'Current', expenses: totalExpenses, income: totalIncome }];
  }, [isSignedIn, totalExpenses, totalIncome, isArabic]);

  const requireAccount = () => {
    toast({
      title: isArabic ? 'يتطلب حساباً' : 'Account required',
      description: isArabic
        ? 'يمكن للضيف استعراض الميزانية التجريبية فقط. أنشئ حساباً لإضافة المصروفات أو تعديل حدود الميزانية.'
        : 'Guests can browse the demo budget only. Create an account to add expenses or edit budget limits.',
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

    const entry: ExpenseEntry = {
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
    };

    addExpenseEntry(entry);
    setNewExpense({ category: 'food', description: '', amount: '' });
    setShowAddExpense(false);
  };

  const updateBudgetLimit = (category: string, value: number) => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }

    setBudgetLimits(
      chartBudget.map((item) =>
        item.category === category ? { ...item, limit: value } : item
      )
    );
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'الميزانية' : 'Budget'}</h1>
            <p className="text-muted-foreground">
              {isArabic ? 'تتبع الدخل والمصروفات وحدود الإنفاق' : 'Track income, expenses, and spending limits'}
            </p>
          </div>
          <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!isSignedIn}>
                <Plus className="w-4 h-4" />
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {isArabic ? label.ar : label.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'الوصف' : 'Description'}</Label>
                  <Input value={newExpense.description} onChange={(e) => setNewExpense((current) => ({ ...current, description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? 'المبلغ (SAR)' : 'Amount (SAR)'}</Label>
                  <Input type="number" value={newExpense.amount} onChange={(e) => setNewExpense((current) => ({ ...current, amount: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={handleAddExpense} disabled={!isSignedIn}>
                  {isArabic ? 'إضافة' : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!isSignedIn && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {isArabic
                ? 'الضيف يشاهد البيانات التجريبية فقط. أنشئ حساباً لإضافة المصروفات أو تعديل إعدادات الميزانية.'
                : 'Guests can browse demo data only. Create an account to add expenses or edit budget settings.'}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title={isArabic ? 'إجمالي الدخل' : 'Total Income'} value={formatCurrency(totalIncome, 'SAR', locale)} icon={TrendingUp} iconColor="text-emerald-500 bg-emerald-500/10" />
          <StatCard title={isArabic ? 'إجمالي المصروفات' : 'Total Expenses'} value={formatCurrency(totalExpenses, 'SAR', locale)} icon={TrendingDown} iconColor="text-rose-500 bg-rose-500/10" />
          <StatCard title={isArabic ? 'صافي المدخرات' : 'Net Savings'} value={formatCurrency(totalIncome - totalExpenses, 'SAR', locale)} icon={PiggyBank} iconColor="text-gold bg-gold/10" />
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isArabic ? 'معدل الادخار' : 'Savings Rate'}</p>
              <div className="mt-2 flex items-center gap-3">
                <p className="text-2xl font-bold">{savingsRate.toFixed(1)}%</p>
                <Progress value={Math.max(0, Math.min(100, savingsRate))} className="flex-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">{isArabic ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="expenses">{isArabic ? 'المصروفات' : 'Expenses'}</TabsTrigger>
            <TabsTrigger value="budget">{isArabic ? 'الميزانية' : 'Budget Setup'}</TabsTrigger>
            <TabsTrigger value="trends">{isArabic ? 'الاتجاهات' : 'Trends'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'توزيع المصروفات' : 'Expense Breakdown'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(spendingByCategory).length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {isArabic ? 'لا توجد مصروفات مسجلة بعد.' : 'No expenses recorded yet.'}
                    </div>
                  ) : (
                    <>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(spendingByCategory).map(([category, value]) => ({
                                name: isArabic ? categoryLabels[category]?.ar : categoryLabels[category]?.en,
                                value,
                                color: categoryColors[category] || '#6B7280',
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              dataKey="value"
                            >
                              {Object.entries(spendingByCategory).map(([category], index) => (
                                <Cell key={`cell-${index}`} fill={categoryColors[category] || '#6B7280'} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {Object.entries(spendingByCategory).slice(0, 6).map(([category, value]) => (
                          <div key={category} className="flex items-center gap-2 text-sm">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors[category] || '#6B7280' }} />
                            <span>{isArabic ? categoryLabels[category]?.ar : categoryLabels[category]?.en}</span>
                            <span className="ml-auto font-medium">{formatCurrency(value, 'SAR', locale)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'الميزانية مقابل الفعلي' : 'Budget vs Actual'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartBudget.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {isArabic ? 'لا توجد حدود ميزانية مضبوطة بعد.' : 'No budget limits have been configured yet.'}
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={budgetVsActual} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                          <YAxis
                            dataKey="category"
                            type="category"
                            stroke="var(--muted-foreground)"
                            fontSize={10}
                            width={90}
                            tickFormatter={(value) => (isArabic ? categoryLabels[value]?.ar : categoryLabels[value]?.en)}
                          />
                          <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                          <Legend />
                          <Bar dataKey="budget" name={isArabic ? 'الميزانية' : 'Budget'} fill="var(--muted-foreground)" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="actual" name={isArabic ? 'الفعلي' : 'Actual'} fill="var(--gold)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'تقدم الميزانية' : 'Budget Progress'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {chartBudget.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {isArabic ? 'أضف حدود الميزانية من تبويب الإعداد.' : 'Add budget limits from the setup tab.'}
                  </div>
                ) : (
                  chartBudget.map((item) => {
                    const spent = spendingByCategory[item.category] || 0;
                    const percentage = item.limit > 0 ? Math.min(100, (spent / item.limit) * 100) : 0;
                    const isOver = spent > item.limit && item.limit > 0;

                    return (
                      <div key={item.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}20` }}>
                              <span style={{ color: item.color }}>{categoryIcons[item.category]}</span>
                            </div>
                            <span className="font-medium">{isArabic ? categoryLabels[item.category]?.ar : categoryLabels[item.category]?.en}</span>
                          </div>
                          <div className="text-right">
                            <span className={isOver ? 'text-rose-500' : ''}>{formatCurrency(spent, 'SAR', locale)}</span>
                            <span className="text-muted-foreground"> / {formatCurrency(item.limit, 'SAR', locale)}</span>
                          </div>
                        </div>
                        <Progress value={percentage} className={isOver ? '[&>div]:bg-rose-500' : ''} />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'سجل المصروفات' : 'Expense Log'}</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {isArabic ? 'لا توجد مصروفات بعد.' : 'No expenses added yet.'}
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {expenseEntries.map((expense, index) => (
                        <motion.div
                          key={expense.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center gap-4 rounded-lg bg-muted/50 p-3"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${categoryColors[expense.category.toLowerCase()] || '#6B7280'}20` }}>
                            <span style={{ color: categoryColors[expense.category.toLowerCase()] || '#6B7280' }}>
                              {categoryIcons[expense.category.toLowerCase()]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <span className="font-medium">{expense.description}</span>
                            <span className="block text-xs text-muted-foreground">{expense.date}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-rose-500">-{formatCurrency(expense.amount, expense.currency, locale)}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {isArabic ? categoryLabels[expense.category.toLowerCase()]?.ar : categoryLabels[expense.category.toLowerCase()]?.en || expense.category}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => isSignedIn ? deleteExpenseEntry(expense.id) : requireAccount()} disabled={!isSignedIn}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'إعداد الميزانية الشهرية' : 'Monthly Budget Setup'}</CardTitle>
                <CardDescription>
                  {isArabic ? 'هذه القيم هي المصدر المباشر لتقرير الميزانية.' : 'These values are the direct source for the budget report.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {chartBudget.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {isArabic ? 'لا توجد حدود ميزانية حالياً.' : 'There are no budget limits yet.'}
                  </div>
                ) : (
                  chartBudget.map((item) => (
                    <div key={item.category} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}20` }}>
                        <span style={{ color: item.color }}>{categoryIcons[item.category]}</span>
                      </div>
                      <span className="flex-1 font-medium">{isArabic ? categoryLabels[item.category]?.ar : categoryLabels[item.category]?.en}</span>
                      <Input
                        type="number"
                        value={item.limit}
                        className="w-32 text-right"
                        disabled={!isSignedIn}
                        onChange={(e) => updateBudgetLimit(item.category, Number(e.target.value) || 0)}
                      />
                      <span className="text-muted-foreground">SAR</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'اتجاهات الإنفاق' : 'Spending Trends'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                      <Legend />
                      <Line type="monotone" dataKey="income" name={isArabic ? 'الدخل' : 'Income'} stroke="var(--chart-2)" strokeWidth={2} />
                      <Line type="monotone" dataKey="expenses" name={isArabic ? 'المصروفات' : 'Expenses'} stroke="var(--chart-5)" strokeWidth={2} />
                    </LineChart>
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
