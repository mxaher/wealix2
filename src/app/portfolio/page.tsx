'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Crown,
  FileSpreadsheet,
  Filter,
  Plus,
  Search,
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
  type PortfolioExchange,
  type PortfolioHolding,
} from '@/store/useAppStore';

const exchangeColors: Record<string, string> = {
  TASI: '#D4A843',
  EGX: '#10B981',
  NASDAQ: '#3B82F6',
  NYSE: '#8B5CF6',
};

const ideaPool = [
  {
    ticker: '7010.SR',
    name: 'STC',
    reasonEn: 'Adds telecom exposure and defensive dividend quality.',
    reasonAr: 'يضيف قطاع الاتصالات وجودة دفاعية في التوزيعات.',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft',
    reasonEn: 'Improves global tech diversification with strong cash flow.',
    reasonAr: 'يحسن التنويع التقني العالمي مع تدفقات نقدية قوية.',
  },
  {
    ticker: '1150.SR',
    name: 'Alinma Bank',
    reasonEn: 'Adds another Saudi financial name for local diversification.',
    reasonAr: 'يضيف اسماً مالياً سعودياً آخر لتعزيز التنويع المحلي.',
  },
];

function buildAnalysis(holdings: PortfolioHolding[], isArabic: boolean) {
  if (holdings.length === 0) {
    return {
      summary: isArabic
        ? 'المحفظة فارغة حالياً. ارفع ملف إكسل أو أضف أسهماً أولاً.'
        : 'The portfolio is empty right now. Import an Excel file or add holdings first.',
      actions: [] as Array<{ type: 'buy' | 'hold' | 'sell' | 'idea'; title: string; description: string }>,
    };
  }

  const totalValue = holdings.reduce((sum, holding) => sum + holding.shares * holding.currentPrice, 0);
  const ranked = holdings
    .map((holding) => ({
      ...holding,
      value: holding.shares * holding.currentPrice,
      returnPct: ((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100,
      weight: totalValue > 0 ? ((holding.shares * holding.currentPrice) / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  const actions: Array<{ type: 'buy' | 'hold' | 'sell' | 'idea'; title: string; description: string }> = [];
  const largest = ranked[0];

  if (largest && largest.weight > 35) {
    actions.push({
      type: 'sell',
      title: isArabic ? `تقليل الوزن في ${largest.ticker}` : `Trim ${largest.ticker}`,
      description: isArabic
        ? `${largest.ticker} يمثل ${largest.weight.toFixed(1)}% من المحفظة. هذا تركز مرتفع ويستحق تخفيفاً تدريجياً.`
        : `${largest.ticker} is ${largest.weight.toFixed(1)}% of the portfolio. That concentration is high and may justify gradual trimming.`,
    });
  }

  ranked.filter((holding) => holding.returnPct > 10).slice(0, 2).forEach((holding) => {
    actions.push({
      type: 'hold',
      title: isArabic ? `الاحتفاظ بـ ${holding.ticker}` : `Hold ${holding.ticker}`,
      description: isArabic
        ? `${holding.ticker} يحقق عائداً قدره ${holding.returnPct.toFixed(1)}%. احتفظ به مع مراقبة الحجم النسبي في المحفظة.`
        : `${holding.ticker} is up ${holding.returnPct.toFixed(1)}%. Holding makes sense while monitoring position size.`,
    });
  });

  ranked.filter((holding) => holding.returnPct < -8).slice(0, 2).forEach((holding) => {
    actions.push({
      type: 'sell',
      title: isArabic ? `مراجعة ${holding.ticker}` : `Review ${holding.ticker}`,
      description: isArabic
        ? `${holding.ticker} منخفض ${Math.abs(holding.returnPct).toFixed(1)}%. راجع سبب الهبوط قبل زيادة المركز أو الإبقاء عليه.`
        : `${holding.ticker} is down ${Math.abs(holding.returnPct).toFixed(1)}%. Re-check the thesis before averaging down or continuing to hold.`,
    });
  });

  const sectors = new Set(ranked.map((holding) => holding.sector.toLowerCase()));
  if (sectors.size < 3) {
    const idea = ideaPool[0];
    actions.push({
      type: 'idea',
      title: isArabic ? `فكرة جديدة: ${idea.ticker}` : `New idea: ${idea.ticker}`,
      description: isArabic ? idea.reasonAr : idea.reasonEn,
    });
  }

  if (!ranked.some((holding) => holding.exchange === 'NASDAQ' || holding.exchange === 'NYSE')) {
    const idea = ideaPool[1];
    actions.push({
      type: 'buy',
      title: isArabic ? `شراء محتمل: ${idea.ticker}` : `Potential buy: ${idea.ticker}`,
      description: isArabic ? idea.reasonAr : idea.reasonEn,
    });
  }

  if (ranked.some((holding) => holding.exchange === 'TASI') && !ranked.some((holding) => holding.exchange === 'EGX')) {
    const idea = ideaPool[2];
    actions.push({
      type: 'buy',
      title: isArabic ? `تنويع إقليمي: ${idea.ticker}` : `Regional diversification: ${idea.ticker}`,
      description: isArabic ? idea.reasonAr : idea.reasonEn,
    });
  }

  return {
    summary: isArabic
      ? `تم تحليل ${holdings.length} مراكز اعتماداً على الأوزان والعوائد الحالية للمحفظة.`
      : `Analyzed ${holdings.length} holdings based on current weights and unrealized returns.`,
    actions: actions.slice(0, 5),
  };
}

export default function PortfolioPage() {
  const {
    locale,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newHolding, setNewHolding] = useState({
    ticker: '',
    name: '',
    exchange: 'TASI',
    shares: '',
    avgCost: '',
    isShariah: true,
  });

  const holdings = portfolioHoldings;

  const filteredHoldings = holdings.filter((holding) => {
    const matchesSearch =
      holding.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holding.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExchange = selectedExchange === 'all' || holding.exchange === selectedExchange;
    const matchesShariah = !shariahFilterEnabled || holding.isShariah;
    return matchesSearch && matchesExchange && matchesShariah;
  });

  const totalValue = filteredHoldings.reduce((sum, holding) => sum + holding.shares * holding.currentPrice, 0);
  const totalCost = filteredHoldings.reduce((sum, holding) => sum + holding.shares * holding.avgCost, 0);
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

  const analysis = useMemo(() => buildAnalysis(holdings, isArabic), [holdings, isArabic]);

  const handleAddHolding = () => {
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
  };

  const handleImportPortfolio = async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

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
            return null;
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

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'المحفظة الاستثمارية' : 'Investment Portfolio'}</h1>
            <p className="text-muted-foreground">
              {isArabic
                ? 'استيراد ملف إكسل وتحليل المراكز الحالية وتوصيات الشراء أو البيع أو الاحتفاظ.'
                : 'Import an Excel file, analyze current holdings, and get buy, sell, or hold suggestions.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FeatureGate feature="portfolio.ai_analysis">
              <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
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

            <Button asChild variant="outline" className="gap-2">
              <label className="cursor-pointer">
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
                <Button className="gap-2">
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
                  <Button onClick={handleAddHolding}>
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <Card>
            <CardContent className="p-4">
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isArabic ? 'بحث بالرمز أو الاسم...' : 'Search by ticker or name...'}
              className="pl-9"
            />
          </div>
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
                            <TableCell className="text-right">{holding.shares.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{holding.avgCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{holding.currentPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(marketValue, 'SAR', locale)}</TableCell>
                            <TableCell className="text-right">
                              <div className={gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                <div className="flex items-center justify-end gap-1">
                                  {gainLoss >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  {formatCurrency(Math.abs(gainLoss), 'SAR', locale)}
                                </div>
                                <span className="text-xs">
                                  {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600" onClick={() => deletePortfolioHolding(holding.id)}>
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'التوزيع حسب البورصة' : 'By Exchange'}</CardTitle>
                </CardHeader>
                <CardContent>
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

              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'التوزيع حسب القطاع' : 'By Sector'}</CardTitle>
                </CardHeader>
                <CardContent>
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
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'ملخص التحليل' : 'Analysis Summary'}</CardTitle>
                  <CardDescription>{analysis.summary}</CardDescription>
                </CardHeader>
              </Card>
              {analysis.actions.map((action, index) => (
                <Card key={`${action.title}-${index}`}>
                  <CardContent className="p-4">
                    <div className="font-medium">{action.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{action.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
