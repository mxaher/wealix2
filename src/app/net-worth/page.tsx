'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Building2,
  Car,
  Landmark,
  Briefcase,
  Link2,
  Lock,
  MoreHorizontal,
  Wallet,
  TrendingUp,
  TrendingDown,
  Trash2,
  ArrowUpRight,
  History,
  Info,
} from 'lucide-react';
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
import {
  useAppStore,
  formatCurrency,
  useTotalMonthlyIncome,
  type AssetCategory,
  type LiabilityCategory,
  type AssetEntry,
  type LiabilityEntry,
} from '@/store/useAppStore';
import { BarChart2 } from 'lucide-react';
import { useFinancialSnapshot } from '@/hooks/useFinancialSnapshot';
import { toast } from '@/hooks/use-toast';
import { createOpaqueId } from '@/lib/ids';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';

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

const mockHistory = [
  { month: 'Jul 2025', assets: 1125000, liabilities: 612000, netWorth: 513000 },
  { month: 'Aug 2025', assets: 1134000, liabilities: 607000, netWorth: 527000 },
  { month: 'Sep 2025', assets: 1141000, liabilities: 601500, netWorth: 539500 },
  { month: 'Oct 2025', assets: 1155000, liabilities: 598000, netWorth: 557000 },
  { month: 'Nov 2025', assets: 1162000, liabilities: 592000, netWorth: 570000 },
  { month: 'Dec 2025', assets: 1170000, liabilities: 585500, netWorth: 584500 },
];

type NetWorthAssetRow = AssetEntry & {
  origin: 'manual' | 'budget_planning' | 'portfolio';
  helperText?: string;
  locked?: boolean;
};

type NetWorthLiabilityRow = LiabilityEntry & {
  origin: 'manual' | 'budget_planning';
  helperText?: string;
  locked?: boolean;
};

export default function NetWorthPage() {
  const locale = useAppStore((state) => state.locale);
  const appMode = useAppStore((state) => state.appMode);
  const assets = useAppStore((state) => state.assets);
  const liabilities = useAppStore((state) => state.liabilities);
  const expenseEntries = useAppStore((state) => state.expenseEntries);
  const recurringObligations = useAppStore((state) => state.recurringObligations) ?? [];
  const addAsset = useAppStore((state) => state.addAsset);
  const deleteAsset = useAppStore((state) => state.deleteAsset);
  const addLiability = useAppStore((state) => state.addLiability);
  const deleteLiability = useAppStore((state) => state.deleteLiability);
  const { snapshot } = useFinancialSnapshot();
  const isArabic = locale === 'ar';
  const { isSignedIn } = useRuntimeUser();
  const isDemoMode = appMode === 'demo' && !isSignedIn;

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', category: 'real_estate', value: '' });
  const [newLiability, setNewLiability] = useState({ name: '', category: 'loan', balance: '' });

  const portfolioInvestmentsValue = isDemoMode ? 0 : snapshot.portfolio.totalInvestments;
  const totalAssets = isDemoMode ? 1170000 : snapshot.totalAssets;
  const totalLiabilities = isDemoMode ? 585500 : snapshot.totalLiabilities;
  const netWorth = isDemoMode ? 584500 : snapshot.netWorth.net;

  const displayAssets = useMemo(
    () => [
      ...snapshot.savings.savingsAccounts.map((account) => ({
        id: `savings-${account.id}`,
        name: account.name,
        category: (account.type === 'current' || account.type === 'standard_savings' || account.type === 'hassad' ? 'cash' : 'investment') as AssetCategory,
        value: account.currentBalance,
        currency: 'SAR',
        locked: true,
        sourceLabel: isArabic ? 'متزامن من Budget & Planning' : 'Synced from Budget & Planning',
      })),
      ...(portfolioInvestmentsValue > 0
        ? [{
            id: 'portfolio-investments',
            name: isArabic ? 'محفظة الاستثمارات الحالية' : 'Current Portfolio Holdings',
            category: 'investment' as const,
            value: portfolioInvestmentsValue,
            currency: 'SAR',
            locked: true,
            sourceLabel: isArabic ? 'متزامن من Portfolio' : 'Synced from Portfolio',
          }]
        : []),
      ...assets,
    ],
    [assets, isArabic, portfolioInvestmentsValue, snapshot.savings.savingsAccounts]
  );

  const syncedLiabilities = useMemo(
    () => snapshot.recurringObligations.map((obligation) => ({
      id: `obligation-${obligation.id}`,
      name: obligation.title,
      category: obligation.category === 'loan'
        ? 'loan'
        : obligation.category === 'mortgage'
          ? 'mortgage'
          : obligation.category === 'credit_card'
            ? 'credit_card'
            : 'other',
      balance: obligation.amount,
      currency: obligation.currency || 'SAR',
      locked: true,
    })),
    [snapshot.recurringObligations]
  );

  const displayLiabilities = useMemo(
    () => [...syncedLiabilities, ...liabilities],
    [liabilities, syncedLiabilities]
  );

  const historyData = useMemo(() => {
    if (isDemoMode) {
      return mockHistory;
    }

    if (
      assets.length === 0 &&
      liabilities.length === 0 &&
      portfolioInvestmentsValue === 0 &&
      snapshot.savings.savingsAccounts.length === 0 &&
      snapshot.recurringObligations.length === 0
    ) {
      return [];
    }

    return [
      {
        month: isArabic ? 'الحالي' : 'Current',
        assets: totalAssets,
        liabilities: totalLiabilities,
        netWorth,
      },
    ];
  }, [isDemoMode, assets.length, liabilities.length, isArabic, netWorth, portfolioInvestmentsValue, snapshot.recurringObligations.length, snapshot.savings.savingsAccounts.length, totalAssets, totalLiabilities]);

  const monthlyIncome = useTotalMonthlyIncome();

  const monthlyExpenses = useMemo(
    () => expenseEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [expenseEntries]
  );

  const monthlyObligations = useMemo(
    () =>
      recurringObligations.reduce((sum, ob) => {
        if (ob.status === 'paid') return sum;
        switch (ob.frequency) {
          case 'quarterly': return sum + ob.amount / 3;
          case 'semi_annual': return sum + ob.amount / 6;
          case 'annual': return sum + ob.amount / 12;
          case 'one_time': return sum;
          default: return sum + ob.amount;
        }
      }, 0),
    [recurringObligations]
  );

  const monthlyCashFlow = monthlyIncome - monthlyExpenses - monthlyObligations;

  const ratio = totalLiabilities > 0 ? totalAssets / totalLiabilities : totalAssets > 0 ? totalAssets : 0;
  const ratioProgress = totalAssets > 0 ? Math.min(100, (totalLiabilities / totalAssets) * 100) : 0;
  const monthlyChange = historyData.length > 1
    ? ((historyData[historyData.length - 1].netWorth - historyData[historyData.length - 2].netWorth) / Math.max(historyData[historyData.length - 2].netWorth, 1)) * 100
    : null;
  const yearlyChange = historyData.length > 1
    ? ((historyData[historyData.length - 1].netWorth - historyData[0].netWorth) / Math.max(historyData[0].netWorth, 1)) * 100
    : null;

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

  const requireAccount = () => {
    toast({
      title: isArabic ? 'يتطلب حساباً' : 'Account required',
      description: isArabic
        ? 'يمكن للضيف استعراض البيانات التجريبية فقط. أنشئ حساباً لإضافة أو تعديل الأصول والالتزامات.'
        : 'Guests can browse demo data only. Create an account to add or edit assets and liabilities.',
    });
  };

  const handleAddAsset = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }

    if (!newAsset.name || !newAsset.value) {
      return;
    }

    addAsset({
      id: createOpaqueId('asset'),
      name: newAsset.name,
      category: newAsset.category as AssetCategory,
      value: Number(newAsset.value),
      currency: 'SAR',
    });
    setNewAsset({ name: '', category: 'real_estate', value: '' });
    setShowAddAsset(false);
  };

  const handleAddLiability = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }

    if (!newLiability.name || !newLiability.balance) {
      return;
    }

    addLiability({
      id: createOpaqueId('liability'),
      name: newLiability.name,
      category: newLiability.category as LiabilityCategory,
      balance: Number(newLiability.balance),
      currency: 'SAR',
    });
    setNewLiability({ name: '', category: 'loan', balance: '' });
    setShowAddLiability(false);
  };

  const handleDeleteAsset = (id: string) => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }
    deleteAsset(id);
  };

  const handleDeleteLiability = (id: string) => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }
    deleteLiability(id);
  };

  const showManagedSourceMessage = (source: 'budget' | 'portfolio') => {
    toast({
      title: isArabic ? 'عنصر متزامن' : 'Synced item',
      description: source === 'budget'
        ? (isArabic
          ? 'هذا الأصل مُدار من Budget & Planning. انتقل إلى هناك لإجراء التغييرات.'
          : 'This asset is managed in Budget & Planning. Go there to make changes.')
        : (isArabic
          ? 'هذا الأصل مُدار من Portfolio. انتقل إلى هناك لإجراء التغييرات.'
          : 'This asset is managed in Portfolio. Go there to make changes.'),
    });
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'صافي الثروة' : 'Net Worth'}</h1>
            <p className="text-muted-foreground">
              {isArabic ? 'تتبع أصولك والتزاماتك' : 'Track your assets and liabilities'}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={!isSignedIn}>
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'إضافة أصل' : 'Add Asset'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'إضافة أصل جديد' : 'Add New Asset'}</DialogTitle>
                  <DialogDescription>
                    {isArabic ? 'أضف أصلاً جديداً إلى ملفك المالي.' : 'Add a new asset to your financial profile.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الاسم' : 'Name'}</Label>
                    <Input value={newAsset.name} onChange={(e) => setNewAsset((current) => ({ ...current, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                    <Select value={newAsset.category} onValueChange={(value) => setNewAsset((current) => ({ ...current, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real_estate">{isArabic ? 'عقارات' : 'Real Estate'}</SelectItem>
                        <SelectItem value="vehicle">{isArabic ? 'مركبات' : 'Vehicles'}</SelectItem>
                        <SelectItem value="other">{isArabic ? 'أخرى' : 'Other'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'القيمة (SAR)' : 'Value (SAR)'}</Label>
                    <Input type="number" value={newAsset.value} onChange={(e) => setNewAsset((current) => ({ ...current, value: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddAsset(false)}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleAddAsset} disabled={!isSignedIn}>
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddLiability} onOpenChange={setShowAddLiability}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={!isSignedIn}>
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'إضافة التزام' : 'Add Liability'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? 'إضافة التزام جديد' : 'Add New Liability'}</DialogTitle>
                  <DialogDescription>
                    {isArabic ? 'أضف التزاماً جديداً لمتابعة صافي الثروة بدقة.' : 'Add a new liability to keep your net worth accurate.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الاسم' : 'Name'}</Label>
                    <Input value={newLiability.name} onChange={(e) => setNewLiability((current) => ({ ...current, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الفئة' : 'Category'}</Label>
                    <Select value={newLiability.category} onValueChange={(value) => setNewLiability((current) => ({ ...current, category: value }))}>
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
                    <Input type="number" value={newLiability.balance} onChange={(e) => setNewLiability((current) => ({ ...current, balance: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddLiability(false)}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleAddLiability} disabled={!isSignedIn}>
                    {isArabic ? 'إضافة' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!isSignedIn && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {isArabic
                ? 'الضيف يرى بيانات تجريبية فقط ولا يمكنه إضافة أو حذف الأصول والالتزامات.'
                : 'Guests can only browse the demo state here. Adding or deleting assets and liabilities requires an account.'}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5" data-testid="networth-liquid">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-emerald-500/20 p-3">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'الأصول السائلة' : 'Liquid assets'}</p>
                  <p className="text-2xl font-bold text-emerald-500">{formatCurrency(snapshot.netWorth.liquid, 'SAR', locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-sky-500/5" data-testid="networth-locked">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-sky-500/20 p-3">
                  <Landmark className="w-6 h-6 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'الادخار المقفل / عوائد' : 'Locked savings / Awaeed'}</p>
                  <p className="text-2xl font-bold text-sky-500">{formatCurrency(snapshot.netWorth.locked, 'SAR', locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5" data-testid="networth-investments">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-violet-500/20 p-3">
                  <Briefcase className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'الاستثمارات' : 'Investments'}</p>
                  <p className="text-2xl font-bold text-violet-500">{formatCurrency(snapshot.netWorth.investments, 'SAR', locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-500/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-rose-500/20 p-3">
                  <TrendingDown className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'الالتزامات' : 'Obligations'}</p>
                  <p className="text-2xl font-bold text-rose-500">{formatCurrency(snapshot.netWorth.obligations, 'SAR', locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gold/20 bg-gradient-to-br from-gold/10 to-gold/5" data-testid="networth-net">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-gold/20 p-3">
                  <Wallet className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'صافي الثروة' : 'Net Worth'}</p>
                  <p className="text-2xl font-bold text-gold">{formatCurrency(snapshot.netWorth.net, 'SAR', locale)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    {isArabic ? 'إجمالي الأصول - إجمالي الالتزامات' : 'Total assets - total liabilities'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-amber-500/20 p-3">
                  <Wallet className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isArabic ? 'صافي الثروة السائلة' : 'Liquid net worth'}</p>
                  <p className="text-2xl font-bold text-amber-500">{formatCurrency(snapshot.netWorth.liquidNetWorth, 'SAR', locale)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">{isArabic ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="assets">{isArabic ? 'الأصول' : 'Assets'}</TabsTrigger>
            <TabsTrigger value="liabilities">{isArabic ? 'الالتزامات' : 'Liabilities'}</TabsTrigger>
            <TabsTrigger value="history">{isArabic ? 'السجل' : 'History'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'اتجاه صافي الثروة' : 'Net Worth Trend'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyData.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {isArabic ? 'لا توجد بيانات تاريخية بعد.' : 'No history available yet.'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historyData.length === 1 && (
                        <p className="text-xs text-muted-foreground">
                          {isArabic
                            ? 'توجد نقطة بيانات واحدة فقط حالياً، لذلك يظهر الرسم كملخص للحالة الحالية.'
                            : 'There is only one saved snapshot right now, so this chart shows the current point only.'}
                        </p>
                      )}
                      <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData}>
                          <defs>
                            <linearGradient id="netWorthGradientFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => [formatCurrency(value, 'SAR', locale), '']} />
                          <Area
                            type="monotone"
                            dataKey="netWorth"
                            stroke="var(--gold)"
                            strokeWidth={2}
                            fill="url(#netWorthGradientFill)"
                            dot={historyData.length === 1 ? { r: 5, fill: 'var(--gold)', strokeWidth: 0 } : false}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{isArabic ? 'الأصول مقابل الالتزامات' : 'Assets vs Liabilities'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyData.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {isArabic ? 'أضف أصولاً أو التزامات لعرض المقارنة.' : 'Add assets or liabilities to see the comparison.'}
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => [formatCurrency(value, 'SAR', locale), '']} />
                          <Legend />
                          <Bar dataKey="assets" name={isArabic ? 'الأصول' : 'Assets'} fill="var(--chart-2)" radius={[4, 4, 0, 0]} minPointSize={6} />
                          <Bar dataKey="liabilities" name={isArabic ? 'الالتزامات' : 'Liabilities'} fill="#ef4444" radius={[4, 4, 0, 0]} minPointSize={6} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'نسبة الأصول للالتزامات' : 'Assets to Liabilities Ratio'}</p>
                      <p className="text-2xl font-bold">{ratio > 0 ? `${ratio.toFixed(2)}x` : '--'}</p>
                    </div>
                    <Progress value={ratioProgress} className="w-20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'التغير الشهري' : 'Monthly Change'}</p>
                      <p className={`text-2xl font-bold ${monthlyChange !== null ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {monthlyChange !== null ? `${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%` : '--'}
                      </p>
                    </div>
                    <ArrowUpRight className={`w-8 h-8 ${monthlyChange !== null ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'التغير السنوي' : 'Yearly Change'}</p>
                      <p className={`text-2xl font-bold ${yearlyChange !== null ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {yearlyChange !== null ? `${yearlyChange >= 0 ? '+' : ''}${yearlyChange.toFixed(1)}%` : '--'}
                      </p>
                    </div>
                    <ArrowUpRight className={`w-8 h-8 ${yearlyChange !== null ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Monthly Cash Flow — read-only, sourced from Budget & Planning */}
            {(monthlyIncome > 0 || monthlyExpenses > 0 || monthlyObligations > 0) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {isArabic ? 'التدفق النقدي الشهري' : 'Monthly Cash Flow'}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {isArabic
                      ? 'مصدر البيانات: Budget & Planning — للتعديل انتقل إلى تلك الصفحة.'
                      : 'Data sourced from Budget & Planning — go there to make changes.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? 'الدخل الشهري' : 'Monthly Income'}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-emerald-500">
                        {formatCurrency(monthlyIncome, 'SAR', locale)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? 'المصروفات الشهرية' : 'Monthly Expenses'}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-rose-500">
                        -{formatCurrency(monthlyExpenses, 'SAR', locale)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? 'الالتزامات الشهرية' : 'Monthly Obligations'}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-orange-500">
                        -{formatCurrency(monthlyObligations, 'SAR', locale)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? 'صافي التدفق النقدي' : 'Net Cash Flow'}
                      </p>
                      <p
                        className={`mt-1 text-xl font-semibold ${
                          monthlyCashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {monthlyCashFlow >= 0 ? '+' : ''}
                        {formatCurrency(monthlyCashFlow, 'SAR', locale)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assets">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'قائمة الأصول' : 'Assets List'}</CardTitle>
                <CardDescription>{isArabic ? `${displayAssets.length} أصل` : `${displayAssets.length} assets`}</CardDescription>
              </CardHeader>
              <CardContent>
                {displayAssets.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {isArabic ? 'لا توجد أصول بعد.' : 'No assets added yet.'}
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {displayAssets.map((asset, index) => {
                        const isSavingsAsset = asset.id.startsWith('savings-');
                        const isPortfolioAsset = asset.id === 'portfolio-investments';
                        const isLockedAsset = 'locked' in asset && Boolean(asset.locked);

                        return (
                          <motion.div
                            key={asset.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-4 rounded-lg bg-muted/50 p-4"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                              {assetIcons[asset.category]}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{asset.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {categoryLabels[asset.category]?.[isArabic ? 'ar' : 'en']}
                                </Badge>
                                {isSavingsAsset ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <Link2 className="mr-1 h-3 w-3" />
                                    {isArabic ? 'مدخرات متزامنة' : 'Synced savings'}
                                  </Badge>
                                ) : null}
                                {isPortfolioAsset ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <Link2 className="mr-1 h-3 w-3" />
                                    {isArabic ? 'استثمار متزامن' : 'Synced investment'}
                                  </Badge>
                                ) : null}
                              </div>
                              {isLockedAsset ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {isSavingsAsset
                                    ? (isArabic ? 'هذا الأصل مُدار من قسم Budget & Planning.' : 'This asset is managed in Budget & Planning.')
                                    : (isArabic ? 'هذا الرصيد يُحسب تلقائيًا من قسم Portfolio.' : 'This asset is calculated automatically from Portfolio.')}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(asset.value, asset.currency, locale)}</p>
                              <p className="text-xs text-muted-foreground">
                                {totalAssets > 0 ? `${((asset.value / totalAssets) * 100).toFixed(1)}%` : '--'}
                              </p>
                            </div>
                            {isLockedAsset ? (
                              <Button variant="ghost" size="icon" onClick={() => showManagedSourceMessage(isSavingsAsset ? 'budget' : 'portfolio')}>
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={!isSignedIn}>
                                    <Trash2 className="w-4 h-4 text-rose-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{isArabic ? 'حذف أصل؟' : 'Delete Asset?'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {isArabic ? 'هل تريد حذف هذا الأصل؟' : 'Are you sure you want to delete this asset?'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAsset(asset.id)} className="bg-rose-500 hover:bg-rose-600">
                                      {isArabic ? '???' : 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liabilities">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'قائمة الالتزامات' : 'Liabilities List'}</CardTitle>
                <CardDescription>{isArabic ? `${displayLiabilities.length} التزام` : `${displayLiabilities.length} liabilities`}</CardDescription>
              </CardHeader>
              <CardContent>
                {displayLiabilities.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {isArabic ? 'لا توجد التزامات بعد.' : 'No liabilities added yet.'}
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {displayLiabilities.map((liability, index) => {
                        const isLockedLiability = 'locked' in liability && Boolean(liability.locked);
                        return (
                          <motion.div
                            key={liability.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-4 rounded-lg bg-muted/50 p-4"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                              {liabilityIcons[liability.category]}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{liability.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {categoryLabels[liability.category]?.[isArabic ? 'ar' : 'en']}
                                </Badge>
                                {isLockedLiability ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <Link2 className="mr-1 h-3 w-3" />
                                    {isArabic ? 'التزام متزامن' : 'Synced obligation'}
                                  </Badge>
                                ) : null}
                              </div>
                              {isLockedLiability ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {isArabic ? 'هذا الالتزام مُدار من قسم Budget & Planning.' : 'This liability is managed in Budget & Planning.'}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(liability.balance, liability.currency, locale)}</p>
                              <p className="text-xs text-muted-foreground">
                                {totalLiabilities > 0 ? `${((liability.balance / totalLiabilities) * 100).toFixed(1)}%` : '--'}
                              </p>
                            </div>
                            {isLockedLiability ? (
                              <Button variant="ghost" size="icon" onClick={() => showManagedSourceMessage('budget')}>
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={!isSignedIn}>
                                    <Trash2 className="w-4 h-4 text-rose-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{isArabic ? 'حذف التزام؟' : 'Delete Liability?'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {isArabic ? 'هل تريد حذف هذا الالتزام؟' : 'Are you sure you want to delete this liability?'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteLiability(liability.id)} className="bg-rose-500 hover:bg-rose-600">
                                      {isArabic ? '???' : 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    {isArabic ? 'سجل صافي الثروة' : 'Net Worth History'}
                  </CardTitle>
                  <Badge variant="secondary">
                    {isDemoMode ? (isArabic ? 'آخر 6 أشهر' : 'Last 6 months') : (isArabic ? 'البيانات الحالية' : 'Current data')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {historyData.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {isArabic ? 'لا توجد أي قيم محفوظة بعد.' : 'There are no saved values yet.'}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium">{isArabic ? 'الفترة' : 'Period'}</th>
                          <th className="p-3 text-right text-sm font-medium">{isArabic ? 'الأصول' : 'Assets'}</th>
                          <th className="p-3 text-right text-sm font-medium">{isArabic ? 'الالتزامات' : 'Liabilities'}</th>
                          <th className="p-3 text-right text-sm font-medium">{isArabic ? 'صافي الثروة' : 'Net Worth'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {historyData.map((row, index) => (
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
