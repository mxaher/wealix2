'use client';

import { useId, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Camera, Info, Plus, Receipt, ScanSearch, Trash2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { StatCard } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, formatCurrency, type ExpenseCategory, type ExpenseEntry, type PaymentMethod } from '@/store/useAppStore';
import { toast } from '@/hooks/use-toast';
import { createOpaqueId } from '@/lib/ids';

const expenseCategories: ExpenseCategory[] = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Shopping',
  'Housing',
  'Other',
];

const paymentMethods: PaymentMethod[] = ['Cash', 'Card', 'Transfer', 'Wallet', 'Other'];

const defaultExpenseForm = {
  amount: '',
  category: 'Food' as ExpenseCategory,
  description: '',
  merchantName: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Card' as PaymentMethod,
  notes: '',
};

export default function ExpensesPage() {
  const locale = useAppStore((state) => state.locale);
  const expenseEntries = useAppStore((state) => state.expenseEntries);
  const receiptScans = useAppStore((state) => state.receiptScans);
  const addExpenseEntry = useAppStore((state) => state.addExpenseEntry);
  const deleteExpenseEntry = useAppStore((state) => state.deleteExpenseEntry);
  const addReceiptScan = useAppStore((state) => state.addReceiptScan);
  const isArabic = locale === 'ar';
  const { isSignedIn } = useUser();
  const uploadInputId = useId();
  const cameraInputId = useId();
  const [open, setOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [savingScan, setSavingScan] = useState(false);
  const [form, setForm] = useState(defaultExpenseForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<null | {
    merchantName: string;
    amount: number;
    date: string;
    currency: string;
    confidence: number;
    suggestedCategory: ExpenseCategory;
    rawText: string;
  }>(null);
  const [ocrDraft, setOcrDraft] = useState<null | {
    merchantName: string;
    amount: string;
    date: string;
    currency: string;
    confidence: number;
    suggestedCategory: ExpenseCategory;
    rawText: string;
    description: string;
  }>(null);

  const summary = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthlyTotal = expenseEntries
      .filter((entry) => entry.date.startsWith(monthKey))
      .reduce((sum, entry) => sum + entry.amount, 0);
    const topCategory = expenseCategories
      .map((category) => ({
        category,
        total: expenseEntries
          .filter((entry) => entry.category === category)
          .reduce((sum, entry) => sum + entry.amount, 0),
      }))
      .sort((a, b) => b.total - a.total)[0];

    return {
      monthlyTotal,
      totalEntries: expenseEntries.length,
      topCategory,
    };
  }, [expenseEntries]);

  const handleAddExpense = () => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic
          ? 'يمكن للضيف تصفح البيانات التجريبية فقط. أنشئ حساباً لإضافة المصروفات.'
          : 'Guests can browse demo data only. Create an account to add expenses.',
      });
      return;
    }

    const amount = Number(form.amount);
    if (!amount || amount <= 0 || !form.description.trim()) {
      toast({
        title: isArabic ? 'بيانات غير مكتملة' : 'Incomplete form',
        description: isArabic
          ? 'أدخل المبلغ والوصف قبل الحفظ.'
          : 'Enter an amount and description before saving.',
        variant: 'destructive',
      });
      return;
    }

    const entry: ExpenseEntry = {
      id: createOpaqueId('expense'),
      amount,
      currency: 'SAR',
      category: form.category,
      description: form.description.trim(),
      merchantName: form.merchantName.trim() || null,
      date: form.date,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim() || null,
      receiptId: null,
    };

    addExpenseEntry(entry);
    setForm(defaultExpenseForm);
    setOpen(false);
    toast({
      title: isArabic ? 'تمت إضافة المصروفات' : 'Expense added',
      description: isArabic ? 'تم حفظ المصروف بنجاح.' : 'Your expense entry was saved.',
    });
  };

  const handleRunOcr = async () => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic
          ? 'امسح الإيصالات بعد إنشاء حساب.'
          : 'Create an account to scan receipts.',
      });
      return;
    }

    if (!selectedFile) {
      return;
    }

    setSavingScan(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/receipts/ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process receipt');
      }

      setOcrResult(data);
      setOcrDraft({
        merchantName: data.merchantName || '',
        amount: data.amount ? String(data.amount) : '',
        date: data.date || new Date().toISOString().slice(0, 10),
        currency: data.currency || 'SAR',
        confidence: data.confidence || 0,
        suggestedCategory: data.suggestedCategory || 'Other',
        rawText: data.rawText || '',
        description: data.merchantName
          ? `${data.merchantName} receipt`
          : `${selectedFile.name} receipt`,
      });
      toast({
        title: isArabic ? 'تمت قراءة الإيصال' : 'Receipt scanned',
        description: isArabic
          ? 'راجع البيانات المستخرجة قبل الحفظ.'
          : 'Review the extracted values before saving.',
      });
    } catch (error) {
      toast({
        title: isArabic ? 'فشل المسح' : 'Scan failed',
        description: error instanceof Error ? error.message : 'Could not process receipt.',
        variant: 'destructive',
      });
    } finally {
      setSavingScan(false);
    }
  };

  const handleSaveScannedExpense = () => {
    if (!isSignedIn) {
      return;
    }

    if (!ocrResult || !ocrDraft || !selectedFile) {
      return;
    }

    const amount = Number(ocrDraft.amount);
    if (!amount || amount <= 0) {
      toast({
        title: isArabic ? 'المبلغ غير صالح' : 'Invalid amount',
        description: isArabic
          ? 'عدّل مبلغ الإيصال قبل الحفظ.'
          : 'Please correct the receipt amount before saving.',
        variant: 'destructive',
      });
      return;
    }

    const receiptId = createOpaqueId('receipt');
    addReceiptScan({
      id: receiptId,
      merchantName: ocrDraft.merchantName.trim() || (isArabic ? 'إيصال بدون اسم' : 'Unnamed receipt'),
      amount,
      date: ocrDraft.date,
      currency: ocrDraft.currency,
      confidence: ocrDraft.confidence,
      suggestedCategory: ocrDraft.suggestedCategory,
      rawText: ocrDraft.rawText,
      imageName: selectedFile.name,
    });

    addExpenseEntry({
      id: createOpaqueId('expense'),
      amount,
      currency: ocrDraft.currency,
      category: ocrDraft.suggestedCategory,
      description: ocrDraft.description.trim() || `${selectedFile.name} receipt`,
      merchantName: ocrDraft.merchantName.trim() || null,
      date: ocrDraft.date,
      paymentMethod: 'Card',
      notes: ocrDraft.rawText.trim().slice(0, 200) || null,
      receiptId,
    });

    setScannerOpen(false);
    setSelectedFile(null);
    setOcrResult(null);
    setOcrDraft(null);
    toast({
      title: isArabic ? 'تم حفظ الإيصال' : 'Receipt saved',
      description: isArabic
        ? 'تمت إضافة المصروفات من الإيصال بنجاح.'
        : 'The scanned receipt was saved as an expense.',
    });
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {!isSignedIn && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {isArabic
                ? 'أنت الآن في وضع الضيف. يمكنك رؤية بيانات الإيصالات والمصروفات التجريبية فقط، لكن الإضافة والمسح والحفظ تتطلب حساباً.'
                : 'You are in guest mode. You can view demo expense and receipt data, but adding, scanning, and saving require an account.'}
            </CardContent>
          </Card>
        )}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'المصروفات' : 'Expenses'}</h1>
            <p className="text-muted-foreground">
              {isArabic
                ? 'إدارة المصروفات ومسح الإيصالات مستوحاة من Wealix v1.'
                : 'Expense tracking and receipt scanning inspired by Wealix v1.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={!isSignedIn}>
                  <ScanSearch className="h-4 w-4" />
                  {isArabic ? 'مسح إيصال' : 'Scan Receipt'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'ماسح الإيصالات' : 'Receipt Scanner'}</DialogTitle>
                  <DialogDescription>
                    {isArabic
                      ? 'ارفع صورة إيصال وسيتم استخراج التاجر والمبلغ والتاريخ تلقائياً.'
                      : 'Upload a receipt image to extract merchant, amount, and date automatically.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'مصدر الإيصال' : 'Receipt source'}</Label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label
                        htmlFor={uploadInputId}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        <Receipt className="h-4 w-4" />
                        {isArabic ? 'تصفح ملف الإيصال' : 'Browse receipt file'}
                      </label>
                      <input
                        id={uploadInputId}
                        type="file"
                        accept="image/*"
                        disabled={!isSignedIn}
                        className="sr-only"
                        onChange={(e) => {
                          setSelectedFile(e.target.files?.[0] ?? null);
                          setOcrResult(null);
                          setOcrDraft(null);
                        }}
                      />

                      <label
                        htmlFor={cameraInputId}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        <Camera className="h-4 w-4" />
                        {isArabic ? 'التقاط صورة بالكاميرا' : 'Scan photo using camera'}
                      </label>
                      <input
                        id={cameraInputId}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={!isSignedIn}
                        className="sr-only"
                        onChange={(e) => {
                          setSelectedFile(e.target.files?.[0] ?? null);
                          setOcrResult(null);
                          setOcrDraft(null);
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedFile
                        ? (isArabic ? `الملف المحدد: ${selectedFile.name}` : `Selected file: ${selectedFile.name}`)
                        : (isArabic ? 'اختر صورة من الجهاز أو افتح الكاميرا مباشرة من الهاتف.' : 'Choose a receipt image from your device or launch the phone camera directly.')}
                    </p>
                  </div>
                  <Button className="w-full" onClick={handleRunOcr} disabled={!selectedFile || savingScan}>
                    <Camera className="mr-2 h-4 w-4" />
                    {savingScan ? (isArabic ? 'جارٍ التحليل...' : 'Analyzing...') : (isArabic ? 'تشغيل OCR' : 'Run OCR')}
                  </Button>
                  {ocrResult && (
                    <Card className="border-gold/30 bg-gold/5">
                      <CardContent className="space-y-3 p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-sm text-muted-foreground">{isArabic ? 'التاجر' : 'Merchant'}</p>
                            <p className="font-medium">{ocrResult.merchantName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{isArabic ? 'المبلغ' : 'Amount'}</p>
                            <p className="font-medium">{formatCurrency(ocrResult.amount, ocrResult.currency, locale)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{isArabic ? 'التاريخ' : 'Date'}</p>
                            <p className="font-medium">{ocrResult.date}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <span>{isArabic ? 'الثقة' : 'Confidence'}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex text-muted-foreground hover:text-foreground">
                                      <Info className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs leading-5">
                                    {isArabic
                                      ? 'تمثل هذه النسبة مدى ثقة OCR في التاجر والمبلغ والتاريخ. إذا كانت منخفضة، راجع الحقول والنص الخام قبل الحفظ.'
                                      : 'This score reflects OCR confidence across merchant, amount, and date extraction. If it is low, review the fields and raw text before saving.'}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className="font-medium">{ocrResult.confidence}%</p>
                          </div>
                        </div>
                        {ocrDraft && (
                          <div className="space-y-4 rounded-xl border bg-background/80 p-4">
                            <div>
                              <p className="text-sm font-medium">
                                {isArabic ? 'راجع البيانات المستخرجة قبل الحفظ' : 'Review and correct the extracted data before saving'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isArabic
                                  ? 'يمكنك تعديل اسم التاجر والمبلغ والتاريخ والوصف والنص الخام.'
                                  : 'You can edit the merchant, amount, date, description, category, and raw OCR text.'}
                              </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>{isArabic ? 'التاجر' : 'Merchant'}</Label>
                                <Input
                                  value={ocrDraft.merchantName}
                                  onChange={(e) => setOcrDraft((current) => current ? { ...current, merchantName: e.target.value } : current)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{isArabic ? 'المبلغ' : 'Amount'}</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={ocrDraft.amount}
                                  onChange={(e) => setOcrDraft((current) => current ? { ...current, amount: e.target.value } : current)}
                                />
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>{isArabic ? 'التاريخ' : 'Date'}</Label>
                                <Input
                                  type="date"
                                  value={ocrDraft.date}
                                  onChange={(e) => setOcrDraft((current) => current ? { ...current, date: e.target.value } : current)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                                <Select
                                  value={ocrDraft.suggestedCategory}
                                  onValueChange={(value: ExpenseCategory) =>
                                    setOcrDraft((current) => current ? { ...current, suggestedCategory: value } : current)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {expenseCategories.map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>{isArabic ? 'الوصف' : 'Description'}</Label>
                              <Input
                                value={ocrDraft.description}
                                onChange={(e) => setOcrDraft((current) => current ? { ...current, description: e.target.value } : current)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{isArabic ? 'النص الخام المستخرج' : 'Extracted Raw Text'}</Label>
                              <Textarea
                                className="min-h-[140px]"
                                value={ocrDraft.rawText}
                                onChange={(e) => setOcrDraft((current) => current ? { ...current, rawText: e.target.value } : current)}
                              />
                            </div>
                          </div>
                        )}
                        <Button className="w-full" onClick={handleSaveScannedExpense} disabled={!isSignedIn}>
                          {isArabic ? 'حفظ كمصروف' : 'Save as Expense'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={!isSignedIn}>
                  <Plus className="h-4 w-4" />
                  {isArabic ? 'إضافة مصروف' : 'Add Expense'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'إضافة مصروف' : 'Add Expense'}</DialogTitle>
                  <DialogDescription>
                    {isArabic
                      ? 'أضف المصروفات يدوياً أو استخدم OCR للإيصالات.'
                      : 'Add expenses manually or use the receipt OCR flow.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'المبلغ' : 'Amount'}</Label>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                      <Select
                        value={form.category}
                        onValueChange={(value: ExpenseCategory) => setForm((current) => ({ ...current, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'طريقة الدفع' : 'Payment Method'}</Label>
                      <Select
                        value={form.paymentMethod}
                        onValueChange={(value: PaymentMethod) => setForm((current) => ({ ...current, paymentMethod: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الوصف' : 'Description'}</Label>
                      <Input
                        value={form.description}
                        onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'التاجر' : 'Merchant'}</Label>
                      <Input
                        value={form.merchantName}
                        onChange={(e) => setForm((current) => ({ ...current, merchantName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'التاريخ' : 'Date'}</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'ملاحظات' : 'Notes'}</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                    />
                  </div>
                  <Button className="w-full" onClick={handleAddExpense} disabled={!isSignedIn}>
                    {isArabic ? 'حفظ المصروف' : 'Save Expense'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title={isArabic ? 'مصروفات هذا الشهر' : 'This Month'}
            value={formatCurrency(summary.monthlyTotal, 'SAR', locale)}
            icon={Receipt}
            iconColor="text-rose-500 bg-rose-500/10"
          />
          <StatCard
            title={isArabic ? 'عدد المصروفات' : 'Expense Entries'}
            value={String(summary.totalEntries)}
            icon={Receipt}
            iconColor="text-blue-500 bg-blue-500/10"
          />
          <StatCard
            title={isArabic ? 'أعلى فئة' : 'Top Category'}
            value={summary.topCategory?.category ?? 'Other'}
            icon={Receipt}
            iconColor="text-gold bg-gold/10"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? 'سجل المصروفات' : 'Expense Ledger'}</CardTitle>
            <CardDescription>
              {isArabic ? 'إضافة يدوية ومسح إيصالات كما في v1.' : 'Manual entry and receipt scanning inspired by v1.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expenseEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border p-4">
                <div className="space-y-1">
                  <div className="font-medium">{entry.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {entry.category}
                    {' • '}
                    {entry.merchantName || (isArabic ? 'بدون تاجر' : 'No merchant')}
                    {' • '}
                    {entry.date}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right font-semibold">
                    {formatCurrency(entry.amount, entry.currency, locale)}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => isSignedIn && deleteExpenseEntry(entry.id)} disabled={!isSignedIn}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? 'آخر الإيصالات الممسوحة' : 'Recent Scanned Receipts'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {receiptScans.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {isArabic ? 'لم يتم مسح أي إيصال بعد.' : 'No receipts scanned yet.'}
              </div>
            ) : (
              receiptScans.map((receipt) => (
                <div key={receipt.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{receipt.merchantName}</div>
                      <div className="text-sm text-muted-foreground">
                        {receipt.imageName}
                        {' • '}
                        {receipt.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(receipt.amount, receipt.currency, locale)}</div>
                      <div className="text-xs text-muted-foreground">{receipt.confidence}%</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
