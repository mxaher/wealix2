'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Building2,
  Car,
  Landmark,
  Briefcase,
  MoreHorizontal,
  Wallet,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  History,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardShell } from '@/components/layout';
import { StatCard, CurrencyDisplay, formatCurrency } from '@/components/shared';
import { useAppStore } from '@/store/useAppStore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

// Icons for categories
const assetIcons: Record<string, React.ReactNode> = {
  cash: <Landmark className="w-5 h-5" />,
  investment: <Briefcase className="w-5 h-5" />,
  real_estate: <Building2 className="w-5 h-5" />,
  vehicle: <Car className="w-5 h-5" />,
  other: <MoreHorizontal className="w-5 h-5" />,
};

const liabilityIcons: Record<string, React.ReactNode> = {
  loan: <Landmark className="w-5 h-5" />,
  mortgage: <Building2 className="w-5 h-5" />,
  credit_card: <Wallet className="w-5 h-5" />,
  other: <MoreHorizontal className="w-5 h-5" />,
};

// Mock data
const mockAssets = [
  { id: '1', name: 'Al Rajhi Savings', category: 'cash', value: 150000, currency: 'SAR' },
  { id: '2', name: 'SNB Current', category: 'cash', value: 45000, currency: 'SAR' },
  { id: '3', name: 'Investment Portfolio', category: 'investment', value: 485000, currency: 'SAR' },
  { id: '4', name: 'Apartment - Riyadh', category: 'real_estate', value: 850000, currency: 'SAR' },
  { id: '5', name: 'Toyota Camry', category: 'vehicle', value: 75000, currency: 'SAR' },
];

const mockLiabilities = [
  { id: '1', name: 'Mortgage - Riyadh', category: 'mortgage', balance: 520000, currency: 'SAR' },
  { id: '2', name: 'Car Loan', category: 'loan', balance: 45000, currency: 'SAR' },
  { id: '3', name: 'Credit Card', category: 'credit_card', balance: 8500, currency: 'SAR' },
];

const mockHistory = [
  { month: 'Jul 2024', assets: 980000, liabilities: 650000, netWorth: 330000 },
  { month: 'Aug 2024', assets: 1020000, liabilities: 640000, netWorth: 380000 },
  { month: 'Sep 2024', assets: 1050000, liabilities: 630000, netWorth: 420000 },
  { month: 'Oct 2024', assets: 1100000, liabilities: 620000, netWorth: 480000 },
  { month: 'Nov 2024', assets: 1120000, liabilities: 600000, netWorth: 520000 },
  { month: 'Dec 2024', assets: 1155000, liabilities: 573500, netWorth: 581500 },
];

export default function NetWorthPage() {
  const { locale } = useAppStore();
  const isArabic = locale === 'ar';
  
  const [assets, setAssets] = useState(mockAssets);
  const [liabilities, setLiabilities] = useState(mockLiabilities);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', category: 'cash', value: '' });
  const [newLiability, setNewLiability] = useState({ name: '', category: 'loan', balance: '' });

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const handleAddAsset = () => {
    if (newAsset.name && newAsset.value) {
      setAssets([...assets, {
        id: Date.now().toString(),
        ...newAsset,
        value: parseFloat(newAsset.value),
        currency: 'SAR',
      }]);
      setNewAsset({ name: '', category: 'cash', value: '' });
      setShowAddAsset(false);
    }
  };

  const handleAddLiability = () => {
    if (newLiability.name && newLiability.balance) {
      setLiabilities([...liabilities, {
        id: Date.now().toString(),
        ...newLiability,
        balance: parseFloat(newLiability.balance),
        currency: 'SAR',
      }]);
      setNewLiability({ name: '', category: 'loan', balance: '' });
      setShowAddLiability(false);
    }
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleDeleteLiability = (id: string) => {
    setLiabilities(liabilities.filter(l => l.id !== id));
  };

  const categoryLabels: Record<string, { en: string; ar: string }> = {
    cash: { en: 'Cash & Savings', ar: 'نقد ومدخرات' },
    investment: { en: 'Investments', ar: 'استثمارات' },
    real_estate: { en: 'Real Estate', ar: 'عقارات' },
    vehicle: { en: 'Vehicles', ar: 'مركبات' },
    other: { en: 'Other', ar: 'أخرى' },
    loan: { en: 'Loans', ar: 'قروض' },
    mortgage: { en: 'Mortgage', ar: 'رهن عقاري' },
    credit_card: { en: 'Credit Cards', ar: 'بطاقات ائتمان' },
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'صافي الثروة' : 'Net Worth'}</h1>
            <p className="text-muted-foreground">
              {isArabic ? 'تتبع أصولك والتزاماتك' : 'Track your assets and liabilities'}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'إضافة أصل' : 'Add Asset'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'إضافة أصل جديد' : 'Add New Asset'}</DialogTitle>
                  <DialogDescription>
                    {isArabic ? 'أضف أصلأً إلى قائمة أصولك' : 'Add a new asset to your portfolio'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الاسم' : 'Name'}</Label>
                    <Input
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      placeholder={isArabic ? 'مثال: حساب التوفير' : 'e.g., Savings Account'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                    <Select value={newAsset.category} onValueChange={(v) => setNewAsset({ ...newAsset, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{isArabic ? 'نقد ومدخرات' : 'Cash & Savings'}</SelectItem>
                        <SelectItem value="investment">{isArabic ? 'استثمارات' : 'Investments'}</SelectItem>
                        <SelectItem value="real_estate">{isArabic ? 'عقارات' : 'Real Estate'}</SelectItem>
                        <SelectItem value="vehicle">{isArabic ? 'مركبات' : 'Vehicles'}</SelectItem>
                        <SelectItem value="other">{isArabic ? 'أخرى' : 'Other'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'القيمة (SAR)' : 'Value (SAR)'}</Label>
                    <Input
                      type="number"
                      value={newAsset.value}
                      onChange={(e) => setNewAsset({ ...newAsset, value: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddAsset(false)}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleAddAsset}>
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddLiability} onOpenChange={setShowAddLiability}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'إضافة التزام' : 'Add Liability'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'إضافة التزام جديد' : 'Add New Liability'}</DialogTitle>
                  <DialogDescription>
                    {isArabic ? 'أضف التزامأً إلى قائمة التزاماتك' : 'Add a new liability'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الاسم' : 'Name'}</Label>
                    <Input
                      value={newLiability.name}
                      onChange={(e) => setNewLiability({ ...newLiability, name: e.target.value })}
                      placeholder={isArabic ? 'مثال: قرض شخصي' : 'e.g., Personal Loan'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                    <Select value={newLiability.category} onValueChange={(v) => setNewLiability({ ...newLiability, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loan">{isArabic ? 'قرض' : 'Loan'}</SelectItem>
                        <SelectItem value="mortgage">{isArabic ? 'رهن عقاري' : 'Mortgage'}</SelectItem>
                        <SelectItem value="credit_card">{isArabic ? 'بطاقة ائتمان' : 'Credit Card'}</SelectItem>
                        <SelectItem value="other">{isArabic ? 'أخرى' : 'Other'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الرصيد (SAR)' : 'Balance (SAR)'}</Label>
                    <Input
                      type="number"
                      value={newLiability.balance}
                      onChange={(e) => setNewLiability({ ...newLiability, balance: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddLiability(false)}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleAddLiability}>
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-emerald-500/20">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي الأصول' : 'Total Assets'}</p>
                    <p className="text-2xl font-bold text-emerald-500">
                      {formatCurrency(totalAssets, 'SAR', locale)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-rose-500/20">
                    <TrendingDown className="w-6 h-6 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي الالتزامات' : 'Total Liabilities'}</p>
                    <p className="text-2xl font-bold text-rose-500">
                      {formatCurrency(totalLiabilities, 'SAR', locale)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-gold/20">
                    <Wallet className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isArabic ? 'صافي الثروة' : 'Net Worth'}</p>
                    <p className="text-2xl font-bold text-gold">
                      {formatCurrency(netWorth, 'SAR', locale)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">{isArabic ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="assets">{isArabic ? 'الأصول' : 'Assets'}</TabsTrigger>
            <TabsTrigger value="liabilities">{isArabic ? 'الالتزامات' : 'Liabilities'}</TabsTrigger>
            <TabsTrigger value="history">{isArabic ? 'السجل' : 'History'}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Net Worth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'اتجاه صافي الثروة' : 'Net Worth Trend'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockHistory}>
                        <defs>
                          <linearGradient id="netWorthGradientFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          formatter={(value: number) => [formatCurrency(value, 'SAR', locale), '']}
                        />
                        <Area type="monotone" dataKey="netWorth" stroke="var(--gold)" strokeWidth={2} fill="url(#netWorthGradientFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Assets vs Liabilities */}
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'الأصول مقابل الالتزامات' : 'Assets vs Liabilities'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          formatter={(value: number) => [formatCurrency(value, 'SAR', locale), '']}
                        />
                        <Legend />
                        <Bar dataKey="assets" name={isArabic ? 'الأصول' : 'Assets'} fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="liabilities" name={isArabic ? 'الالتزامات' : 'Liabilities'} fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'نسبة الأصول للالتزامات' : 'Assets to Liabilities Ratio'}</p>
                      <p className="text-2xl font-bold">{(totalAssets / totalLiabilities).toFixed(2)}x</p>
                    </div>
                    <Progress value={(totalLiabilities / totalAssets) * 100} className="w-20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'التغير الشهري' : 'Monthly Change'}</p>
                      <p className="text-2xl font-bold text-emerald-500">+10.5%</p>
                    </div>
                    <ArrowUpRight className="w-8 h-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'التغير السنوي' : 'Yearly Change'}</p>
                      <p className="text-2xl font-bold text-emerald-500">+76.2%</p>
                    </div>
                    <ArrowUpRight className="w-8 h-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'قائمة الأصول' : 'Assets List'}</CardTitle>
                <CardDescription>
                  {isArabic ? `${assets.length} أصل` : `${assets.length} assets`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {assets.map((asset, index) => (
                      <motion.div
                        key={asset.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          {assetIcons[asset.category]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{asset.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {categoryLabels[asset.category]?.[isArabic ? 'ar' : 'en']}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(asset.value, asset.currency, locale)}</p>
                          <p className="text-xs text-muted-foreground">{((asset.value / totalAssets) * 100).toFixed(1)}%</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{isArabic ? 'حذف الأصل؟' : 'Delete Asset?'}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {isArabic ? 'هل أنت متأكد من حذف هذا الأصل؟' : 'Are you sure you want to delete this asset?'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAsset(asset.id)} className="bg-rose-500 hover:bg-rose-600">
                                {isArabic ? 'حذف' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Liabilities Tab */}
          <TabsContent value="liabilities">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'قائمة الالتزامات' : 'Liabilities List'}</CardTitle>
                <CardDescription>
                  {isArabic ? `${liabilities.length} التزام` : `${liabilities.length} liabilities`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {liabilities.map((liability, index) => (
                      <motion.div
                        key={liability.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                          {liabilityIcons[liability.category]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{liability.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {categoryLabels[liability.category]?.[isArabic ? 'ar' : 'en']}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(liability.balance, liability.currency, locale)}</p>
                          <p className="text-xs text-muted-foreground">{((liability.balance / totalLiabilities) * 100).toFixed(1)}%</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{isArabic ? 'حذف الالتزام؟' : 'Delete Liability?'}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {isArabic ? 'هل أنت متأكد من حذف هذا الالتزام؟' : 'Are you sure you want to delete this liability?'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteLiability(liability.id)} className="bg-rose-500 hover:bg-rose-600">
                                {isArabic ? 'حذف' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    {isArabic ? 'سجل صافي الثروة' : 'Net Worth History'}
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    {isArabic ? 'تصدير' : 'Export'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">{isArabic ? 'الشهر' : 'Month'}</th>
                        <th className="text-right p-3 text-sm font-medium">{isArabic ? 'الأصول' : 'Assets'}</th>
                        <th className="text-right p-3 text-sm font-medium">{isArabic ? 'الالتزامات' : 'Liabilities'}</th>
                        <th className="text-right p-3 text-sm font-medium">{isArabic ? 'صافي الثروة' : 'Net Worth'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mockHistory.map((row, index) => (
                        <motion.tr
                          key={row.month}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-muted/50"
                        >
                          <td className="p-3">{row.month}</td>
                          <td className="p-3 text-right text-emerald-500">{formatCurrency(row.assets, 'SAR', locale)}</td>
                          <td className="p-3 text-right text-rose-500">{formatCurrency(row.liabilities, 'SAR', locale)}</td>
                          <td className="p-3 text-right font-medium text-gold">{formatCurrency(row.netWorth, 'SAR', locale)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
