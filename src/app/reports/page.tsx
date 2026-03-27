'use client';

import { useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import {
  Calendar,
  Download,
  Eye,
  FileDown,
  FileText,
  Flame,
  PieChart,
  Receipt,
  Sparkles,
  TrendingUp,
  Wallet,
  Briefcase,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { FeatureGate } from '@/components/shared';
import { useAppStore, formatCurrency } from '@/store/useAppStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { createOpaqueId } from '@/lib/ids';

type ReportTier = 'free' | 'core' | 'pro';

interface ReportType {
  id: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: React.ReactNode;
  tier: ReportTier;
}

interface GeneratedReport {
  id: string;
  type: string;
  name: string;
  generatedAt: string;
  size: string;
  periodLabel: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  sections: string[];
  htmlContent: string;
}

const reportTypes: ReportType[] = [
  {
    id: 'monthly-summary',
    name: { en: 'Monthly Financial Summary', ar: 'الملخص المالي الشهري' },
    description: { en: 'Net worth, cash flow, and monthly review', ar: 'صافي الثروة والتدفق النقدي ومراجعة الشهر' },
    icon: <PieChart className="h-6 w-6" />,
    tier: 'core',
  },
  {
    id: 'portfolio-report',
    name: { en: 'Portfolio Report', ar: 'تقرير المحفظة' },
    description: { en: 'Holdings, allocation, and specialist commentary', ar: 'المراكز والتوزيع وتعليق استثماري متخصص' },
    icon: <Briefcase className="h-6 w-6" />,
    tier: 'pro',
  },
  {
    id: 'net-worth-report',
    name: { en: 'Net Worth Report', ar: 'تقرير صافي الثروة' },
    description: { en: 'Assets, liabilities, and balance snapshot', ar: 'الأصول والالتزامات ولقطة الميزانية الشخصية' },
    icon: <Wallet className="h-6 w-6" />,
    tier: 'core',
  },
  {
    id: 'income-report',
    name: { en: 'Income Report', ar: 'تقرير الدخل' },
    description: { en: 'Sources, recurring income, and entry mix', ar: 'مصادر الدخل والدخل المتكرر وتوزيع الإدخالات' },
    icon: <TrendingUp className="h-6 w-6" />,
    tier: 'core',
  },
  {
    id: 'expenses-report',
    name: { en: 'Expenses Report', ar: 'تقرير المصروفات' },
    description: { en: 'Expense totals, merchants, and category behavior', ar: 'إجمالي المصروفات والتجار وسلوك الفئات' },
    icon: <Receipt className="h-6 w-6" />,
    tier: 'core',
  },
  {
    id: 'budget-report',
    name: { en: 'Budget Report', ar: 'تقرير الميزانية' },
    description: { en: 'Spending behavior and category breakdown', ar: 'سلوك الإنفاق وتفصيل الفئات' },
    icon: <Receipt className="h-6 w-6" />,
    tier: 'core',
  },
  {
    id: 'fire-report',
    name: { en: 'FIRE Progress Report', ar: 'تقرير تقدم FIRE' },
    description: { en: 'Savings velocity and FIRE readiness snapshot', ar: 'سرعة الادخار ولقطة الجاهزية لـ FIRE' },
    icon: <Flame className="h-6 w-6" />,
    tier: 'pro',
  },
  {
    id: 'annual-review',
    name: { en: 'Annual Financial Review', ar: 'المراجعة المالية السنوية' },
    description: { en: 'Yearly overview with strategic highlights', ar: 'نظرة سنوية شاملة مع أبرز النقاط الاستراتيجية' },
    icon: <TrendingUp className="h-6 w-6" />,
    tier: 'pro',
  },
];

function downloadReportFile(report: GeneratedReport) {
  const blob = new Blob([report.htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const {
    locale,
    appMode,
    incomeEntries,
    expenseEntries,
    portfolioHoldings,
    receiptScans,
    assets,
    liabilities,
    budgetLimits,
    user,
  } = useAppStore();
  const { isSignedIn } = useUser();
  const isArabic = locale === 'ar';
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);

  const matchesPeriod = (date: string) => {
    if (!date) return false;
    if (selectedPeriod === 'year') {
      return date.startsWith(selectedYear);
    }
    if (selectedPeriod === 'month') {
      return date.startsWith(`${selectedYear}-${selectedMonth}`);
    }
    const monthNumber = Number(date.slice(5, 7));
    const quarter = Math.ceil(monthNumber / 3);
    const selectedQuarter = Math.ceil(Number(selectedMonth) / 3);
    return date.startsWith(selectedYear) && quarter === selectedQuarter;
  };

  const filteredIncomeEntries = incomeEntries.filter((entry) => matchesPeriod(entry.date));
  const filteredExpenseEntries = expenseEntries.filter((entry) => matchesPeriod(entry.date));
  const filteredReceiptScans = receiptScans.filter((entry) => matchesPeriod(entry.date));
  const totalIncome = filteredIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = filteredExpenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const portfolioValue = portfolioHoldings.reduce((sum, item) => sum + item.shares * item.currentPrice, 0);
  const investedCost = portfolioHoldings.reduce((sum, item) => sum + item.shares * item.avgCost, 0);
  const totalAssets = assets.reduce((sum, item) => sum + item.value, 0) + portfolioValue;
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const periodLabel = useMemo(() => {
    if (selectedPeriod === 'month') {
      return new Date(Number(selectedYear), Number(selectedMonth) - 1, 1).toLocaleDateString(
        isArabic ? 'ar-SA-u-nu-latn' : 'en-US',
        { month: 'long', year: 'numeric' }
      );
    }

    if (selectedPeriod === 'quarter') {
      const quarter = Math.ceil(Number(selectedMonth) / 3);
      return isArabic ? `الربع ${quarter} ${selectedYear}` : `Q${quarter} ${selectedYear}`;
    }

    return selectedYear;
  }, [isArabic, selectedMonth, selectedPeriod, selectedYear]);

  const demoReport = useMemo(
    () =>
      buildReport({
        locale,
        userName: user?.name || 'Demo User',
        reportType: reportTypes[0],
        periodLabel,
        context: {
          totalIncome,
          totalExpenses,
          portfolioValue,
          investedCost,
          totalAssets,
          totalLiabilities,
          netWorth,
          savingsRate,
          assets,
          liabilities,
          budgetLimits,
          holdings: portfolioHoldings,
          incomeEntries: filteredIncomeEntries,
          expenseEntries: filteredExpenseEntries,
          receiptScans: filteredReceiptScans,
        },
      }),
    [assets, liabilities, budgetLimits, filteredExpenseEntries, filteredIncomeEntries, filteredReceiptScans, investedCost, locale, netWorth, periodLabel, portfolioHoldings, portfolioValue, savingsRate, totalAssets, totalExpenses, totalIncome, totalLiabilities, user?.name]
  );

  const visibleReports = appMode === 'demo' && generatedReports.length === 0 ? [demoReport] : generatedReports;
  const selectedReport = visibleReports.find((report) => report.id === selectedReportId) ?? visibleReports[0] ?? null;

  const handleGenerateReport = async (reportTypeId: string) => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic
          ? 'يمكن للضيف تصفح بيانات التقارير التجريبية فقط. أنشئ حساباً لتوليد تقاريرك.'
          : 'Guests can browse the demo reports only. Create an account to generate your own reports.',
      });
      return;
    }

    const reportType = reportTypes.find((report) => report.id === reportTypeId);
    if (!reportType) {
      return;
    }

    setGenerating(reportTypeId);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const report = buildReport({
      locale,
      userName: user?.name || (isArabic ? 'مستخدم Wealix' : 'Wealix User'),
      reportType,
      periodLabel,
      context: {
        totalIncome,
        totalExpenses,
        portfolioValue,
        investedCost,
        totalAssets,
        totalLiabilities,
        netWorth,
        savingsRate,
        assets,
        liabilities,
        budgetLimits,
        holdings: portfolioHoldings,
        incomeEntries: filteredIncomeEntries,
        expenseEntries: filteredExpenseEntries,
        receiptScans: filteredReceiptScans,
      },
    });

    setGeneratedReports((current) => [report, ...current.filter((item) => item.type !== report.type)]);
    setSelectedReportId(report.id);
    setPreviewOpen(true);
    setGenerating(null);
  };

  const handleDownload = (report: GeneratedReport) => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic
          ? 'تسجيل الدخول مطلوب لتنزيل التقارير.'
          : 'Sign in is required to download reports.',
      });
      return;
    }

    downloadReportFile(report);
    toast({
      title: isArabic ? 'تم تنزيل التقرير' : 'Report downloaded',
      description: isArabic
        ? 'تم تنزيل نسخة HTML قابلة للطباعة من التقرير.'
        : 'A printable HTML copy of the report was downloaded.',
    });
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {!isSignedIn && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {isArabic
                ? 'يمكنك كضيف استعراض التقرير التجريبي فقط. إنشاء التقارير أو مراجعتها أو تنزيلها يتطلب حساباً.'
                : 'As a guest you can browse the demo report only. Generating, reviewing, or downloading reports requires an account.'}
            </CardContent>
          </Card>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <FileText className="h-6 w-6" />
              {isArabic ? 'التقارير' : 'Reports'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic
                ? 'أنشئ التقرير، راجعه، ثم نزّل نفس التقرير الذي اخترته.'
                : 'Generate a report, review that exact report, and download the same file.'}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{isArabic ? 'الفترة:' : 'Period:'}</span>
              </div>

              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{isArabic ? 'شهري' : 'Monthly'}</SelectItem>
                  <SelectItem value="quarter">{isArabic ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                  <SelectItem value="year">{isArabic ? 'سنوي' : 'Annual'}</SelectItem>
                </SelectContent>
              </Select>

              {selectedPeriod !== 'year' && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, index) => {
                      const month = String(index + 1).padStart(2, '0');
                      return (
                        <SelectItem key={month} value={month}>
                          {new Date(2024, index, 1).toLocaleDateString(isArabic ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'long' })}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2].map((offset) => {
                    const year = String(new Date().getFullYear() - offset);
                    return (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => {
            const isGenerating = generating === report.id;
            const feature = report.tier === 'pro' ? 'reports.full' : 'reports.basic';

            return (
              <motion.div key={report.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`h-full ${report.tier === 'pro' ? 'border-gold/30 bg-gradient-to-br from-gold/5 to-transparent' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`rounded-lg p-2 ${report.tier === 'pro' ? 'bg-gold/20 text-gold' : 'bg-muted text-muted-foreground'}`}>
                        {report.icon}
                      </div>
                      {report.tier === 'pro' && (
                        <Badge className="bg-gold text-navy-dark">
                          <Sparkles className="mr-1 h-3 w-3" />
                          PRO
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-3 text-lg">{report.name[isArabic ? 'ar' : 'en']}</CardTitle>
                    <CardDescription>{report.description[isArabic ? 'ar' : 'en']}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FeatureGate feature={feature}>
                      <Button className="w-full" variant={report.tier === 'pro' ? 'default' : 'outline'} onClick={() => handleGenerateReport(report.id)} disabled={isGenerating || !isSignedIn}>
                        {isGenerating ? (
                          <>
                            <FileDown className="mr-2 h-4 w-4 animate-pulse" />
                            {isArabic ? 'جاري الإنشاء...' : 'Generating...'}
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            {isArabic ? 'إنشاء التقرير' : 'Generate Report'}
                          </>
                        )}
                      </Button>
                    </FeatureGate>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? 'التقارير المُنشأة' : 'Generated Reports'}</CardTitle>
            <CardDescription>
              {isArabic
                ? 'زر المعاينة يفتح التقرير المحدد نفسه، وزر التنزيل ينزّل نفس النسخة.'
                : 'Review opens the specific generated report, and Download downloads that same file.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {visibleReports.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {isArabic ? 'لا توجد تقارير منشأة بعد.' : 'No generated reports yet.'}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleReports.map((report) => {
                  const reportType = reportTypes.find((item) => item.id === report.type);
                  return (
                    <div key={report.id} className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center">
                      <div className={`rounded-lg p-2 ${reportType?.tier === 'pro' ? 'bg-gold/20 text-gold' : 'bg-muted text-muted-foreground'}`}>
                        {reportType?.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{report.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {report.generatedAt}
                          {' • '}
                          {report.size}
                          {' • '}
                          {report.periodLabel}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            if (!isSignedIn) {
                              handleGenerateReport(report.type);
                              return;
                            }
                            setSelectedReportId(report.id);
                            setPreviewOpen(true);
                          }}
                          disabled={!isSignedIn}
                        >
                          <Eye className="h-4 w-4" />
                          {isArabic ? 'مراجعة' : 'Review'}
                        </Button>
                        <Button size="sm" className="gap-2" onClick={() => handleDownload(report)} disabled={!isSignedIn}>
                          <Download className="h-4 w-4" />
                          {isArabic ? 'تنزيل' : 'Download'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedReport?.name || (isArabic ? 'معاينة التقرير' : 'Report Preview')}</DialogTitle>
              <DialogDescription>{selectedReport?.summary}</DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {selectedReport.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-xl border bg-muted/40 p-4">
                      <div className="text-sm text-muted-foreground">{metric.label}</div>
                      <div className="mt-1 text-xl font-semibold">{metric.value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border p-4">
                  <div className="mb-2 text-sm font-medium">{isArabic ? 'محتوى التقرير' : 'Report Content'}</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{selectedReport.summary}</p>
                    {selectedReport.sections.map((section) => (
                      <p key={section}>{section}</p>
                    ))}
                    <p>{isArabic ? 'يتم تنزيل هذه النسخة كملف HTML قابل للطباعة والمشاركة.' : 'This exact version is downloaded as a printable HTML file.'}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              {selectedReport && (
                <Button className="gap-2" onClick={() => handleDownload(selectedReport)} disabled={!isSignedIn}>
                  <Download className="h-4 w-4" />
                  {isArabic ? 'تنزيل هذا التقرير' : 'Download This Report'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}

function buildReport({
  locale,
  userName,
  reportType,
  periodLabel,
  context,
}: {
  locale: 'ar' | 'en';
  userName: string;
  reportType: ReportType;
  periodLabel: string;
  context: ReportContext;
}): GeneratedReport {
  const isArabic = locale === 'ar';
  const generatedAt = new Date().toISOString().slice(0, 10);
  const content = buildReportContent(reportType.id, locale, context, periodLabel);
  const name = `${periodLabel} ${reportType.name[isArabic ? 'ar' : 'en']}`;
  const htmlContent = `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="UTF-8" />
    <title>${name}</title>
    <style>
      body { font-family: ${isArabic ? 'Tajawal, Arial, sans-serif' : 'Arial, sans-serif'}; padding: 40px; color: #14213d; background: #f8fafc; }
      .sheet { max-width: 860px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
      h1 { margin: 0 0 4px; }
      p { line-height: 1.7; }
      .muted { color: #64748b; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
      .metric { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fafafa; }
      .label { color: #64748b; font-size: 14px; margin-bottom: 8px; }
      .value { font-size: 22px; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <p class="muted">Wealix App</p>
      <h1>${name}</h1>
      <p class="muted">${userName} • ${generatedAt}</p>
      <p>${content.summary}</p>
      <div class="grid">
        ${content.metrics
          .map(
            (metric) => `
            <div class="metric">
              <div class="label">${metric.label}</div>
              <div class="value">${metric.value}</div>
            </div>
          `
          )
          .join('')}
      </div>
      <div>
        ${content.sections.map((section) => `<p>${section}</p>`).join('')}
      </div>
    </div>
  </body>
</html>`;

  return {
    id: createOpaqueId(`report-${reportType.id}`),
    type: reportType.id,
    name,
    generatedAt,
    size: `${(htmlContent.length / 1024).toFixed(0)} KB`,
    periodLabel,
    summary: content.summary,
    metrics: content.metrics,
    sections: content.sections,
    htmlContent,
  };
}

type ReportContext = {
  totalIncome: number;
  totalExpenses: number;
  portfolioValue: number;
  investedCost: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  savingsRate: number;
  assets: Array<{
    name: string;
    category: string;
    value: number;
  }>;
  liabilities: Array<{
    name: string;
    category: string;
    balance: number;
  }>;
  budgetLimits: Array<{
    category: string;
    limit: number;
  }>;
  holdings: Array<{
    ticker: string;
    name: string;
    shares: number;
    avgCost: number;
    currentPrice: number;
    sector: string;
  }>;
  incomeEntries: Array<{
    amount: number;
    source: string;
    sourceName: string;
    isRecurring: boolean;
  }>;
  expenseEntries: Array<{
    amount: number;
    category: string;
    description: string;
    merchantName?: string | null;
  }>;
  receiptScans: Array<{
    merchantName: string;
    amount: number;
    confidence: number;
  }>;
};

function buildReportContent(
  reportTypeId: string,
  locale: 'ar' | 'en',
  context: ReportContext,
  periodLabel: string
) {
  const isArabic = locale === 'ar';
  const holdingsCount = context.holdings.length;
  const portfolioPnL = context.portfolioValue - context.investedCost;
  const topHolding = [...context.holdings].sort(
    (a, b) => b.shares * b.currentPrice - a.shares * a.currentPrice
  )[0];
  const topExpenseCategory = Object.entries(
    context.expenseEntries.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])[0];
  const topIncomeSource = Object.entries(
    context.incomeEntries.reduce((acc, entry) => {
      const key = entry.sourceName || entry.source;
      acc[key] = (acc[key] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])[0];
  const recurringIncome = context.incomeEntries
    .filter((entry) => entry.isRecurring)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const averageExpense = context.expenseEntries.length > 0
    ? context.totalExpenses / context.expenseEntries.length
    : 0;
  const averageIncome = context.incomeEntries.length > 0
    ? context.totalIncome / context.incomeEntries.length
    : 0;
  const avgReceiptConfidence = context.receiptScans.length > 0
    ? context.receiptScans.reduce((sum, item) => sum + item.confidence, 0) / context.receiptScans.length
    : 0;
  const topAsset = [...context.assets].sort((a, b) => b.value - a.value)[0];
  const topLiability = [...context.liabilities].sort((a, b) => b.balance - a.balance)[0];
  const budgetCoverage = context.budgetLimits.length;
  const budgetTotal = context.budgetLimits.reduce((sum, item) => sum + item.limit, 0);
  const budgetVsSpendDelta = budgetTotal - context.totalExpenses;

  switch (reportTypeId) {
    case 'portfolio-report':
      return {
        summary: isArabic
          ? `هذا تقرير مخصص للمحفظة في ${periodLabel}. يركز على المراكز الحالية، الربح والخسارة غير المحققة، وأكبر تعرض داخل المحفظة.`
          : `This is a portfolio-specific report for ${periodLabel}. It focuses on current holdings, unrealized performance, and the largest exposures in the portfolio.`,
        metrics: [
          { label: isArabic ? 'قيمة المحفظة' : 'Portfolio Value', value: formatCurrency(context.portfolioValue, 'SAR', locale) },
          { label: isArabic ? 'التكلفة الإجمالية' : 'Cost Basis', value: formatCurrency(context.investedCost, 'SAR', locale) },
          { label: isArabic ? 'الربح/الخسارة' : 'Unrealized P&L', value: formatCurrency(portfolioPnL, 'SAR', locale) },
          { label: isArabic ? 'عدد المراكز' : 'Holdings Count', value: String(holdingsCount) },
        ],
        sections: [
          isArabic
            ? `أكبر مركز حالياً هو ${topHolding?.ticker || 'لا يوجد'} بقيمة تقريبية ${formatCurrency(topHolding ? topHolding.shares * topHolding.currentPrice : 0, 'SAR', locale)}.`
            : `The largest current position is ${topHolding?.ticker || 'none'} with an approximate market value of ${formatCurrency(topHolding ? topHolding.shares * topHolding.currentPrice : 0, 'SAR', locale)}.`,
          isArabic
            ? `يعتمد التقرير على بيانات شاشة المحفظة الحالية وليس على بيانات الميزانية أو المصروفات.`
            : `This report is tied to the current portfolio holdings data rather than budget or expense data.`,
        ],
      };
    case 'net-worth-report':
      return {
        summary: isArabic
          ? `هذا تقرير صافي الثروة لفترة ${periodLabel}. يعتمد مباشرة على الأصول والالتزامات الحالية المحفوظة في شاشة صافي الثروة بالإضافة إلى مكون المحفظة.`
          : `This is a net worth report for ${periodLabel}. It is tied directly to the current assets and liabilities saved in the net worth screen, plus the portfolio component.`,
        metrics: [
          { label: isArabic ? 'صافي الثروة' : 'Net Worth', value: formatCurrency(context.netWorth, 'SAR', locale) },
          { label: isArabic ? 'إجمالي الأصول' : 'Total Assets', value: formatCurrency(context.totalAssets, 'SAR', locale) },
          { label: isArabic ? 'إجمالي الالتزامات' : 'Total Liabilities', value: formatCurrency(context.totalLiabilities, 'SAR', locale) },
          { label: isArabic ? 'قيمة المحفظة' : 'Portfolio Component', value: formatCurrency(context.portfolioValue, 'SAR', locale) },
        ],
        sections: [
          isArabic
            ? `أكبر أصل مسجل حالياً هو ${topAsset?.name || 'لا يوجد'} بقيمة ${formatCurrency(topAsset?.value || 0, 'SAR', locale)}، وأكبر التزام هو ${topLiability?.name || 'لا يوجد'} بقيمة ${formatCurrency(topLiability?.balance || 0, 'SAR', locale)}.`
            : `The largest recorded asset is ${topAsset?.name || 'none'} at ${formatCurrency(topAsset?.value || 0, 'SAR', locale)}, while the largest liability is ${topLiability?.name || 'none'} at ${formatCurrency(topLiability?.balance || 0, 'SAR', locale)}.`,
          isArabic
            ? `هذا التقرير يستخدم مصدر بيانات مختلفاً عن تقرير الميزانية، لأنه لا يعتمد على بنود الصرف فقط بل على قائمة الأصول والالتزامات الفعلية.`
            : `This report uses a different source from the budget report because it is based on actual assets and liabilities, not only spending entries.`,
        ],
      };
    case 'income-report':
      return {
        summary: isArabic
          ? `هذا تقرير دخل لفترة ${periodLabel}. يراجع مصادر الدخل، الدخل المتكرر، ومتوسط قيمة الإدخالات.`
          : `This is an income report for ${periodLabel}. It reviews income sources, recurring income, and the average entry size.`,
        metrics: [
          { label: isArabic ? 'إجمالي الدخل' : 'Total Income', value: formatCurrency(context.totalIncome, 'SAR', locale) },
          { label: isArabic ? 'الدخل المتكرر' : 'Recurring Income', value: formatCurrency(recurringIncome, 'SAR', locale) },
          { label: isArabic ? 'متوسط الإدخال' : 'Average Entry', value: formatCurrency(averageIncome, 'SAR', locale) },
          { label: isArabic ? 'أكبر مصدر' : 'Top Source', value: topIncomeSource ? topIncomeSource[0] : (isArabic ? 'لا يوجد' : 'None') },
        ],
        sections: [
          isArabic
            ? `أكبر مصدر دخل مسجل هو ${topIncomeSource?.[0] || 'لا يوجد'} بإجمالي ${formatCurrency(topIncomeSource?.[1] || 0, 'SAR', locale)}.`
            : `The top recorded income source is ${topIncomeSource?.[0] || 'none'} with a total of ${formatCurrency(topIncomeSource?.[1] || 0, 'SAR', locale)}.`,
          isArabic
            ? `هذا التقرير يعتمد على إدخالات شاشة الدخل فقط ولا يعيد استخدام بيانات المصروفات أو المحفظة.`
            : `This report is sourced only from income entries and does not reuse the expense or portfolio datasets.`,
        ],
      };
    case 'expenses-report':
      return {
        summary: isArabic
          ? `هذا تقرير مصروفات لفترة ${periodLabel}. يركز على إجمالي الصرف، متوسط العملية، والتاجر أو الفئة الأكثر ظهوراً.`
          : `This is an expenses report for ${periodLabel}. It focuses on total spending, average ticket size, and the most visible category or merchant pattern.`,
        metrics: [
          { label: isArabic ? 'إجمالي المصروفات' : 'Total Expenses', value: formatCurrency(context.totalExpenses, 'SAR', locale) },
          { label: isArabic ? 'عدد العمليات' : 'Expense Entries', value: String(context.expenseEntries.length) },
          { label: isArabic ? 'متوسط العملية' : 'Average Expense', value: formatCurrency(averageExpense, 'SAR', locale) },
          { label: isArabic ? 'أعلى فئة' : 'Top Category', value: topExpenseCategory ? topExpenseCategory[0] : (isArabic ? 'لا يوجد' : 'None') },
        ],
        sections: [
          isArabic
            ? `الفئة الأعلى إنفاقاً هي ${topExpenseCategory?.[0] || 'لا يوجد'} بإجمالي ${formatCurrency(topExpenseCategory?.[1] || 0, 'SAR', locale)}.`
            : `The highest-spend category is ${topExpenseCategory?.[0] || 'none'} with a total of ${formatCurrency(topExpenseCategory?.[1] || 0, 'SAR', locale)}.`,
          isArabic
            ? `متوسط ثقة OCR للإيصالات الممسوحة هو ${avgReceiptConfidence.toFixed(1)}% عند توفر إيصالات محفوظة.`
            : `Average OCR confidence across saved scanned receipts is ${avgReceiptConfidence.toFixed(1)}% when receipt data exists.`,
        ],
      };
    case 'budget-report':
      return {
        summary: isArabic
          ? `هذا تقرير ميزانية لفترة ${periodLabel}. يعتمد على حدود الميزانية الحالية بالإضافة إلى الدخل والمصروفات خلال الفترة المحددة.`
          : `This is a budget report for ${periodLabel}. It is built from the current budget limits plus income and expense entries during the selected period.`,
        metrics: [
          { label: isArabic ? 'الدخل' : 'Income', value: formatCurrency(context.totalIncome, 'SAR', locale) },
          { label: isArabic ? 'المصروفات' : 'Expenses', value: formatCurrency(context.totalExpenses, 'SAR', locale) },
          { label: isArabic ? 'معدل الادخار' : 'Savings Rate', value: `${context.savingsRate.toFixed(1)}%` },
          { label: isArabic ? 'الفئات المفعلة' : 'Budget Categories', value: String(budgetCoverage) },
        ],
        sections: [
          isArabic
            ? `إجمالي حدود الميزانية الحالية هو ${formatCurrency(budgetTotal, 'SAR', locale)} مقابل إنفاق فعلي قدره ${formatCurrency(context.totalExpenses, 'SAR', locale)}.`
            : `Current configured budget capacity is ${formatCurrency(budgetTotal, 'SAR', locale)} against actual spending of ${formatCurrency(context.totalExpenses, 'SAR', locale)}.`,
          isArabic
            ? budgetVsSpendDelta >= 0
              ? `الفترة الحالية ضمن حدود الميزانية بفارق ${formatCurrency(budgetVsSpendDelta, 'SAR', locale)}.`
              : `تم تجاوز حدود الميزانية الحالية بمقدار ${formatCurrency(Math.abs(budgetVsSpendDelta), 'SAR', locale)}.`
            : budgetVsSpendDelta >= 0
              ? `The current period is under the configured budget by ${formatCurrency(budgetVsSpendDelta, 'SAR', locale)}.`
              : `The current period is over the configured budget by ${formatCurrency(Math.abs(budgetVsSpendDelta), 'SAR', locale)}.`,
        ],
      };
    case 'fire-report':
      return {
        summary: isArabic
          ? `هذا تقرير FIRE لفترة ${periodLabel}. يعتمد على سرعة الادخار وصافي الثروة الحالي لتقدير الجاهزية للاستقلال المالي.`
          : `This is a FIRE report for ${periodLabel}. It uses savings velocity and current net worth to estimate readiness for financial independence.`,
        metrics: [
          { label: isArabic ? 'معدل الادخار' : 'Savings Rate', value: `${context.savingsRate.toFixed(1)}%` },
          { label: isArabic ? 'صافي الثروة' : 'Net Worth', value: formatCurrency(context.netWorth, 'SAR', locale) },
          { label: isArabic ? 'الدخل' : 'Income', value: formatCurrency(context.totalIncome, 'SAR', locale) },
          { label: isArabic ? 'المصروفات' : 'Expenses', value: formatCurrency(context.totalExpenses, 'SAR', locale) },
        ],
        sections: [
          isArabic
            ? `كلما ارتفع معدل الادخار الحالي وتحسن صافي الثروة، اقتربت الجاهزية لـ FIRE.`
            : `As current savings rate and net worth improve, FIRE readiness becomes stronger.`,
          isArabic
            ? `هذا التقرير يرتبط مباشرة بالتدفق النقدي وصافي الثروة، وليس فقط بالمحفظة أو المصروفات منفردة.`
            : `This report is tied directly to cash flow and net worth, not just portfolio or expenses in isolation.`,
        ],
      };
    case 'annual-review':
      return {
        summary: isArabic
          ? `هذه مراجعة مالية شاملة لفترة ${periodLabel}. تجمع بين الدخل والمصروفات والمحفظة وصافي الثروة في تقرير واحد.`
          : `This is a full annual-style review for ${periodLabel}. It combines income, expenses, portfolio, and net worth into one report.`,
        metrics: [
          { label: isArabic ? 'صافي الثروة' : 'Net Worth', value: formatCurrency(context.netWorth, 'SAR', locale) },
          { label: isArabic ? 'الدخل' : 'Income', value: formatCurrency(context.totalIncome, 'SAR', locale) },
          { label: isArabic ? 'المصروفات' : 'Expenses', value: formatCurrency(context.totalExpenses, 'SAR', locale) },
          { label: isArabic ? 'قيمة المحفظة' : 'Portfolio Value', value: formatCurrency(context.portfolioValue, 'SAR', locale) },
        ],
        sections: [
          isArabic
            ? `هذا التقرير هو الأكثر شمولاً لأنه يجمع مصادر البيانات المختلفة في Wealix.`
            : `This is the broadest report because it combines the different data sources available in Wealix.`,
          isArabic
            ? `يمكن استخدامه كمراجعة عليا، بينما تبقى تقارير الدخل والمصروفات والميزانية والمحفظة أكثر تخصصاً.`
            : `Use it as a high-level review, while the income, expenses, budget, and portfolio reports remain more specialized.`,
        ],
      };
    default:
      return {
        summary: isArabic
          ? `هذا ملخص مالي شهري لفترة ${periodLabel}. يجمع الوضع العام دون الدخول في تخصص تقرير المحفظة أو الميزانية أو المصروفات.`
          : `This is a monthly financial summary for ${periodLabel}. It provides an overall view without going as deep as the specialized portfolio, budget, or expenses reports.`,
        metrics: [
          { label: isArabic ? 'صافي الثروة' : 'Net Worth', value: formatCurrency(context.netWorth, 'SAR', locale) },
          { label: isArabic ? 'الدخل' : 'Income', value: formatCurrency(context.totalIncome, 'SAR', locale) },
          { label: isArabic ? 'المصروفات' : 'Expenses', value: formatCurrency(context.totalExpenses, 'SAR', locale) },
          { label: isArabic ? 'معدل الادخار' : 'Savings Rate', value: `${context.savingsRate.toFixed(1)}%` },
        ],
        sections: [
          isArabic
            ? `يوفر هذا التقرير نظرة عامة متوازنة على الوضع المالي بدلاً من التركيز على مجال واحد فقط.`
            : `This report provides a balanced overview of the financial picture instead of focusing on one area only.`,
          isArabic
            ? `لتحليل أكثر تخصصاً، استخدم تقارير الدخل أو المصروفات أو الميزانية أو المحفظة.`
            : `For more specialized analysis, use the income, expenses, budget, or portfolio reports.`,
        ],
      };
  }
}
