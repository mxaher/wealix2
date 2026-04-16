'use client';

import { useId, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Camera, CreditCard, FileSpreadsheet, Info, Landmark, Plus, Receipt, ScanSearch, Trash2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { StatCard } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  type StatementAccountType,
  type StatementImportPreview,
  type StatementImportRow,
  type StatementImportStatus,
} from '@/lib/bank-statement-types';
import {
  useAppStore,
  formatCurrency,
  useSubscription,
  type ExpenseCategory,
  type ExpenseEntry,
  type ImportAuditRecord,
  type IncomeEntry,
  type PaymentMethod,
} from '@/store/useAppStore';
import { toast } from '@/hooks/use-toast';
import { createOpaqueId } from '@/lib/ids';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';

const expenseCategories: ExpenseCategory[] = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Shopping',
  'Housing',
  'Household',
  'Other',
];

const paymentMethods: PaymentMethod[] = ['Cash', 'Card', 'Transfer', 'Wallet', 'Other'];
const statementAccountTypes: Array<{ value: StatementAccountType; en: string; ar: string }> = [
  { value: 'current', en: 'Current Account', ar: 'حساب جاري' },
  { value: 'credit_card', en: 'Credit Card', ar: 'بطاقة ائتمان' },
];

const defaultExpenseForm = {
  amount: '',
  category: 'Food' as ExpenseCategory,
  description: '',
  merchantName: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Card' as PaymentMethod,
  notes: '',
};

function normalizeFingerprintText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 120);
}

function buildTransactionFingerprint({
  date,
  amount,
  currency,
  direction,
  description,
  reference,
}: {
  date: string;
  amount: number;
  currency: string;
  direction: 'income' | 'expense' | null;
  description: string;
  reference?: string | null;
}) {
  return [
    date,
    amount.toFixed(2),
    currency.toUpperCase(),
    direction ?? 'review',
    normalizeFingerprintText(description),
    normalizeFingerprintText(reference),
  ].join('|');
}

export default function ExpensesPage() {
  const locale = useAppStore((state) => state.locale);
  const incomeEntries = useAppStore((state) => state.incomeEntries);
  const expenseEntries = useAppStore((state) => state.expenseEntries);
  const receiptScans = useAppStore((state) => state.receiptScans);
  const addExpenseEntry = useAppStore((state) => state.addExpenseEntry);
  const addExpenseEntries = useAppStore((state) => state.addExpenseEntries);
  const addIncomeEntries = useAppStore((state) => state.addIncomeEntries);
  const deleteExpenseEntry = useAppStore((state) => state.deleteExpenseEntry);
  const addReceiptScan = useAppStore((state) => state.addReceiptScan);
  const { canAccess, tier } = useSubscription();
  const isArabic = locale === 'ar';
  const { isSignedIn } = useRuntimeUser();
  const canScanReceipts = canAccess('expenses.receipt_scan');
  const canImportStatements = canAccess('expenses.statement_import');
  const uploadInputId = useId();
  const cameraInputId = useId();
  const statementInputId = useId();
  const expenseAmountInputId = useId();
  const expenseDescriptionInputId = useId();
  const expenseMerchantInputId = useId();
  const expenseDateInputId = useId();
  const expenseNotesInputId = useId();
  const [open, setOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [savingScan, setSavingScan] = useState(false);
  const [importingStatement, setImportingStatement] = useState(false);
  const [form, setForm] = useState(defaultExpenseForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [statementAccountType, setStatementAccountType] = useState<StatementAccountType>('current');
  const [statementPreview, setStatementPreview] = useState<StatementImportPreview | null>(null);
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

  const existingTransactionFingerprints = useMemo(() => {
    const fingerprints = new Set<string>();

    for (const entry of incomeEntries) {
      const fingerprint = entry.importFingerprint || buildTransactionFingerprint({
        date: entry.date,
        amount: entry.amount,
        currency: entry.currency,
        direction: 'income',
        description: entry.sourceName || entry.notes || '',
      });
      fingerprints.add(fingerprint);
    }

    for (const entry of expenseEntries) {
      const fingerprint = entry.importFingerprint || buildTransactionFingerprint({
        date: entry.date,
        amount: entry.amount,
        currency: entry.currency,
        direction: 'expense',
        description: entry.description,
      });
      fingerprints.add(fingerprint);
    }

    return fingerprints;
  }, [expenseEntries, incomeEntries]);

  const statementRowsWithStatus = useMemo(() => {
    if (!statementPreview) {
      return [];
    }

    return statementPreview.rows.map((row) => {
      if (row.importStatus === 'duplicate') {
        return row;
      }

      if (existingTransactionFingerprints.has(row.fingerprint)) {
        return {
          ...row,
          importStatus: 'duplicate' as StatementImportStatus,
          reviewReason: isArabic
            ? 'هذه العملية موجودة بالفعل وتم منع استيرادها مرة أخرى.'
            : 'This transaction already exists and will not be imported again.',
        };
      }

      return row;
    });
  }, [existingTransactionFingerprints, isArabic, statementPreview]);

  const statementPreviewStats = useMemo(() => {
    return statementRowsWithStatus.reduce((accumulator, row) => {
      if (row.importStatus === 'ready') {
        accumulator.readyCount += 1;

        if (row.direction === 'income') {
          accumulator.incomeCount += 1;
          accumulator.incomeTotal += row.amount;
        }

        if (row.direction === 'expense') {
          accumulator.expenseCount += 1;
          accumulator.expenseTotal += row.amount;
        }
      } else if (row.importStatus === 'duplicate') {
        accumulator.duplicateCount += 1;
      } else {
        accumulator.needsReviewCount += 1;
      }

      return accumulator;
    }, {
      readyCount: 0,
      needsReviewCount: 0,
      duplicateCount: 0,
      incomeCount: 0,
      expenseCount: 0,
      incomeTotal: 0,
      expenseTotal: 0,
    });
  }, [statementRowsWithStatus]);

  const resetStatementImport = () => {
    setStatementFile(null);
    setStatementPreview(null);
    setStatementAccountType('current');
    setImportingStatement(false);
  };

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

  const handleRunStatementImport = async () => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic
          ? 'أنشئ حساباً أولاً لاستيراد كشف الحساب.'
          : 'Create an account to import a bank statement.',
      });
      return;
    }

    if (!statementFile) {
      return;
    }

    if (!canImportStatements) {
      toast({
        title: isArabic ? 'يتطلب Pro مدفوع' : 'Paid Pro required',
        description: isArabic
          ? 'استيراد كشف الحساب متاح فقط لاشتراك Pro المدفوع.'
          : 'Bank statement import is available only on the paid Pro plan.',
        variant: 'destructive',
      });
      return;
    }

    setImportingStatement(true);
    try {
      const formData = new FormData();
      formData.append('file', statementFile);
      formData.append('accountType', statementAccountType);

      const response = await fetch('/api/statements/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not parse the statement file.');
      }

      const preview = data as StatementImportPreview;
      setStatementPreview(preview);
      toast({
        title: isArabic ? 'تم تحليل كشف الحساب' : 'Statement parsed',
        description: isArabic
          ? 'راجع الدخل والمصروفات المستخرجة قبل الاستيراد.'
          : 'Review the extracted income and expense rows before importing.',
      });
    } catch (error) {
      toast({
        title: isArabic ? 'فشل تحليل الملف' : 'Import failed',
        description: error instanceof Error ? error.message : 'Could not parse the statement file.',
        variant: 'destructive',
      });
    } finally {
      setImportingStatement(false);
    }
  };

  const handleSaveStatementImport = () => {
    if (!isSignedIn || !statementPreview) {
      return;
    }

    const importedAt = new Date().toISOString();
    const readyRows = statementRowsWithStatus.filter((row) => row.importStatus === 'ready');

    const importedIncomeEntries: IncomeEntry[] = readyRows
      .filter((row) => row.direction === 'income')
      .map((row) => ({
        id: createOpaqueId('income'),
        amount: row.amount,
        currency: row.currency,
        source: row.incomeSource,
        sourceName: row.typeLabel || row.description,
        frequency: 'one_time' as const,
        date: row.date,
        isRecurring: false,
        notes: [
          `Imported from ${statementAccountType === 'credit_card' ? 'credit card' : 'current account'} statement`,
          row.notes,
          row.description,
          row.reference ? `Reference: ${row.reference}` : null,
        ]
          .filter(Boolean)
          .join(' • '),
        importFingerprint: row.fingerprint,
        importAudit: {
          source: 'statement',
          sourceRowId: row.sourceRowId,
          importedAt,
          rawData: row.rawData,
        } satisfies ImportAuditRecord,
      }))
      .sort((left, right) => right.date.localeCompare(left.date));

    const importedExpensePaymentMethod: PaymentMethod =
      statementAccountType === 'credit_card' ? 'Card' : 'Transfer';

    const importedExpenseEntries: ExpenseEntry[] = readyRows
      .filter((row) => row.direction === 'expense')
      .map((row) => ({
        id: createOpaqueId('expense'),
        amount: row.amount,
        currency: row.currency,
        category: row.expenseCategory,
        description: row.description,
        merchantName: row.merchantName,
        date: row.date,
        paymentMethod: importedExpensePaymentMethod,
        notes: [
          `Imported from ${statementAccountType === 'credit_card' ? 'credit card' : 'current account'} statement`,
          row.notes,
          row.reference ? `Reference: ${row.reference}` : null,
        ]
          .filter(Boolean)
          .join(' • '),
        receiptId: null,
        importFingerprint: row.fingerprint,
        importAudit: {
          source: 'statement',
          sourceRowId: row.sourceRowId,
          importedAt,
          rawData: row.rawData,
        } satisfies ImportAuditRecord,
      }))
      .sort((left, right) => right.date.localeCompare(left.date));

    const duplicateRows = statementRowsWithStatus.filter((row) => row.importStatus === 'duplicate').length;
    const reviewRows = statementRowsWithStatus.filter((row) => row.importStatus === 'needs_review').length;

    if (importedIncomeEntries.length === 0 && importedExpenseEntries.length === 0) {
      toast({
        title: isArabic ? 'لا توجد صفوف قابلة للاستيراد' : 'No importable rows',
        description: isArabic
          ? 'كل الصفوف الحالية إما مكررة أو تحتاج مراجعة يدوية.'
          : 'All current rows are either duplicates or need manual review.',
        variant: 'destructive',
      });
      return;
    }

    if (importedIncomeEntries.length > 0) {
      addIncomeEntries(importedIncomeEntries);
    }

    if (importedExpenseEntries.length > 0) {
      addExpenseEntries(importedExpenseEntries);
    }

    setStatementOpen(false);
    resetStatementImport();
    toast({
      title: isArabic ? 'تم استيراد كشف الحساب' : 'Statement imported',
      description: isArabic
        ? `تمت إضافة ${importedIncomeEntries.length} دخل و${importedExpenseEntries.length} مصروف. تم تخطي ${duplicateRows} مكرر وترك ${reviewRows} للمراجعة.`
        : `Added ${importedIncomeEntries.length} income and ${importedExpenseEntries.length} expenses. Skipped ${duplicateRows} duplicates and left ${reviewRows} for review.`,
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

    if (!canScanReceipts) {
      toast({
        title: isArabic ? 'يتطلب Core أو Pro' : 'Core or Pro required',
        description: isArabic
          ? 'مسح الإيصالات متاح فقط لمشتركي Core وPro، مع حد شهري حسب الخطة.'
          : 'Receipt scanning is available only on Core and Pro, with a monthly limit based on plan.',
        variant: 'destructive',
      });
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

    const receiptFingerprint = buildTransactionFingerprint({
      date: ocrDraft.date,
      amount,
      currency: ocrDraft.currency,
      direction: 'expense',
      description: ocrDraft.description.trim() || `${selectedFile.name} receipt`,
    });

    if (existingTransactionFingerprints.has(receiptFingerprint)) {
      toast({
        title: isArabic ? 'إيصال مكرر' : 'Duplicate receipt',
        description: isArabic
          ? 'هذه العملية موجودة بالفعل ولن يتم حفظها مرتين.'
          : 'This transaction already exists and will not be saved twice.',
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
      importFingerprint: receiptFingerprint,
      importAudit: {
        source: 'receipt',
        importedAt: new Date().toISOString(),
        rawData: {
          merchantName: ocrDraft.merchantName.trim() || null,
          amount,
          currency: ocrDraft.currency,
          date: ocrDraft.date,
          rawText: ocrDraft.rawText.trim().slice(0, 500),
          imageName: selectedFile.name,
        },
      } satisfies ImportAuditRecord,
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
        {isSignedIn && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {isArabic
                ? tier === 'pro'
                  ? 'خطة Pro: مسح حتى 40 إيصالاً شهرياً واستيراد كشف الحساب البنكي متاح.'
                  : tier === 'core'
                    ? 'خطة Core: مسح حتى 10 إيصالات شهرياً. استيراد كشف الحساب متاح فقط في Pro المدفوع.'
                    : 'استيراد كشف الحساب متاح فقط في Pro المدفوع، ومسح الإيصالات يبدأ من Core.'
                : tier === 'pro'
                  ? 'Pro plan: scan up to 40 receipts per month, and bank statement import is enabled.'
                  : tier === 'core'
                    ? 'Core plan: scan up to 10 receipts per month. Bank statement import is available only on paid Pro.'
                    : 'Bank statement import is available only on paid Pro, and receipt scanning starts on Core.'}
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
            <ResponsiveModal
              open={statementOpen}
              onOpenChange={(nextOpen) => {
                setStatementOpen(nextOpen);
                if (!nextOpen) {
                  resetStatementImport();
                }
              }}
              trigger={(
                <Button variant="outline" className="gap-2" disabled={!isSignedIn || !canImportStatements}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {isArabic ? 'استيراد كشف حساب' : 'Import Statement'}
                </Button>
              )}
              title={isArabic ? 'استيراد كشف الحساب البنكي' : 'Import Bank Statement'}
              description={
                isArabic
                  ? 'ارفع ملف CSV أو XLSX أو PDF نصي لحساب جاري أو بطاقة ائتمان لاستخراج التاريخ والدخل والمصروفات والنوع قبل الحفظ.'
                  : 'Upload a CSV, XLSX, or text-based PDF export from a current account or credit card to extract dates, income, expenses, and transaction type before saving.'
              }
              desktopContentClassName="max-w-4xl"
              mobileContentClassName="max-h-[85dvh]"
            >
              <div className="space-y-4 overflow-y-auto px-4 pb-6 md:px-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'نوع الحساب' : 'Account type'}</Label>
                    <Select
                      value={statementAccountType}
                      onValueChange={(value: StatementAccountType) => {
                        setStatementAccountType(value);
                        setStatementPreview(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statementAccountTypes.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {isArabic ? option.ar : option.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'ملف كشف الحساب' : 'Statement file'}</Label>
                    <label
                      htmlFor={statementInputId}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
                    >
                      {statementAccountType === 'credit_card' ? <CreditCard className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                      {isArabic ? 'اختر ملف CSV أو XLSX أو PDF' : 'Choose CSV, XLSX, or PDF file'}
                    </label>
                    <input
                      id={statementInputId}
                      type="file"
                      accept=".csv,.xlsx,.pdf,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      disabled={!isSignedIn}
                      className="sr-only"
                      onChange={(e) => {
                        setStatementFile(e.target.files?.[0] ?? null);
                        setStatementPreview(null);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {statementFile
                        ? (isArabic ? `الملف المحدد: ${statementFile.name}` : `Selected file: ${statementFile.name}`)
                        : (isArabic ? 'يفضل استخدام ملف التصدير من البنك مباشرة. يدعم CSV وXLSX وPDF النصي.' : 'Use the statement export file directly from your bank when possible. Supports CSV, XLSX, and text-based PDF.')}
                    </p>
                  </div>
                </div>
                <Button className="w-full" onClick={handleRunStatementImport} disabled={!statementFile || importingStatement}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {importingStatement
                    ? (isArabic ? 'جارٍ تحليل كشف الحساب...' : 'Parsing statement...')
                    : (isArabic ? 'تحليل كشف الحساب' : 'Analyze Statement')}
                </Button>

                {statementPreview && (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-5">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground">{isArabic ? 'الدخل المستخرج' : 'Extracted income'}</div>
                          <div className="mt-1 font-semibold">{formatCurrency(statementPreviewStats.incomeTotal, statementPreview.currency, locale)}</div>
                          <div className="text-xs text-muted-foreground">{statementPreviewStats.incomeCount} {isArabic ? 'عملية جاهزة' : 'ready rows'}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground">{isArabic ? 'المصروفات المستخرجة' : 'Extracted expenses'}</div>
                          <div className="mt-1 font-semibold">{formatCurrency(statementPreviewStats.expenseTotal, statementPreview.currency, locale)}</div>
                          <div className="text-xs text-muted-foreground">{statementPreviewStats.expenseCount} {isArabic ? 'عملية جاهزة' : 'ready rows'}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground">{isArabic ? 'الإجمالي القابل للاستيراد' : 'Ready to import'}</div>
                          <div className="mt-1 font-semibold">{statementPreviewStats.readyCount}</div>
                          <div className="text-xs text-muted-foreground">{isArabic ? 'صف صالح' : 'valid rows'}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground">{isArabic ? 'تحتاج مراجعة' : 'Needs review'}</div>
                          <div className="mt-1 font-semibold">{statementPreviewStats.needsReviewCount}</div>
                          <div className="text-xs text-muted-foreground">{isArabic ? 'صف غير مؤكد' : 'uncertain rows'}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground">{isArabic ? 'الصفوف المكررة' : 'Duplicate rows'}</div>
                          <div className="mt-1 font-semibold">{statementPreviewStats.duplicateCount}</div>
                          <div className="text-xs text-muted-foreground">{isArabic ? 'لن تُستورد' : 'will not import'}</div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {isArabic
                        ? `تم تجاهل ${statementPreview.skippedRows} صف غير صالح أو ناقص أثناء التحليل.`
                        : `Skipped ${statementPreview.skippedRows} empty or invalid rows during parsing.`}
                    </div>

                    <Card className="border-gold/30 bg-gold/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{isArabic ? 'معاينة المعاملات' : 'Transaction Preview'}</CardTitle>
                        <CardDescription>
                          {isArabic
                            ? 'سيتم استيراد الصفوف الجاهزة فقط. الصفوف المكررة أو غير المؤكدة ستبقى للمراجعة اليدوية.'
                            : 'Only ready rows will be imported. Duplicate or uncertain rows stay flagged for manual review.'}
                        </CardDescription>
                        <div className="text-xs text-muted-foreground">
                          {isArabic
                            ? `مصدر الملف: ${statementPreview.sourceFormat.toUpperCase()}`
                            : `Source format: ${statementPreview.sourceFormat.toUpperCase()}`}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {statementRowsWithStatus.slice(0, 12).map((row) => (
                          <div key={row.id} className="flex flex-col gap-3 rounded-xl border bg-background/80 p-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{row.description}</span>
                                <Badge variant="secondary">{row.typeLabel}</Badge>
                                <Badge
                                  variant={
                                    row.importStatus === 'ready'
                                      ? row.direction === 'income' ? 'default' : 'outline'
                                      : 'secondary'
                                  }
                                >
                                  {row.importStatus === 'duplicate'
                                    ? (isArabic ? 'مكرر' : 'Duplicate')
                                    : row.importStatus === 'needs_review'
                                      ? (isArabic ? 'مراجعة' : 'Review')
                                      : row.direction === 'income'
                                    ? (isArabic ? 'دخل' : 'Income')
                                    : (isArabic ? 'مصروف' : 'Expense')}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {row.date}
                                {' • '}
                                {row.merchantName || (isArabic ? 'بدون تاجر' : 'No merchant')}
                                {row.reference ? ` • ${row.reference}` : ''}
                              </div>
                              {row.reviewReason && (
                                <div className="text-xs text-amber-600">
                                  {row.reviewReason}
                                </div>
                              )}
                              {row.notes && (
                                <div className="text-xs text-muted-foreground">
                                  {row.notes}
                                </div>
                              )}
                            </div>
                            <div className={`flex items-center gap-2 text-right font-semibold ${row.direction === 'income' ? 'text-emerald-600' : row.direction === 'expense' ? 'text-rose-600' : 'text-amber-600'}`}>
                              {row.direction === 'income'
                                ? <ArrowUpCircle className="h-4 w-4" />
                                : row.direction === 'expense'
                                  ? <ArrowDownCircle className="h-4 w-4" />
                                  : <Info className="h-4 w-4" />}
                              {formatCurrency(row.amount, row.currency, locale)}
                            </div>
                          </div>
                        ))}
                        {statementRowsWithStatus.length > 12 && (
                          <p className="text-xs text-muted-foreground">
                            {isArabic
                              ? `يتم عرض أول 12 حركة فقط من أصل ${statementRowsWithStatus.length} حركة مستخرجة.`
                              : `Showing the first 12 rows out of ${statementRowsWithStatus.length} extracted transactions.`}
                          </p>
                        )}
                        <Button className="w-full" onClick={handleSaveStatementImport} disabled={statementPreviewStats.readyCount === 0}>
                          {isArabic ? 'استيراد إلى النظام' : 'Import to System'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </ResponsiveModal>

            <ResponsiveModal
              open={scannerOpen}
              onOpenChange={setScannerOpen}
              trigger={(
                <Button variant="outline" className="gap-2" disabled={!isSignedIn || !canScanReceipts}>
                  <ScanSearch className="h-4 w-4" />
                  {isArabic ? 'مسح إيصال' : 'Scan Receipt'}
                </Button>
              )}
              title={isArabic ? 'ماسح الإيصالات' : 'Receipt Scanner'}
              description={
                isArabic
                  ? 'ارفع صورة إيصال وسيتم استخراج التاجر والمبلغ والتاريخ تلقائياً.'
                  : 'Upload a receipt image to extract merchant, amount, and date automatically.'
              }
              desktopContentClassName="flex max-h-[calc(100dvh-1.5rem)] max-w-2xl flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-4rem)]"
              desktopHeaderClassName="px-6 pt-6 pb-0"
              mobileContentClassName="max-h-[85dvh]"
              hideDesktopCloseButton
            >
              <div className="space-y-4 overflow-y-auto px-4 pb-6 md:px-6 md:pt-0">
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
                        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 pt-4 pb-1 backdrop-blur md:-mx-0 md:px-0">
                          <Button className="w-full" onClick={handleSaveScannedExpense} disabled={!isSignedIn}>
                            {isArabic ? 'حفظ كمصروف' : 'Save as Expense'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </div>
            </ResponsiveModal>

            <ResponsiveModal
              open={open}
              onOpenChange={setOpen}
              trigger={(
                <Button className="gap-2" disabled={!isSignedIn}>
                  <Plus className="h-4 w-4" />
                  {isArabic ? 'إضافة مصروف' : 'Add Expense'}
                </Button>
              )}
              title={isArabic ? 'إضافة مصروف' : 'Add Expense'}
              description={
                isArabic
                  ? 'أضف المصروفات يدوياً أو استخدم OCR للإيصالات.'
                  : 'Add expenses manually or use the receipt OCR flow.'
              }
              mobileContentClassName="max-h-[85dvh]"
            >
              <div className="space-y-4 overflow-y-auto px-4 pb-6 md:px-0">
                <div className="space-y-2">
                  <Label htmlFor={expenseAmountInputId}>{isArabic ? 'المبلغ' : 'Amount'}</Label>
                  <Input
                    id={expenseAmountInputId}
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
                    <Label htmlFor={expenseDescriptionInputId}>{isArabic ? 'الوصف' : 'Description'}</Label>
                    <Input
                      id={expenseDescriptionInputId}
                      value={form.description}
                      onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={expenseMerchantInputId}>{isArabic ? 'التاجر' : 'Merchant'}</Label>
                    <Input
                      id={expenseMerchantInputId}
                      value={form.merchantName}
                      onChange={(e) => setForm((current) => ({ ...current, merchantName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={expenseDateInputId}>{isArabic ? 'التاريخ' : 'Date'}</Label>
                  <Input
                    id={expenseDateInputId}
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={expenseNotesInputId}>{isArabic ? 'ملاحظات' : 'Notes'}</Label>
                  <Textarea
                    id={expenseNotesInputId}
                    value={form.notes}
                    onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  />
                </div>
                <Button className="w-full" onClick={handleAddExpense} disabled={!isSignedIn}>
                  {isArabic ? 'حفظ المصروف' : 'Save Expense'}
                </Button>
              </div>
            </ResponsiveModal>
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
