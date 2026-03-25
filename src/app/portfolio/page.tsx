'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Crown,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { DashboardShell } from '@/components/layout';
import { StatCard, FeatureGate, formatCurrency } from '@/components/shared';
import { useAppStore } from '@/store/useAppStore';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// Mock holdings data
const mockHoldings = [
  { id: '1', ticker: '2222.SR', name: 'Saudi Aramco', exchange: 'TASI', shares: 100, avgCost: 32.5, currentPrice: 35.20, sector: 'Energy', isShariah: true },
  { id: '2', ticker: '1120.SR', name: 'Al Rajhi Bank', exchange: 'TASI', shares: 50, avgCost: 98.0, currentPrice: 105.50, sector: 'Banking', isShariah: true },
  { id: '3', ticker: '1180.SR', name: 'Maaden', exchange: 'TASI', shares: 75, avgCost: 45.0, currentPrice: 48.20, sector: 'Mining', isShariah: true },
  { id: '4', ticker: 'COMI.CA', name: 'CIB Egypt', exchange: 'EGX', shares: 200, avgCost: 45.0, currentPrice: 52.30, sector: 'Banking', isShariah: false },
  { id: '5', ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', shares: 25, avgCost: 175.0, currentPrice: 182.50, sector: 'Technology', isShariah: false },
  { id: '6', ticker: '1050.SR', name: 'SABIC', exchange: 'TASI', shares: 30, avgCost: 85.0, currentPrice: 92.40, sector: 'Materials', isShariah: true },
];

const exchangeColors: Record<string, string> = {
  TASI: '#D4A843',
  EGX: '#10B981',
  NASDAQ: '#3B82F6',
  NYSE: '#8B5CF6',
};

export default function PortfolioPage() {
  const { locale, shariahFilterEnabled, toggleShariahFilter, selectedExchange, setSelectedExchange } = useAppStore();
  const isArabic = locale === 'ar';
  
  const [holdings, setHoldings] = useState(mockHoldings);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({
    ticker: '',
    name: '',
    exchange: 'TASI',
    shares: '',
    avgCost: '',
    isShariah: true,
  });

  // Filter holdings
  const filteredHoldings = holdings.filter((h) => {
    const matchesSearch = h.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExchange = selectedExchange === 'all' || h.exchange === selectedExchange;
    const matchesShariah = !shariahFilterEnabled || h.isShariah;
    return matchesSearch && matchesExchange && matchesShariah;
  });

  // Calculate totals
  const totalValue = filteredHoldings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const totalCost = filteredHoldings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = ((totalGainLoss / totalCost) * 100);

  // Exchange allocation for chart
  const exchangeAllocation = holdings.reduce((acc, h) => {
    const value = h.shares * h.currentPrice;
    acc[h.exchange] = (acc[h.exchange] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const exchangeChartData = Object.entries(exchangeAllocation).map(([exchange, value]) => ({
    name: exchange,
    value,
    color: exchangeColors[exchange] || '#6B7280',
  }));

  // Sector allocation
  const sectorAllocation = holdings.reduce((acc, h) => {
    const value = h.shares * h.currentPrice;
    acc[h.sector] = (acc[h.sector] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const sectorChartData = Object.entries(sectorAllocation).map(([sector, value]) => ({
    name: sector,
    value,
  }));

  const handleAddHolding = () => {
    if (newHolding.ticker && newHolding.shares && newHolding.avgCost) {
      setHoldings([...holdings, {
        id: Date.now().toString(),
        ticker: newHolding.ticker,
        name: newHolding.name || newHolding.ticker,
        exchange: newHolding.exchange,
        shares: parseFloat(newHolding.shares),
        avgCost: parseFloat(newHolding.avgCost),
        currentPrice: parseFloat(newHolding.avgCost) * 1.05, // Mock current price
        sector: 'Other',
        isShariah: newHolding.isShariah,
      }]);
      setNewHolding({ ticker: '', name: '', exchange: 'TASI', shares: '', avgCost: '', isShariah: true });
      setShowAddHolding(false);
    }
  };

  const handleDeleteHolding = (id: string) => {
    setHoldings(holdings.filter(h => h.id !== id));
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'المحفظة الاستثمارية' : 'Investment Portfolio'}</h1>
            <p className="text-muted-foreground">
              {isArabic ? 'إدارة وتتبع استثماراتك' : 'Manage and track your investments'}
            </p>
          </div>
          <div className="flex gap-2">
            <FeatureGate feature="portfolio.ai_analysis">
              <Button variant="outline" className="gap-2">
                <Sparkles className="w-4 h-4" />
                {isArabic ? 'تحليل المحفظة' : 'Analyze Portfolio'}
              </Button>
            </FeatureGate>
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
                      <Select value={newHolding.exchange} onValueChange={(v) => setNewHolding({ ...newHolding, exchange: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TASI">TASI (Saudi)</SelectItem>
                          <SelectItem value="EGX">EGX (Egypt)</SelectItem>
                          <SelectItem value="NASDAQ">NASDAQ (US)</SelectItem>
                          <SelectItem value="NYSE">NYSE (US)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'اسم الشركة' : 'Company Name'}</Label>
                    <Input
                      value={newHolding.name}
                      onChange={(e) => setNewHolding({ ...newHolding, name: e.target.value })}
                      placeholder={isArabic ? 'أرامكو السعودية' : 'Saudi Aramco'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'عدد الأسهم' : 'Shares'}</Label>
                      <Input
                        type="number"
                        value={newHolding.shares}
                        onChange={(e) => setNewHolding({ ...newHolding, shares: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'متوسط التكلفة' : 'Avg Cost'}</Label>
                      <Input
                        type="number"
                        value={newHolding.avgCost}
                        onChange={(e) => setNewHolding({ ...newHolding, avgCost: e.target.value })}
                        placeholder="32.50"
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    {((holdings.filter(h => h.isShariah).length / holdings.length) * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="w-16 h-16">
                  <PieChart>
                    <Pie
                      data={[
                        { value: holdings.filter(h => h.isShariah).length, color: '#10B981' },
                        { value: holdings.filter(h => !h.isShariah).length, color: '#6B7280' },
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
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
              <Filter className="w-4 h-4 mr-2" />
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
            <Switch checked={shariahFilterEnabled} onCheckedChange={toggleShariahFilter} />
            <span className="text-sm">{isArabic ? 'الشريعة فقط' : 'Shariah Only'}</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="holdings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="holdings">{isArabic ? 'الممتلكات' : 'Holdings'}</TabsTrigger>
            <TabsTrigger value="allocation">{isArabic ? 'التوزيع' : 'Allocation'}</TabsTrigger>
            <TabsTrigger value="transactions">{isArabic ? 'المعاملات' : 'Transactions'}</TabsTrigger>
          </TabsList>

          {/* Holdings Tab */}
          <TabsContent value="holdings">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
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
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHoldings.map((holding, index) => {
                        const marketValue = holding.shares * holding.currentPrice;
                        const costBasis = holding.shares * holding.avgCost;
                        const gainLoss = marketValue - costBasis;
                        const gainLossPercent = ((gainLoss / costBasis) * 100);

                        return (
                          <motion.tr
                            key={holding.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="hover:bg-muted/50"
                          >
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
                              <Badge style={{ backgroundColor: exchangeColors[holding.exchange] + '20', color: exchangeColors[holding.exchange] }}>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-rose-500 hover:text-rose-600"
                                onClick={() => handleDeleteHolding(holding.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Allocation Tab */}
          <TabsContent value="allocation" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Exchange Allocation */}
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'التوزيع حسب البورصة' : 'By Exchange'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={exchangeChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {exchangeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value, 'SAR', locale)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {exchangeChartData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(item.value, 'SAR', locale)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sector Allocation */}
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

            {/* Top Holdings */}
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'أكبر الممتلكات' : 'Top Holdings'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {holdings
                    .map(h => ({ ...h, value: h.shares * h.currentPrice }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)
                    .map((holding, index) => {
                      const percentage = (holding.value / totalValue) * 100;
                      return (
                        <div key={holding.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{holding.ticker}</span>
                              <span className="text-sm text-muted-foreground">{holding.name}</span>
                            </div>
                            <span className="font-medium">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ delay: index * 0.1, duration: 0.5 }}
                              className="h-full bg-gold rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{isArabic ? 'سجل المعاملات' : 'Transaction History'}</CardTitle>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    {isArabic ? 'إضافة معاملة' : 'Add Transaction'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  {isArabic ? 'لا توجد معاملات بعد' : 'No transactions yet'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
