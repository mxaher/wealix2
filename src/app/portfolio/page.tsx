'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  FileSpreadsheet,
  Filter,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
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
} from '@/store/useAppStore';

type AnalysisAction = {
  type: string;
  title: string;
  description: string;
};

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
    addPortfolioHolding,
    deletePortfolioHolding,
    replacePortfolioHoldings,
  } = useAppStore();
  const isArabic = locale === 'ar';
  const { isSignedIn } = useUser();

  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [marketRefreshMeta, setMarketRefreshMeta] = useState<MarketRefreshMeta>({
    updatedAt: null,
    sources: [],
    fxRates: {},
  });
  const [analysis, setAnalysis] = useState<{ summary: string; actions: AnalysisAction[] }>({
    summary: isArabic
      ? 'شغّل التحليل لمراجعة المحفظة الحالية.'
      : 'Run the analysis to review the current portfolio.',
    actions: [],
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
      setAnalysis({
        summary: isArabic
          ? 'المحفظة فارغة حالياً. أضف أو استورد مراكز أولاً.'
          : 'The portfolio is currently empty. Add or import holdings first.',
        actions: [],
      });
      setShowAnalysis(true);
      return;
    }

    setIsAnalyzing(true);
    setShowAnalysis(true);
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
      setAnalysis({
        summary: data.summary || '',
        actions: Array.isArray(data.actions) ? data.actions : [],
      });
    } catch (error) {
      setAnalysis({
        summary: isArabic
          ? 'تعذر إكمال التحليل حالياً.'
          : 'The portfolio analysis could not be completed right now.',
        actions: [],
      });
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
    const globalHoldings = holdings.filter((holding) => ['EGX', 'NASDAQ', 'NYSE'].includes(holding.exchange));

    if (saudiHoldings.length === 0 && globalHoldings.length === 0) {
      toast({
        title: isArabic ? 'لا توجد مراكز لتحديثها' : 'No holdings to refresh',
        description: isArabic
          ? 'أضف مراكز استثمارية أولاً ثم حدّث الأسعار.'
          : 'Add some holdings first, then refresh prices.',
      });
      return;
    }

    setIsRefreshingPrices(true);
    try {
      let nextHoldings = [...holdings];
      let nextFxRates = { ...marketRefreshMeta.fxRates };
      const nextSources = new Set(marketRefreshMeta.sources);
      const successLabels: string[] = [];
      const errorLabels: string[] = [];

      if (saudiHoldings.length > 0) {
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
          nextHoldings = nextHoldings.map((holding) => {
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
          nextSources.add('SAHMK');
          successLabels.push(isArabic ? 'السوق السعودي' : 'Saudi market');
        } catch (error) {
          errorLabels.push(
            error instanceof Error && error.message
              ? `${isArabic ? 'السوق السعودي' : 'Saudi market'}: ${error.message}`
              : (isArabic ? 'تعذّر تحديث السوق السعودي' : 'Saudi market refresh failed')
          );
        }
      }

      if (globalHoldings.length > 0) {
        try {
          const response = await fetch('/api/market/global/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              holdings: globalHoldings.map((holding) => ({
                ticker: holding.ticker,
                exchange: holding.exchange,
              })),
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.details || data.error || 'Failed to refresh global prices.');
          }

          const quotes = data.quotes ?? {};
          nextFxRates = data.fxRates ?? nextFxRates;
          nextHoldings = nextHoldings.map((holding) => {
            const quote = quotes[holding.ticker.toUpperCase()];
            if (!quote || !quote.price) {
              return holding;
            }

            return {
              ...holding,
              name: quote.name || holding.name,
              currentPrice: Number(quote.price),
            };
          });
          nextSources.add('Twelve Data');
          successLabels.push(isArabic ? 'EGX وUS' : 'EGX & US');
        } catch (error) {
          errorLabels.push(
            error instanceof Error && error.message
              ? `${isArabic ? 'EGX وUS' : 'EGX & US'}: ${error.message}`
              : (isArabic ? 'تعذّر تحديث EGX وUS' : 'EGX & US refresh failed')
          );
        }
      }

      if (successLabels.length === 0) {
        throw new Error(errorLabels.join(' | ') || 'Could not refresh prices.');
      }

      replacePortfolioHoldings(nextHoldings);
      setMarketRefreshMeta({
        updatedAt: new Date().toISOString(),
        sources: [...nextSources],
        fxRates: nextFxRates,
      });

      toast({
        title: isArabic ? 'تم تحديث الأسعار' : 'Prices refreshed',
        description: isArabic
          ? `تم تحديث أسعار ${successLabels.join(' + ')}.${errorLabels.length ? ` مع ملاحظة: ${errorLabels.join(' | ')}` : ''}`
          : `Updated ${successLabels.join(' + ')}.${errorLabels.length ? ` Note: ${errorLabels.join(' | ')}` : ''}`,
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
            <FeatureGate feature="portfolio.ai_analysis">
              <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={handleAnalyzePortfolio} disabled={!isSignedIn}>
                    <Sparkles className="w-4 h-4" />
                    {isArabic ? 'تحليل المحفظة' : 'Analyze Portfolio'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{isArabic ? 'تحليل المحفظة' : 'Portfolio Analysis'}</DialogTitle>
                    <DialogDescription>{analysis.summary}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    {isAnalyzing && (
                      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        {isArabic ? 'جارٍ تحليل المحفظة...' : 'Analyzing the portfolio...'}
                      </div>
                    )}
                    {analysis.actions.map((action, index) => (
                      <div key={`${action.title}-${index}`} className="rounded-xl border p-4">
                        <div className="font-medium">{action.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{action.description}</div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </FeatureGate>

            <Button asChild variant="outline" className="gap-2">
              <a href="/samples/wealix-portfolio-import-sample.xlsx" download>
                <FileSpreadsheet className="w-4 h-4" />
                {isArabic ? 'ملف نموذجي' : 'Sample File'}
              </a>
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              disabled={!isSignedIn || isRefreshingPrices}
              onClick={handleRefreshAllPrices}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingPrices ? 'animate-spin' : ''}`} />
              {isRefreshingPrices
                ? (isArabic ? 'جارٍ التحديث...' : 'Refreshing...')
                : (isArabic ? 'تحديث كل الأسعار' : 'Refresh All Prices')}
            </Button>

            <Button variant="outline" className="gap-2" disabled={!isSignedIn} asChild={false}>
              <label className={`cursor-pointer ${!isSignedIn ? 'pointer-events-none opacity-70' : ''}`}>
                <Upload className="w-4 h-4" />
                {isImporting ? (isArabic ? 'جارٍ الاستيراد...' : 'Importing...') : (isArabic ? 'استيراد إكسل' : 'Import Excel')}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleImportPortfolio(e.target.files?.[0] ?? null)}
                />
              </label>
            </Button>

            <Dialog open={showAddHolding} onOpenChange={setShowAddHolding}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={!isSignedIn}>
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'إضافة سهم' : 'Add Holding'}
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

        <Tabs defaultValue="holdings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="holdings">{isArabic ? 'الممتلكات' : 'Holdings'}</TabsTrigger>
            <TabsTrigger value="allocation">{isArabic ? 'التوزيع' : 'Allocation'}</TabsTrigger>
            <TabsTrigger value="analysis">{isArabic ? 'التحليل' : 'Analysis'}</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
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
          </TabsContent>

          <TabsContent value="allocation" className="space-y-6">
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

          <TabsContent value="analysis">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 auto-rows-fr">
              <Card className="h-full lg:col-span-2">
                <CardHeader>
                  <CardTitle>{isArabic ? 'ملخص التحليل' : 'Analysis Summary'}</CardTitle>
                  <CardDescription>{analysis.summary}</CardDescription>
                </CardHeader>
              </Card>
              {analysis.actions.map((action, index) => (
                <Card key={`${action.title}-${index}`} className="h-full">
                  <CardContent className="p-4">
                    <div className="font-medium">{action.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{action.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="border-dashed">
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>
              {appMode === 'demo'
                ? (isArabic ? 'الأسعار الحالية تجريبية وليست بيانات سوق مباشرة.' : 'Current prices are demo values and not live market data.')
                : (isArabic ? 'المصدر: سوق تداول عبر SAHMK للأسهم السعودية وTwelve Data لأسهم EGX وNASDAQ وNYSE.' : 'Source: SAHMK for Saudi market holdings and Twelve Data for EGX, NASDAQ, and NYSE holdings.')}
            </p>
            {marketRefreshMeta.updatedAt && (
              <p>
                {isArabic ? 'آخر تحديث:' : 'Last refresh:'} {new Date(marketRefreshMeta.updatedAt).toLocaleString(isArabic ? 'ar-SA-u-nu-latn' : 'en-US')}
              </p>
            )}
            {Object.values(marketRefreshMeta.fxRates).some((rate) => Boolean(rate?.rate)) && (
              <div className="space-y-1">
                {marketRefreshMeta.fxRates.USD_SAR?.rate ? (
                  <p>
                    USD/SAR: {marketRefreshMeta.fxRates.USD_SAR.rate.toFixed(4)}
                    {marketRefreshMeta.fxRates.USD_SAR.datetime ? ` · ${marketRefreshMeta.fxRates.USD_SAR.datetime}` : ''}
                  </p>
                ) : null}
                {marketRefreshMeta.fxRates.EGP_SAR?.rate ? (
                  <p>
                    EGP/SAR: {marketRefreshMeta.fxRates.EGP_SAR.rate.toFixed(4)}
                    {marketRefreshMeta.fxRates.EGP_SAR.datetime ? ` · ${marketRefreshMeta.fxRates.EGP_SAR.datetime}` : ''}
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
