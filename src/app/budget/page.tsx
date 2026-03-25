'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { DashboardShell } from '@/components/layout';
import { StatCard, formatCurrency } from '@/components/shared';
import { useAppStore } from '@/store/useAppStore';
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

// Mock data
const mockExpenses = [
  { id: '1', category: 'housing', description: 'Rent Payment', amount: 4500, date: '2025-01-01' },
  { id: '2', category: 'food', description: 'Grocery Shopping', amount: 850, date: '2025-01-05' },
  { id: '3', category: 'transport', description: 'Uber Rides', amount: 320, date: '2025-01-08' },
  { id: '4', category: 'investment', description: 'Stock Purchase', amount: 5000, date: '2025-01-10' },
  { id: '5', category: 'food', description: 'Restaurant', amount: 250, date: '2025-01-12' },
  { id: '6', category: 'zakat', description: 'Charity', amount: 1000, date: '2025-01-15' },
  { id: '7', category: 'utilities', description: 'Electricity Bill', amount: 350, date: '2025-01-15' },
  { id: '8', category: 'healthcare', description: 'Medicine', amount: 180, date: '2025-01-18' },
];

const mockBudget = [
  { category: 'housing', limit: 5000, color: categoryColors.housing },
  { category: 'food', limit: 2000, color: categoryColors.food },
  { category: 'transport', limit: 800, color: categoryColors.transport },
  { category: 'entertainment', limit: 500, color: categoryColors.entertainment },
  { category: 'investment', limit: 5000, color: categoryColors.investment },
  { category: 'zakat', limit: 1500, color: categoryColors.zakat },
  { category: 'other', limit: 1000, color: categoryColors.other },
];

const mockIncome = [
  { id: '1', source: 'salary', description: 'Monthly Salary', amount: 25000, date: '2025-01-01' },
  { id: '2', source: 'rental', description: 'Property Income', amount: 3500, date: '2025-01-05' },
];

export default function BudgetPage() {
  const { locale } = useAppStore();
  const isArabic = locale === 'ar';
  
  const [expenses, setExpenses] = useState(mockExpenses);
  const [budget, setBudget] = useState(mockBudget);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'food', description: '', amount: '' });

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = mockIncome.reduce((sum, i) => sum + i.amount, 0);
  const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;

  // Calculate spending by category
  const spendingByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  // Budget vs Actual
  const budgetVsActual = budget.map(b => ({
    category: b.category,
    budget: b.limit,
    actual: spendingByCategory[b.category] || 0,
    color: b.color,
  }));

  // Category labels
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

  const handleAddExpense = () => {
    if (newExpense.description && newExpense.amount) {
      setExpenses([...expenses, {
        id: Date.now().toString(),
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        date: new Date().toISOString().split('T')[0],
      }]);
      setNewExpense({ category: 'food', description: '', amount: '' });
      setShowAddExpense(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'الميزانية' : 'Budget'}</h1>
            <p className="text-muted-foreground">
              {isArabic ? 'تتبع دخلك ومصروفاتك' : 'Track your income and expenses'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium">{isArabic ? 'يناير 2025' : 'January 2025'}</span>
              <Button variant="outline" size="icon">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
              <DialogTrigger asChild>
                <Button className="gap-2">
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
                    <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
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
                    <Input
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder={isArabic ? 'مثال: بقالة' : 'e.g., Grocery store'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'المبلغ (SAR)' : 'Amount (SAR)'}</Label>
                    <Input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleAddExpense}>
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={isArabic ? 'إجمالي الدخل' : 'Total Income'}
            value={formatCurrency(totalIncome, 'SAR', locale)}
            icon={TrendingUp}
            iconColor="text-emerald-500 bg-emerald-500/10"
          />
          <StatCard
            title={isArabic ? 'إجمالي المصروفات' : 'Total Expenses'}
            value={formatCurrency(totalExpenses, 'SAR', locale)}
            icon={TrendingDown}
            iconColor="text-rose-500 bg-rose-500/10"
          />
          <StatCard
            title={isArabic ? 'صافي المدخرات' : 'Net Savings'}
            value={formatCurrency(totalIncome - totalExpenses, 'SAR', locale)}
            icon={PiggyBank}
            iconColor="text-gold bg-gold/10"
          />
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isArabic ? 'معدل الادخار' : 'Savings Rate'}</p>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-2xl font-bold">{savingsRate.toFixed(1)}%</p>
                <Progress value={savingsRate} className="flex-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">{isArabic ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="expenses">{isArabic ? 'المصروفات' : 'Expenses'}</TabsTrigger>
            <TabsTrigger value="budget">{isArabic ? 'الميزانية' : 'Budget Setup'}</TabsTrigger>
            <TabsTrigger value="trends">{isArabic ? 'الاتجاهات' : 'Trends'}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'توزيع المصروفات' : 'Expense Breakdown'}</CardTitle>
                </CardHeader>
                <CardContent>
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
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {Object.entries(spendingByCategory).slice(0, 6).map(([category, value]) => (
                      <div key={category} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[category] }} />
                        <span>{isArabic ? categoryLabels[category]?.ar : categoryLabels[category]?.en}</span>
                        <span className="ml-auto font-medium">{formatCurrency(value, 'SAR', locale)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Budget vs Actual */}
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'الميزانية مقابل الفعلي' : 'Budget vs Actual'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetVsActual} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                        <YAxis dataKey="category" type="category" stroke="var(--muted-foreground)" fontSize={10} width={70}
                          tickFormatter={(value) => isArabic ? categoryLabels[value]?.ar : value}
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                        <Legend />
                        <Bar dataKey="budget" name={isArabic ? 'الميزانية' : 'Budget'} fill="var(--muted-foreground)" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="actual" name={isArabic ? 'الفعلي' : 'Actual'} fill="var(--gold)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget Progress */}
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'تقدم الميزانية' : 'Budget Progress'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budget.map((b) => {
                    const spent = spendingByCategory[b.category] || 0;
                    const percentage = Math.min((spent / b.limit) * 100, 100);
                    const isOver = spent > b.limit;

                    return (
                      <div key={b.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: b.color + '20' }}>
                              <span style={{ color: b.color }}>{categoryIcons[b.category]}</span>
                            </div>
                            <span className="font-medium">
                              {isArabic ? categoryLabels[b.category]?.ar : categoryLabels[b.category]?.en}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={isOver ? 'text-rose-500' : ''}>
                              {formatCurrency(spent, 'SAR', locale)}
                            </span>
                            <span className="text-muted-foreground"> / {formatCurrency(b.limit, 'SAR', locale)}</span>
                          </div>
                        </div>
                        <Progress
                          value={percentage}
                          className={isOver ? '[&>div]:bg-rose-500' : ''}
                        />
                        {isOver && (
                          <p className="text-xs text-rose-500">
                            {isArabic ? 'تجاوز الميزانية بـ' : 'Over budget by'} {formatCurrency(spent - b.limit, 'SAR', locale)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'سجل المصروفات' : 'Expense Log'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {expenses.map((expense, index) => (
                      <motion.div
                        key={expense.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: categoryColors[expense.category] + '20' }}
                        >
                          <span style={{ color: categoryColors[expense.category] }}>
                            {categoryIcons[expense.category]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{expense.description}</span>
                          <span className="text-xs text-muted-foreground block">
                            {expense.date}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-rose-500">
                            -{formatCurrency(expense.amount, 'SAR', locale)}
                          </span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {isArabic ? categoryLabels[expense.category]?.ar : expense.category}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-500"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget Setup Tab */}
          <TabsContent value="budget">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'إعداد الميزانية الشهرية' : 'Monthly Budget Setup'}</CardTitle>
                <CardDescription>
                  {isArabic ? 'حدد حدود الإنفاق الشهرية لكل فئة' : 'Set monthly spending limits for each category'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budget.map((b) => (
                    <div key={b.category} className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: b.color + '20' }}
                      >
                        <span style={{ color: b.color }}>{categoryIcons[b.category]}</span>
                      </div>
                      <span className="flex-1 font-medium">
                        {isArabic ? categoryLabels[b.category]?.ar : categoryLabels[b.category]?.en}
                      </span>
                      <Input
                        type="number"
                        value={b.limit}
                        className="w-32 text-right"
                        onChange={(e) => {
                          const newBudget = budget.map(item =>
                            item.category === b.category
                              ? { ...item, limit: parseFloat(e.target.value) || 0 }
                              : item
                          );
                          setBudget(newBudget);
                        }}
                      />
                      <span className="text-muted-foreground">SAR</span>
                    </div>
                  ))}
                </div>
                <Button className="mt-6 w-full">
                  {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'اتجاهات الإنفاق' : 'Spending Trends'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { month: 'Aug', expenses: 12000, income: 25000 },
                      { month: 'Sep', expenses: 13500, income: 25000 },
                      { month: 'Oct', expenses: 11200, income: 28500 },
                      { month: 'Nov', expenses: 14800, income: 25000 },
                      { month: 'Dec', expenses: 16500, income: 30000 },
                      { month: 'Jan', expenses: totalExpenses, income: totalIncome },
                    ]}>
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
