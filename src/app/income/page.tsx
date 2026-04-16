'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Plus, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { StatCard } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore, formatCurrency, type IncomeEntry, type IncomeFrequency, type IncomeSource } from '@/store/useAppStore';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';
import { toast } from '@/hooks/use-toast';
import { createOpaqueId } from '@/lib/ids';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';
import type { FinancialSettings } from '@/lib/financial-settings';

const incomeSources: Array<{ value: IncomeSource; en: string; ar: string }> = [
  { value: 'salary', en: 'Salary', ar: 'راتب' },
  { value: 'freelance', en: 'Freelance', ar: 'عمل حر' },
  { value: 'business', en: 'Business', ar: 'عمل تجاري' },
  { value: 'investment', en: 'Investment', ar: 'استثمار' },
  { value: 'rental', en: 'Rental', ar: 'إيجار' },
  { value: 'other', en: 'Other', ar: 'أخرى' },
];

const frequencies: Array<{ value: IncomeFrequency; en: string; ar: string }> = [
  { value: 'one_time', en: 'One Time', ar: 'مرة واحدة' },
  { value: 'weekly', en: 'Weekly', ar: 'أسبوعي' },
  { value: 'monthly', en: 'Monthly', ar: 'شهري' },
  { value: 'quarterly', en: 'Quarterly', ar: 'ربع سنوي' },
  { value: 'yearly', en: 'Yearly', ar: 'سنوي' },
];

const defaultForm = {
  amount: '',
  source: 'salary' as IncomeSource,
  sourceName: '',
  frequency: 'monthly' as IncomeFrequency,
  date: new Date().toISOString().slice(0, 10),
  isRecurring: true,
  notes: '',
};

export default function IncomePage() {
  const locale = useAppStore((state) => state.locale);
  const incomeEntries = useAppStore((state) => state.incomeEntries);
  const addIncomeEntry = useAppStore((state) => state.addIncomeEntry);
  const deleteIncomeEntry = useAppStore((state) => state.deleteIncomeEntry);
  const isArabic = locale === 'ar';
  const { isSignedIn, user } = useRuntimeUser();
  const financialSettings = useFinancialSettingsStore((state) => state.data);
  const replaceFinancialSettings = useFinancialSettingsStore((state) => state.replaceData);
  const updateFinancialSettings = useFinancialSettingsStore((state) => state.updateFields);
  const incomeAmountInputId = useId();
  const incomeSourceNameInputId = useId();
  const incomeDateInputId = useId();
  const incomeNotesInputId = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    let cancelled = false;

    async function getFinancialSettings(userId: string) {
      const response = await fetch('/api/v1/user/financial-settings', {
        method: 'GET',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null) as
        | { settings?: FinancialSettings }
        | null;

      if (!cancelled && response.ok && payload?.settings) {
        replaceFinancialSettings(payload.settings, { broadcast: false, syncStatus: 'saved' });
      }
    }

    if (user?.id) {
      void getFinancialSettings(user.id);
    }

    return () => {
      cancelled = true;
    };
  }, [replaceFinancialSettings, user?.id]);

  const summary = useMemo(() => {
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const monthlyTotal = incomeEntries
      .filter((entry) => entry.date.startsWith(monthKey))
      .reduce((sum, entry) => sum + entry.amount, 0);
    const recurringTotal = incomeEntries
      .filter((entry) => entry.isRecurring)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const average = incomeEntries.length
      ? incomeEntries.reduce((sum, entry) => sum + entry.amount, 0) / incomeEntries.length
      : 0;

    return { monthlyTotal, recurringTotal, average };
  }, [incomeEntries]);

  const handleAddIncome = () => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic
          ? 'يمكن للضيف تصفح البيانات التجريبية فقط. أنشئ حساباً لإضافة الدخل.'
          : 'Guests can browse demo data only. Create an account to add income.',
      });
      return;
    }

    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast({
        title: isArabic ? 'بيانات غير مكتملة' : 'Incomplete form',
        description: isArabic
          ? 'أدخل مبلغاً صالحاً قبل الحفظ.'
          : 'Enter a valid amount before saving.',
        variant: 'destructive',
      });
      return;
    }

    const selectedSourceName = incomeSources.find((source) => source.value === form.source);
    const sourceName = form.sourceName.trim() || (isArabic ? selectedSourceName?.ar : selectedSourceName?.en) || form.source;

    const entry: IncomeEntry = {
      id: createOpaqueId('income'),
      amount,
      currency: 'SAR',
      source: form.source,
      sourceName,
      frequency: form.frequency,
      date: form.date,
      isRecurring: form.isRecurring,
      notes: form.notes.trim() || null,
    };

    addIncomeEntry(entry);
    setForm(defaultForm);
    setOpen(false);
    toast({
      title: isArabic ? 'تمت إضافة الدخل' : 'Income added',
      description: isArabic
        ? 'تم حفظ إدخال الدخل الجديد.'
        : 'Your new income entry has been saved.',
    });
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {!isSignedIn && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {isArabic
                ? 'الضيف يرى بيانات الدخل التجريبية فقط، ولا يمكنه إضافة أو حذف الإدخالات.'
                : 'Guests can browse demo income data only and cannot add or delete entries.'}
            </CardContent>
          </Card>
        )}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'الدخل' : 'Income'}</h1>
            <p className="text-muted-foreground">
              {isArabic
                ? 'أضف الرواتب والدخل الحر والدخل المتكرر كما في Wealix v1.'
                : 'Track salary, freelance work, and recurring income like Wealix v1.'}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!isSignedIn}>
                <Plus className="h-4 w-4" />
                {isArabic ? 'إضافة دخل' : 'Add Income'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isArabic ? 'إضافة دخل' : 'Add Income'}</DialogTitle>
                <DialogDescription>
                  {isArabic
                    ? 'سجل الرواتب، المشاريع الحرة، والإيرادات المتكررة.'
                    : 'Log salary, freelance payments, and recurring revenue.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={incomeAmountInputId}>{isArabic ? 'المبلغ' : 'Amount'}</Label>
                  <Input
                    id={incomeAmountInputId}
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'النوع' : 'Source'}</Label>
                    <Select
                      value={form.source}
                      onValueChange={(value: IncomeSource) => setForm((current) => ({ ...current, source: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {incomeSources.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {isArabic ? source.ar : source.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'التكرار' : 'Frequency'}</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={(value: IncomeFrequency) => setForm((current) => ({ ...current, frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencies.map((frequency) => (
                          <SelectItem key={frequency.value} value={frequency.value}>
                            {isArabic ? frequency.ar : frequency.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={incomeSourceNameInputId}>{isArabic ? 'اسم المصدر' : 'Source Name'}</Label>
                    <Input
                      id={incomeSourceNameInputId}
                      value={form.sourceName}
                      onChange={(e) => setForm((current) => ({ ...current, sourceName: e.target.value }))}
                      placeholder={isArabic ? 'اسم الشركة أو العميل' : 'Employer or client'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={incomeDateInputId}>{isArabic ? 'التاريخ' : 'Date'}</Label>
                    <Input
                      id={incomeDateInputId}
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{isArabic ? 'دخل متكرر' : 'Recurring income'}</p>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'فعّلها للراتب أو الدفعات المتكررة.' : 'Turn this on for salary or repeat payments.'}
                    </p>
                  </div>
                  <Switch
                    checked={form.isRecurring}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, isRecurring: checked }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={incomeNotesInputId}>{isArabic ? 'ملاحظات' : 'Notes'}</Label>
                  <Textarea
                    id={incomeNotesInputId}
                    value={form.notes}
                    onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                    placeholder={isArabic ? 'ملاحظات اختيارية' : 'Optional notes'}
                  />
                </div>
                <Button className="w-full" onClick={handleAddIncome} disabled={!isSignedIn}>
                  {isArabic ? 'حفظ الدخل' : 'Save Income'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title={isArabic ? 'دخل هذا الشهر' : 'This Month'}
            value={formatCurrency(summary.monthlyTotal, 'SAR', locale)}
            icon={TrendingUp}
            iconColor="text-emerald-500 bg-emerald-500/10"
          />
          <StatCard
            title={isArabic ? 'الدخل المتكرر' : 'Recurring Income'}
            value={formatCurrency(summary.recurringTotal, 'SAR', locale)}
            icon={Wallet}
            iconColor="text-gold bg-gold/10"
          />
          <StatCard
            title={isArabic ? 'متوسط الإدخالات' : 'Average Entry'}
            value={formatCurrency(summary.average, 'SAR', locale)}
            icon={TrendingUp}
            iconColor="text-blue-500 bg-blue-500/10"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? 'سجل الدخل' : 'Income Entries'}</CardTitle>
            <CardDescription>
              {isArabic ? 'مستوحى من شاشة الدخل في Wealix v1.' : 'Inspired by the income workflow from Wealix v1.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border p-4">
                <div className="space-y-1">
                  <div className="font-medium">{entry.sourceName}</div>
                  <div className="text-sm text-muted-foreground">
                    {(isArabic
                      ? incomeSources.find((source) => source.value === entry.source)?.ar
                      : incomeSources.find((source) => source.value === entry.source)?.en) ?? entry.source}
                    {' • '}
                    {entry.date}
                    {' • '}
                    {(isArabic
                      ? frequencies.find((frequency) => frequency.value === entry.frequency)?.ar
                      : frequencies.find((frequency) => frequency.value === entry.frequency)?.en) ?? entry.frequency}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(entry.amount, entry.currency, locale)}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.isRecurring ? (isArabic ? 'متكرر' : 'Recurring') : (isArabic ? 'مرة واحدة' : 'One time')}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => isSignedIn && deleteIncomeEntry(entry.id)} disabled={!isSignedIn}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
