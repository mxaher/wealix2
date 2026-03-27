'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Bot,
  CalendarDays,
  FileSpreadsheet,
  Filter,
  Lightbulb,
  PauseCircle,
  Plus,
  RefreshCw,
  Scissors,
  Sparkles,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardShell } from '@/components/layout';
import { StatCard, FeatureGate, formatCurrency } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  useAppStore,
  formatNumber,
  type PortfolioExchange,
  type PortfolioHolding,
  type PortfolioAnalysisAction,
} from '@/store/useAppStore';

type FxRateMap = Partial<Record<'USD_SAR' | 'EGP_SAR', {
  symbol: string;
  rate: number;
  datetime: string | null;
  source: string;
}>>;

type MarketRefreshMeta = {
  updatedAt: string | null;
  sources: string[];
  fxRates: FxRateMap;
};

const exchangeColors: Record<string, string> = {
  TASI: '#D4A843',
  EGX: '#10B981',
  NASDAQ: '#3B82F6',
  NYSE: '#8B5CF6',
};

const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_SPREADSHEET_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);
const REQUIRED_IMPORT_COLUMNS = ['ticker', 'shares', 'avgcost'];

function getAnalysisActionMeta(actionType: string, isArabic: boolean) {
  switch (actionType) {
    case 'buy_more':
      return {
        label: isArabic ? 'زيادة' : 'Buy More',
        icon: TrendingUp,
        wrapperClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      };
    case 'trim':
      return {
        label: isArabic ? 'تخفيف' : 'Trim',
        icon: Scissors,
        wrapperClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      };
    case 'reduce':
      return {
        label: isArabic ? 'تقليص' : 'Reduce',
        icon: TrendingDown,
        wrapperClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      };
    case 'new_idea':
      return {
        label: isArabic ? 'فكرة جديدة' : 'New Idea',
        icon: Lightbulb,
        wrapperClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      };
    case 'hold':
    default:
      return {
        label: isArabic ? 'احتفاظ' : 'Hold',
        icon: PauseCircle,
        wrapperClass: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
      };
  }
}

function assertSpreadsheetFile(file: File, bytes: Uint8Array) {
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error('Portfolio import files must be 2MB or smaller.');
  }

  if (!ACCEPTED_SPREADSHEET_TYPES.has(file.type) && !/\.xlsx?$|\.csv$/i.test(file.name)) {
    throw new Error('Upload a valid XLSX, XLS, or CSV portfolio file.');
  }

  const isZipXlsx =
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;
  const isCsv = new TextDecoder().decode(bytes.slice(0, 128)).includes(',');

  if (!isZipXlsx && !isCsv) {
    throw new Error('The uploaded spreadsheet does not match a valid XLSX or CSV file signature.');
  }
}

export default function PortfolioPage() {
  const {
    locale,
    appMode,
    shariahFilterEnabled,
    toggleShariahFilter,
    selectedExchange,
    setSelectedExchange,
    portfolioHoldings,
    portfolioAnalysisHistory,
    addPortfolioAnalysisRecord,
    deletePortfolioAnalysisRecord,
    addPortfolioHolding,
    deletePortfolioHolding,
    replacePortfolioHoldings,
  } = useAppStore();
  const isArabic = locale === 'ar';
  const { isSignedIn } = useUser();

  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [analysisPulse, setAnalysisPulse] = useState(0);
  const [marketRefreshMeta, setMarketRefreshMeta] = useState<MarketRefreshMeta>({
    updatedAt: null,
    sources: [],
    fxRates: {},
  });
  const [newHolding, setNewHolding] = useState({
    ticker: '',
    name: '',
    exchange: 'TASI',
    shares: '',
    avgCost: '',
    isShariah: true,
  });

  const holdings = portfolioHoldings;
  const latestAnalysis = portfolioAnalysisHistory[0] ?? null;
  const analysisStages = isArabic
    ? ['جمع بيانات المحفظة', 'قراءة التركز والمخاطر', 'بناء التوصيات']
    : ['Collecting portfolio context', 'Reading concentration and risk', 'Building recommendations'];

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisPulse(0);
      return;
    }

    const interval = window.setInterval(() => {
      setAnalysisPulse((current) => (current + 1) % analysisStages.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [analysisStages.length, isAnalyzing]);

  const normalizeSaudiTicker = (ticker: string) => ticker.trim().toUpperCase().replace(/\.SR$/i, '');
  const getHoldingCurrency = (exchange: PortfolioExchange) => {
    if (exchange === 'TASI') return 'SAR';
    if (exchange === 'EGX') return 'EGP';
    return 'USD';
  };

  const getFxPairForHolding = (exchange: PortfolioExchange) => {
    if (exchange === 'EGX') return 'EGP_SAR';
    if (exchange === 'NASDAQ' || exchange === 'NYSE') return 'USD_SAR';
    return null;
  };

  const getConvertedSarValue = (value: number, exchange: PortfolioExchange) => {
    if (exchange === 'TASI') {
      return {
        value,
        rateLabel: null,
        timestamp: null,
        status: 'LIVE',
      };
    }

    const pair = getFxPairForHolding(exchange);
    const fxRate = pair ? marketRefreshMeta.fxRates[pair] : null;
    if (!fxRate?.rate) {
      return null;
    }

    return {
      value: value * fxRate.rate,
      rateLabel: `1 ${getHoldingCurrency(exchange)} = ${fxRate.rate.toFixed(4)} SAR`,
      timestamp: fxRate.datetime,
      status: exchange === 'EGX' ? 'EOD FX' : 'LIVE FX',
    };
  };

  const filteredHoldings = holdings.filter((holding) => {
    const matchesExchange = selectedExchange === 'all' || holding.exchange === selectedExchange;
    const matchesShariah = !shariahFilterEnabled || holding.isShariah;
    return matchesExchange && matchesShariah;
  });

  const totalValue = filteredHoldings.reduce((sum, holding) => {
    const baseValue = holding.shares * holding.currentPrice;
    const converted = getConvertedSarValue(baseValue, holding.exchange);
    return sum + (converted?.value ?? (holding.exchange === 'TASI' ? baseValue : 0));
  }, 0);
  const totalCost = filteredHoldings.reduce((sum, holding) => {
    const baseValue = holding.shares * holding.avgCost;
    const converted = getConvertedSarValue(baseValue, holding.exchange);
    return sum + (converted?.value ?? (holding.exchange === 'TASI' ? baseValue : 0));
  }, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  const exchangeChartData = Object.entries(
    holdings.reduce((acc, holding) => {
      acc[holding.exchange] = (acc[holding.exchange] || 0) + holding.shares * holding.currentPrice;
      return acc;
    }, {} as Record<string, number>)
  ).map(([exchange, value]) => ({
    name: exchange,
    value,
    color: exchangeColors[exchange] || '#6B7280',
  }));

  const sectorChartData = Object.entries(
    holdings.reduce((acc, holding) => {
      acc[holding.sector] = (acc[holding.sector] || 0) + holding.shares * holding.currentPrice;
      return acc;
    }, {} as Record<string, number>)
  ).map(([sector, value]) => ({
    name: sector,
    value,
  }));

  const handleAddHolding = () => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic
          ? 'يمكن للضيف تصفح المحفظة التجريبية فقط.'
          : 'Guests can browse the demo portfolio only.',
      });
      return;
    }

    if (!newHolding.ticker || !newHolding.shares || !newHolding.avgCost) {
      return;
    }

    addPortfolioHolding({
      id: Date.now().toString(),
      ticker: newHolding.ticker.toUpperCase(),
      name: newHolding.name || newHolding.ticker.toUpperCase(),
      exchange: newHolding.exchange as PortfolioExchange,
      shares: parseFloat(newHolding.shares),
      avgCost: parseFloat(newHolding.avgCost),
      currentPrice: parseFloat(newHolding.avgCost) * 1.05,
      sector: 'Other',
      isShariah: newHolding.isShariah,
    });

    setNewHolding({ ticker: '', name: '', exchange: 'TASI', shares: '', avgCost: '', isShariah: true });
    setShowAddHolding(false);
    toast({
      title: isArabic ? 'تم تحديث المركز' : 'Holding updated',
      description: isArabic
        ? 'إذا كان الرمز موجوداً مسبقاً، تم دمج الكمية وتحديث متوسط التكلفة.'
        : 'If the holding already existed, shares were merged and the average cost was updated.',
    });
  };

  const handleImportPortfolio = async (file: File | null) => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic ? 'تسجيل الدخول مطلوب لاستيراد المحفظة.' : 'Sign in is required to import the portfolio.',
      });
      return;
    }

    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      assertSpreadsheetFile(file, bytes);

      const workbook = XLSX.read(buffer, {
        type: 'array',
        bookVBA: true,
        cellFormula: true,
        bookFiles: true,
      });

      const workbookWithFiles = workbook as typeof workbook & {
        vbaraw?: unknown;
        files?: Record<string, unknown>;
      };
      const workbookFiles = Object.keys(workbookWithFiles.files ?? {});
      const hasExternalLinks = workbookFiles.some((entry) => entry.startsWith('xl/externalLinks/'));
      const hasMacros = Boolean(workbookWithFiles.vbaraw) || workbookFiles.includes('xl/vbaProject.bin');

      if (hasMacros || hasExternalLinks) {
        throw new Error(
          isArabic
            ? 'الملف يحتوي على ماكرو أو روابط خارجية غير مدعومة.'
            : 'This spreadsheet contains macros or external links and cannot be imported.'
        );
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetHasFormulas = Object.entries(sheet).some(([key, cell]) => {
        if (key.startsWith('!') || typeof cell !== 'object' || !cell) {
          return false;
        }

        return 'f' in cell;
      });

      if (sheetHasFormulas) {
        throw new Error(
          isArabic
            ? 'أزل الصيغ الحسابية من الملف قبل الاستيراد.'
            : 'Remove spreadsheet formulas before importing this file.'
        );
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const headers = rows.length > 0 ? Object.keys(rows[0]).map((header) => header.replace(/[\s_]+/g, '').toLowerCase()) : [];
      const missingColumns = REQUIRED_IMPORT_COLUMNS.filter((column) => !headers.includes(column));

      if (missingColumns.length > 0) {
        throw new Error(
          isArabic
            ? `الملف ينقصه أعمدة مطلوبة: ${missingColumns.join(', ')}`
            : `The file is missing required columns: ${missingColumns.join(', ')}`
        );
      }

      const imported = rows
        .map((row, index) => {
          const ticker = String(row.ticker || row.Ticker || '').trim().toUpperCase();
          const name = String(row.name || row.Name || ticker).trim();
          const exchange = String(row.exchange || row.Exchange || 'TASI').trim().toUpperCase() as PortfolioExchange;
          const shares = Number(row.shares || row.Shares || 0);
          const avgCost = Number(row.avgCost || row['Avg Cost'] || row.avg_cost || 0);
          const currentPrice = Number(row.currentPrice || row['Current Price'] || row.current_price || avgCost);
          const sector = String(row.sector || row.Sector || 'Other').trim();
          const shariah = String(row.isShariah || row.Shariah || row.shariah || 'true').trim().toLowerCase();

          if (!ticker || !shares || !avgCost) {
            throw new Error(
              isArabic
                ? `الصف ${index + 2} يحتوي على بيانات ناقصة أو غير صالحة.`
                : `Row ${index + 2} contains incomplete or invalid holding data.`
            );
          }

          return {
            id: `import-${Date.now()}-${index}`,
            ticker,
            name,
            exchange: ['TASI', 'EGX', 'NASDAQ', 'NYSE'].includes(exchange) ? exchange : 'TASI',
            shares,
            avgCost,
            currentPrice: currentPrice || avgCost,
            sector: sector || 'Other',
            isShariah: ['true', 'yes', '1'].includes(shariah),
          } satisfies PortfolioHolding;
        })
        .filter((holding): holding is PortfolioHolding => Boolean(holding));

      if (imported.length === 0) {
        throw new Error(isArabic ? 'لم يتم العثور على بيانات صالحة في الملف.' : 'No valid holdings were found in the file.');
      }

      replacePortfolioHoldings(imported);
      toast({
        title: isArabic ? 'تم استيراد المحفظة' : 'Portfolio imported',
        description: isArabic
          ? `تم استيراد ${imported.length} مركزاً من ملف الإكسل.`
          : `Imported ${imported.length} holdings from the Excel file.`,
      });
    } catch (error) {
      toast({
        title: isArabic ? 'فشل استيراد الملف' : 'Import failed',
        description: error instanceof Error ? error.message : 'Could not import the file.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAnalyzePortfolio = async () => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic ? 'تسجيل الدخول مطلوب لتحليل المحفظة.' : 'Sign in is required to analyze the portfolio.',
      });
      return;
    }

    if (holdings.length === 0) {
      toast({
        title: isArabic ? 'المحفظة فارغة' : 'Portfolio is empty',
        description: isArabic
          ? 'أضف أو استورد مراكز أولاً قبل تشغيل التحليل.'
          : 'Add or import holdings first before running analysis.',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings, locale }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze portfolio.');
      }
      addPortfolioAnalysisRecord({
        id: `analysis-${Date.now()}`,
        createdAt: new Date().toISOString(),
        summary: data.summary || '',
        actions: Array.isArray(data.actions) ? data.actions as PortfolioAnalysisAction[] : [],
      });
      toast({
        title: isArabic ? 'اكتمل تحليل المحفظة' : 'Portfolio analysis ready',
        description: isArabic
          ? 'تم حفظ التحليل الجديد أسفل جدول المراكز.'
          : 'The new analysis was saved under your holdings table.',
      });
    } catch (error) {
      toast({
        title: isArabic ? 'فشل التحليل' : 'Analysis failed',
        description: error instanceof Error ? error.message : 'Could not analyze the portfolio.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefreshAllPrices = async () => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب حساباً' : 'Account required',
        description: isArabic ? 'تسجيل الدخول مطلوب لتحديث الأسعار الحية.' : 'Sign in is required to refresh live prices.',
      });
      return;
    }

    const saudiHoldings = holdings.filter((holding) => holding.exchange === 'TASI');
    const nonSaudiHoldings = holdings.filter((holding) => ['EGX', 'NASDAQ', 'NYSE'].includes(holding.exchange));

    if (saudiHoldings.length === 0) {
      toast({
        title: isArabic ? 'لا توجد أسهم سعودية لتحديثها' : 'No Saudi holdings to refresh',
        description: isArabic
          ? 'حالياً يتم تحديث السوق السعودي فقط عبر SAHMK. أضف مركزاً من تداول أولاً.'
          : 'Only Saudi holdings are refreshed right now through SAHMK. Add a TASI holding first.',
      });
      return;
    }

    setIsRefreshingPrices(true);
    try {
      const response = await fetch('/api/market/saudi/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: saudiHoldings.map((holding) => normalizeSaudiTicker(holding.ticker)),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to refresh Saudi prices.');
      }

      const quotes = data.quotes ?? {};
      const nextHoldings = holdings.map((holding) => {
        if (holding.exchange !== 'TASI') {
          return holding;
        }

        const match = quotes[normalizeSaudiTicker(holding.ticker)];
        if (!match || !match.price) {
          return holding;
        }

        return {
          ...holding,
          ticker: holding.ticker.toUpperCase(),
          name: isArabic ? (match.nameAr || holding.name) : (match.nameEn || holding.name),
          currentPrice: Number(match.price),
        };
      });

      replacePortfolioHoldings(nextHoldings);
      setMarketRefreshMeta({
        updatedAt: new Date().toISOString(),
        sources: ['SAHMK'],
        fxRates: {},
      });

      toast({
        title: isArabic ? 'تم تحديث الأسعار' : 'Prices refreshed',
        description: isArabic
          ? `تم تحديث ${formatNumber(saudiHoldings.length, locale)} سهم سعودي عبر SAHMK.${nonSaudiHoldings.length > 0 ? ` وتم ترك ${formatNumber(nonSaudiHoldings.length, locale)} مركز غير سعودي بدون تحديث حالياً.` : ''}`
          : `Updated ${formatNumber(saudiHoldings.length, locale)} Saudi holdings via SAHMK.${nonSaudiHoldings.length > 0 ? ` Left ${formatNumber(nonSaudiHoldings.length, locale)} non-Saudi holdings unchanged for now.` : ''}`,
      });
    } catch (error) {
      toast({
        title: isArabic ? 'فشل تحديث الأسعار' : 'Price refresh failed',
        description: error instanceof Error ? error.message : 'Could not refresh prices.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {!isSignedIn && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {isArabic
                ? 'الضيف يستطيع استعراض المحفظة التجريبية فقط. الإضافة والاستيراد والتحليل تتطلب حساباً.'
                : 'Guests can browse the demo portfolio only. Adding, importing, and analysis require an account.'}
            </CardContent>
          </Card>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'المحفظة الاستثمارية' : 'Investment Portfolio'}</h1>
            <p className="text-muted-foreground">
              {isArabic
                ? 'استيراد ملف إكسل وتحليل المحفظة الحالية وتوصيات شراء أو تقليل أو احتفاظ.'
                : 'Import an Excel file, analyze the current portfolio, and get buy, trim, or hold guidance.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={!isSignedIn || isRefreshingPrices}
              onClick={handleRefreshAllPrices}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingPrices ? 'animate-spin' : ''}`} />
              {isRefreshingPrices
                ? (isArabic ? 'جارٍ التحديث...' : 'Refreshing...')
                : (isArabic ? 'تحديث أسعار السوق' : 'Refresh Market Prices')}
            </Button>

            <Dialog open={showAddHolding} onOpenChange={setShowAddHolding}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={!isSignedIn}>
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'إضافة مركز' : 'Add Holding'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'إضافة سهم جديد' : 'Add New Holding'}</DialogTitle>
                  <DialogDescription>
                    {isArabic ? 'أضف سهماً جديداً إلى محفظتك' : 'Add a new stock to your portfolio'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'الرمز' : 'Ticker'}</Label>
                      <Input
                        value={newHolding.ticker}
                        onChange={(e) => setNewHolding({ ...newHolding, ticker: e.target.value.toUpperCase() })}
                        placeholder="2222.SR"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'البورصة' : 'Exchange'}</Label>
                      <Select value={newHolding.exchange} onValueChange={(value) => setNewHolding({ ...newHolding, exchange: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TASI">TASI</SelectItem>
                          <SelectItem value="EGX">EGX</SelectItem>
                          <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                          <SelectItem value="NYSE">NYSE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'اسم الشركة' : 'Company Name'}</Label>
                    <Input
                      value={newHolding.name}
                      onChange={(e) => setNewHolding({ ...newHolding, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'عدد الأسهم' : 'Shares'}</Label>
                      <Input
                        type="number"
                        value={newHolding.shares}
                        onChange={(e) => setNewHolding({ ...newHolding, shares: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'متوسط التكلفة' : 'Avg Cost'}</Label>
                      <Input
                        type="number"
                        value={newHolding.avgCost}
                        onChange={(e) => setNewHolding({ ...newHolding, avgCost: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newHolding.isShariah}
                      onCheckedChange={(checked) => setNewHolding({ ...newHolding, isShariah: checked })}
                    />
                    <Label className="font-normal">
                      {isArabic ? 'متوافق مع الشريعة الإسلامية' : 'Shariah Compliant'}
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddHolding(false)}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleAddHolding} disabled={!isSignedIn}>
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={!isSignedIn || isImporting}>
                  <Upload className="w-4 h-4" />
                  {isImporting ? (isArabic ? 'جارٍ الاستيراد...' : 'Importing...') : (isArabic ? 'استيراد المراكز' : 'Import Holdings')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'استيراد المراكز' : 'Import Holdings'}</DialogTitle>
                  <DialogDescription>
                    {isArabic
                      ? 'ارفع ملف XLSX أو CSV لاستبدال المراكز الحالية، ويمكنك تنزيل الملف النموذجي أولاً.'
                      : 'Upload an XLSX or CSV file to replace the current holdings. You can download the sample file first.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Button asChild variant="secondary" className="w-full gap-2">
                    <a href="/samples/wealix-portfolio-import-sample.xlsx" download>
                      <FileSpreadsheet className="w-4 h-4" />
                      {isArabic ? 'تنزيل الملف النموذجي' : 'Download Sample File'}
                    </a>
                  </Button>

                  <label className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center ${!isSignedIn ? 'pointer-events-none opacity-70' : ''}`}>
                    <Upload className="mb-3 h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {isArabic ? 'اختر ملف المراكز من جهازك' : 'Choose a holdings file from your device'}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {isArabic ? 'يدعم XLSX و XLS و CSV' : 'Supports XLSX, XLS, and CSV'}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={async (e) => {
                        await handleImportPortfolio(e.target.files?.[0] ?? null);
                        e.currentTarget.value = '';
                        setShowImportDialog(false);
                      }}
                    />
                  </label>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
          <StatCard
            title={isArabic ? 'القيمة الإجمالية' : 'Total Value'}
            value={formatCurrency(totalValue, 'SAR', locale)}
            icon={Briefcase}
            iconColor="text-gold bg-gold/10"
          />
          <StatCard
            title={isArabic ? 'إجمالي الاستثمار' : 'Total Invested'}
            value={formatCurrency(totalCost, 'SAR', locale)}
            icon={TrendingUp}
            iconColor="text-blue-500 bg-blue-500/10"
          />
          <StatCard
            title={isArabic ? 'الربح/الخسارة' : 'Unrealized P&L'}
            value={formatCurrency(totalGainLoss, 'SAR', locale)}
            change={totalGainLossPercent}
            icon={totalGainLoss >= 0 ? TrendingUp : TrendingDown}
            iconColor={totalGainLoss >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}
          />
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'متوافق مع الشريعة' : 'Shariah Compliant'}</p>
                  <p className="text-2xl font-bold">
                    {holdings.length > 0 ? ((holdings.filter((holding) => holding.isShariah).length / holdings.length) * 100).toFixed(0) : '0'}%
                  </p>
                </div>
                <div className="w-16 h-16">
                  <PieChart>
                    <Pie
                      data={[
                        { value: holdings.filter((holding) => holding.isShariah).length, color: '#10B981' },
                        { value: holdings.filter((holding) => !holding.isShariah).length, color: '#6B7280' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={30}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#6B7280" />
                    </Pie>
                  </PieChart>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row">
          <Select value={selectedExchange} onValueChange={setSelectedExchange}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 w-4 h-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? 'جميع البورصات' : 'All Exchanges'}</SelectItem>
              <SelectItem value="TASI">TASI</SelectItem>
              <SelectItem value="EGX">EGX</SelectItem>
              <SelectItem value="NASDAQ">NASDAQ</SelectItem>
              <SelectItem value="NYSE">NYSE</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
            <Switch checked={shariahFilterEnabled} onCheckedChange={toggleShariahFilter} />
            <span className="text-sm">{isArabic ? 'الشريعة فقط' : 'Shariah Only'}</span>
          </div>
          </div>

          <FeatureGate feature="portfolio.ai_analysis">
            <Button
              className="gap-2 bg-primary hover:bg-primary/90 lg:self-end"
              onClick={handleAnalyzePortfolio}
              disabled={!isSignedIn || isAnalyzing}
            >
              <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              {isAnalyzing
                ? (isArabic ? 'جاري التحليل...' : 'Analyzing...')
                : (isArabic ? 'تحليل المحفظة' : 'Analyze Portfolio')}
            </Button>
          </FeatureGate>
        </div>

        <Tabs defaultValue="holdings" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-auto min-w-full flex-nowrap items-stretch gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-sm sm:grid sm:w-full sm:grid-cols-2">
              <TabsTrigger
                value="holdings"
                className="min-w-[150px] flex-none rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
              {isArabic ? 'الممتلكات' : 'Holdings'}
              </TabsTrigger>
              <TabsTrigger
                value="allocation"
                className="min-w-[150px] flex-none rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
              {isArabic ? 'التوزيع' : 'Allocation'}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="holdings" className="mt-0">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-0">
                <ScrollArea className="h-[520px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isArabic ? 'الرمز' : 'Ticker'}</TableHead>
                        <TableHead>{isArabic ? 'الاسم' : 'Name'}</TableHead>
                        <TableHead>{isArabic ? 'البورصة' : 'Exchange'}</TableHead>
                        <TableHead className="text-right">{isArabic ? 'الأسهم' : 'Shares'}</TableHead>
                        <TableHead className="text-right">{isArabic ? 'متوسط التكلفة' : 'Avg Cost'}</TableHead>
                        <TableHead className="text-right">{isArabic ? 'السعر الحالي' : 'Current'}</TableHead>
                        <TableHead className="text-right">{isArabic ? 'القيمة السوقية' : 'Market Value'}</TableHead>
                        <TableHead className="text-right">{isArabic ? 'الربح/الخسارة' : 'P&L'}</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHoldings.map((holding) => {
                        const marketValue = holding.shares * holding.currentPrice;
                        const costBasis = holding.shares * holding.avgCost;
                        const gainLoss = marketValue - costBasis;
                        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                        const holdingCurrency = getHoldingCurrency(holding.exchange);
                        const convertedMarketValue = getConvertedSarValue(marketValue, holding.exchange);

                        return (
                          <TableRow key={holding.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{holding.ticker}</span>
                                {holding.isShariah && (
                                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                    {isArabic ? 'شريعة' : 'Shariah'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{holding.name}</TableCell>
                            <TableCell>
                              <Badge style={{ backgroundColor: `${exchangeColors[holding.exchange]}20`, color: exchangeColors[holding.exchange] }}>
                                {holding.exchange}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(holding.shares, locale)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(holding.avgCost, holdingCurrency, locale)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(holding.currentPrice, holdingCurrency, locale)}</TableCell>
                            <TableCell className="text-right font-medium">
                              <div>{formatCurrency(marketValue, holdingCurrency, locale)}</div>
                              {convertedMarketValue && holding.exchange !== 'TASI' ? (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {formatCurrency(convertedMarketValue.value, 'SAR', locale)}
                                </div>
                              ) : holding.exchange !== 'TASI' ? (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {isArabic ? 'غير محوّل إلى SAR بعد' : 'Unconverted to SAR'}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className={gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                <div className="flex items-center justify-end gap-1">
                                  {gainLoss >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  {formatCurrency(Math.abs(gainLoss), holdingCurrency, locale)}
                                </div>
                                <span className="text-xs">
                                  {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600" onClick={() => isSignedIn && deletePortfolioHolding(holding.id)} disabled={!isSignedIn}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
                <CardHeader className="border-b border-border/70 bg-secondary/30">
                  <div dir={isArabic ? 'rtl' : 'ltr'} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className={`space-y-1 ${isArabic ? 'text-right' : ''}`}>
                      <CardTitle className={`flex items-center gap-2 ${isArabic ? 'justify-start' : ''}`}>
                        <Bot className="h-5 w-5 text-primary" />
                        {isArabic ? 'مساعد تحليل المحفظة' : 'Portfolio AI Desk'}
                      </CardTitle>
                      <CardDescription>
                        {isArabic
                          ? 'تحليل محفوظ يمكن الرجوع إليه لاحقاً مع توصيات قابلة للمراجعة والحذف.'
                          : 'Saved analysis snapshots you can revisit, keep as reference, or remove later.'}
                      </CardDescription>
                    </div>
                    <FeatureGate feature="portfolio.ai_analysis">
                      <Button className="gap-2" onClick={handleAnalyzePortfolio} disabled={!isSignedIn || isAnalyzing}>
                        <Sparkles className={`h-4 w-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                        {isAnalyzing
                          ? (isArabic ? 'جاري بناء التحليل...' : 'Building analysis...')
                          : (isArabic ? 'إنشاء تحليل جديد' : 'Generate New Analysis')}
                      </Button>
                    </FeatureGate>
                  </div>
                </CardHeader>
                <CardContent dir={isArabic ? 'rtl' : 'ltr'} className="space-y-5 p-5">
                  <AnimatePresence initial={false}>
                    {isAnalyzing && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-background to-accent/10 p-5"
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
                        />
                        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className={`space-y-2 ${isArabic ? 'text-right' : ''}`}>
                            <p className="text-sm font-semibold text-foreground">
                              {isArabic ? 'الذكاء الاصطناعي يراجع مكونات المحفظة الآن' : 'AI is reviewing your portfolio composition now'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {analysisStages[analysisPulse]}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {analysisStages.map((stage, index) => (
                              <motion.span
                                key={stage}
                                className="h-2.5 w-14 rounded-full bg-border"
                                animate={{
                                  opacity: index === analysisPulse ? 1 : 0.35,
                                  scaleX: index === analysisPulse ? 1 : 0.9,
                                  backgroundColor: index === analysisPulse ? 'var(--color-primary)' : 'var(--color-border)',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {portfolioAnalysisHistory.length === 0 && !isAnalyzing ? (
                    <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                      {isArabic
                        ? 'لا يوجد تحليل محفوظ بعد. شغّل التحليل لإنشاء أول مذكرة توصيات لمحفظتك.'
                        : 'No saved analysis yet. Run the analysis to create your first portfolio recommendation memo.'}
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    {portfolioAnalysisHistory.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className={`space-y-2 ${isArabic ? 'text-right' : ''}`}>
                            <div className={`flex flex-wrap items-center gap-2 text-xs text-muted-foreground ${isArabic ? 'justify-end' : ''}`}>
                              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {new Date(record.createdAt).toLocaleString(isArabic ? 'ar-SA-u-nu-latn' : 'en-US')}
                              </span>
                              {index === 0 ? (
                                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                                  {isArabic ? 'الأحدث' : 'Latest'}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm leading-7 text-foreground">{record.summary}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`text-rose-500 hover:text-rose-600 ${isArabic ? 'self-start md:self-auto' : ''}`}
                            onClick={() => deletePortfolioAnalysisRecord(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                          {record.actions.map((action, actionIndex) => {
                            const actionMeta = getAnalysisActionMeta(action.type, isArabic);
                            const ActionIcon = actionMeta.icon;

                            return (
                            <div key={`${record.id}-${action.title}-${actionIndex}`} className="rounded-xl border border-border/80 bg-card p-4">
                              <div className={`flex items-start gap-3 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${actionMeta.wrapperClass}`}>
                                  <ActionIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={`flex flex-wrap items-center gap-2 ${isArabic ? 'justify-end' : ''}`}>
                                    <Badge variant="outline" className={actionMeta.wrapperClass}>
                                      {actionMeta.label}
                                    </Badge>
                                    <div className="font-medium">{action.title}</div>
                                  </div>
                                  <div className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</div>
                                </div>
                              </div>
                            </div>
                          )})}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="allocation" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 auto-rows-fr">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{isArabic ? 'التوزيع حسب البورصة' : 'By Exchange'}</CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={exchangeChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {exchangeChartData.map((entry, index) => (
                            <Cell key={`exchange-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{isArabic ? 'التوزيع حسب القطاع' : 'By Sector'}</CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectorChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={12} width={80} />
                        <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                        <Bar dataKey="value" fill="var(--gold)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>

        <Card className="border-dashed">
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>
              {isArabic ? 'المصدر الحالي لأسعار السوق هو SAHMK للأسهم السعودية فقط.' : 'The current live market data source is SAHMK for Saudi holdings only.'}
            </p>
            {marketRefreshMeta.updatedAt && (
              <p>
                {isArabic ? 'آخر تحديث:' : 'Last refresh:'} {new Date(marketRefreshMeta.updatedAt).toLocaleString(isArabic ? 'ar-SA-u-nu-latn' : 'en-US')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
