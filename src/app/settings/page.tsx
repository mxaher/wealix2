'use client';

import { Suspense, useMemo, useState } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Bell,
  Database,
  CreditCard,
  Download,
  Crown,
  LogOut,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DashboardShell } from '@/components/layout';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from 'next-themes';
import { toast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Pricing data — kept in sync with LandingPageClient.tsx pricingByCycle
// ---------------------------------------------------------------------------
const pricingByCycle = {
  monthly: [
    {
      id: 'core',
      name: 'Core',
      price: 10,
      suffix: { en: '/mo', ar: '/شهرياً' },
      savings: null,
      features: {
        en: [
          'Income, expenses, budget, and net worth',
          'Portfolio tracking and FIRE planning',
          'Clean financial workspace',
          '14-day plan trial',
        ],
        ar: [
          'الدخل والمصروفات والميزانية وصافي الثروة',
          'متابعة المحفظة وتخطيط FIRE',
          'مساحة مالية منظمة وواضحة',
          'تجربة 14 يوماً للخطة المختارة',
        ],
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 15,
      suffix: { en: '/mo', ar: '/شهرياً' },
      savings: null,
      features: {
        en: [
          'Everything in Core',
          'AI advisor after payment',
          'Portfolio AI analysis after payment',
          'Advanced reports after payment',
        ],
        ar: [
          'كل ما في Core',
          'المستشار الذكي بعد الدفع',
          'تحليل المحفظة بالذكاء الاصطناعي بعد الدفع',
          'تقارير متقدمة بعد الدفع',
        ],
      },
    },
  ],
  annual: [
    {
      id: 'core',
      name: 'Core',
      price: 100,
      suffix: { en: '/year', ar: '/سنوياً' },
      savings: { en: 'Save $20/yr', ar: 'وفّر 20$ سنوياً' },
      features: {
        en: [
          'Income, expenses, budget, and net worth',
          'Portfolio tracking and FIRE planning',
          'Clean financial workspace',
          '14-day plan trial',
        ],
        ar: [
          'الدخل والمصروفات والميزانية وصافي الثروة',
          'متابعة المحفظة وتخطيط FIRE',
          'مساحة مالية منظمة وواضحة',
          'تجربة 14 يوماً للخطة المختارة',
        ],
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 150,
      suffix: { en: '/year', ar: '/سنوياً' },
      savings: { en: 'Save $30/yr', ar: 'وفّر 30$ سنوياً' },
      features: {
        en: [
          'Everything in Core',
          'AI advisor after payment',
          'Portfolio AI analysis after payment',
          'Advanced reports after payment',
        ],
        ar: [
          'كل ما في Core',
          'المستشار الذكي بعد الدفع',
          'تحليل المحفظة بالذكاء الاصطناعي بعد الدفع',
          'تقارير متقدمة بعد الدفع',
        ],
      },
    },
  ],
} as const;

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    locale,
    setLocale,
    user,
    notificationPreferences,
    updateNotificationPreferences,
    clearAllData,
    appMode,
    setAppMode,
  } = useAppStore();
  const { user: clerkUser } = useUser();
  const isSignedIn = Boolean(clerkUser);
  const { theme, setTheme } = useTheme();
  const isArabic = locale === 'ar';

  const metadata = clerkUser?.publicMetadata as Record<string, unknown> | undefined;
  const actualPlan =
    metadata?.subscriptionTier === 'core' || metadata?.subscriptionTier === 'pro'
      ? (metadata.subscriptionTier as 'core' | 'pro')
      : 'none';
  const activeTrial =
    metadata?.trialStatus === 'active' &&
    (metadata?.trialPlan === 'core' || metadata?.trialPlan === 'pro') &&
    typeof metadata?.trialEndsAt === 'string' &&
    Number.isFinite(new Date(metadata.trialEndsAt).getTime()) &&
    new Date(metadata.trialEndsAt).getTime() > Date.now();
  const currentPlan = actualPlan;

  const validTabs = useMemo(() => ['profile', 'preferences', 'subscription', 'data'] as const, []);
  const activeTabParam = searchParams.get('tab');
  const initialTab = validTabs.find((v) => v === activeTabParam) ?? 'profile';
  const [activeTab, setActiveTabState] = useState<(typeof validTabs)[number]>(initialTab);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const setActiveTab = (tab: string) => {
    const nextTab = validTabs.find((v) => v === tab) ?? 'profile';
    setActiveTabState(nextTab);
    router.replace(`/settings?tab=${nextTab}`, { scroll: false });
  };

  const requireAccount = () => {
    toast({
      title: isArabic ? 'يتطلب تسجيل الدخول' : 'Sign in required',
      description: isArabic
        ? 'يمكن للضيف تصفح البيانات التجريبية فقط. أنشئ حساباً لاستخدام الميزات.'
        : 'Guests can browse demo data only. Create an account to use features.',
      variant: 'destructive',
    });
  };

  const handleExportData = () => {
    if (!isSignedIn) { requireAccount(); return; }
    const data = {
      user,
      assets: useAppStore.getState().assets,
      liabilities: useAppStore.getState().liabilities,
      portfolio: useAppStore.getState().portfolioHoldings,
      budget: useAppStore.getState().budgetLimits,
      expenses: useAppStore.getState().expenseEntries,
      income: useAppStore.getState().incomeEntries,
      receipts: useAppStore.getState().receiptScans,
      notificationPreferences,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wealix-data-export.json';
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: isArabic ? 'تم التصدير' : 'Export complete',
      description: isArabic ? 'تم تنزيل نسخة من بياناتك.' : 'A copy of your data has been downloaded.',
    });
  };

  const handleModeChange = (mode: 'demo' | 'live') => {
    if (!isSignedIn) { requireAccount(); return; }
    setAppMode(mode);
    setTheme('light');
    toast({
      title: mode === 'demo'
        ? (isArabic ? 'تم تفعيل الوضع التجريبي' : 'Demo mode enabled')
        : (isArabic ? 'تم تفعيل الوضع المباشر' : 'Live mode enabled'),
      description: mode === 'demo'
        ? (isArabic ? 'تمت استعادة بيانات العرض التجريبي الحالية.' : 'The sample demo dataset has been restored.')
        : (isArabic ? 'تم تنظيف بيانات العرض التجريبي والتطبيق جاهزاً لبياناتك الحقيقية.' : 'Sample demo data was cleared and the app is ready for real entries.'),
    });
  };

  const handleNotificationChange = (
    key: 'email' | 'push' | 'priceAlerts' | 'budgetAlerts' | 'weeklyDigest',
    value: boolean
  ) => { updateNotificationPreferences({ [key]: value }); };

  const handleDeleteAllData = () => {
    clearAllData();
    setTheme('light');
    router.replace('/settings?tab=profile');
    toast({
      title: isArabic ? 'تم حذف البيانات' : 'All data deleted',
      description: isArabic ? 'تمت إعادة تعيين بيانات التطبيق المحلية.' : 'The app has been reset and local data was cleared.',
      variant: 'destructive',
    });
  };

  const handleSubscribe = (planId: string) => {
    toast({
      title: isArabic ? 'قريباً' : 'Coming Soon',
      description: isArabic
        ? `سيتوفر الدفع لخطة ${planId === 'core' ? 'Core' : 'Pro'} قريباً.`
        : `Payment for the ${planId === 'core' ? 'Core' : 'Pro'} plan is coming soon.`,
    });
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            {isArabic ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة حسابك وتفضيلاتك' : 'Manage your account and preferences'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              {isArabic ? 'الملف الشخصي' : 'Profile'}
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Globe className="w-4 h-4 mr-2" />
              {isArabic ? 'التفضيلات' : 'Preferences'}
            </TabsTrigger>
            <TabsTrigger value="subscription">
              <CreditCard className="w-4 h-4 mr-2" />
              {isArabic ? 'الاشتراك' : 'Subscription'}
            </TabsTrigger>
            <TabsTrigger value="data">
              <Download className="w-4 h-4 mr-2" />
              {isArabic ? 'البيانات' : 'Data'}
            </TabsTrigger>
          </TabsList>

          {/* ── Profile ── */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'الملف الشخصي' : 'Profile'}</CardTitle>
                <CardDescription>
                  {isArabic ? 'إدارة معلومات حسابك' : 'Manage your account information'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isSignedIn && (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    {isArabic
                      ? 'أنت تتصفح كضيف في وضع تجريبي للعرض فقط. يمكنك استكشاف الصفحات، لكن تغيير الإعدادات أو استخدام الميزات يتطلب إنشاء حساب Clerk.'
                      : 'You are browsing as a guest in demo mode. You can explore the pages, but changing settings or using features requires a Clerk account.'}
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
                    <UserButton />
                  </div>
                  <div>
                    <p className="font-medium">
                      {clerkUser?.fullName || clerkUser?.firstName || (isArabic ? 'مستخدم Wealix' : 'Wealix User')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {clerkUser?.primaryEmailAddress?.emailAddress || (isArabic ? 'سجّل الدخول لإدارة حسابك' : 'Sign in to manage your account')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isArabic ? 'إدارة الحساب والصورة وكلمة المرور تتم عبر Clerk.' : 'Account identity, avatar, and password are managed by Clerk.'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Link href="/terms" className="transition-colors hover:text-foreground">{isArabic ? 'شروط الخدمة' : 'Terms'}</Link>
                      <span className="text-border">•</span>
                      <Link href="/privacy" className="transition-colors hover:text-foreground">{isArabic ? 'سياسة الخصوصية' : 'Privacy'}</Link>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <Label>{isArabic ? 'اسم الحساب' : 'Account Name'}</Label>
                    <p className="mt-2 font-medium">{clerkUser?.fullName || clerkUser?.firstName || '-'}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <Label>{isArabic ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <p className="mt-2 font-medium">{clerkUser?.primaryEmailAddress?.emailAddress || '-'}</p>
                  </div>
                </div>
                <Separator />
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  {isArabic
                    ? 'إدارة المستخدمين أصبحت عبر Clerk. كل مستخدم Clerk يملك بيانات Wealix مستقلة، والمستخدم الجديد يبدأ بقاعدة بيانات نظيفة في الوضع المباشر.'
                    : 'User management now runs through Clerk. Each Clerk user gets isolated Wealix data, and new users start with a clean live workspace.'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Preferences ── */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'اللغة والمظهر' : 'Language & Appearance'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'اللغة' : 'Language'}</Label>
                    <p className="text-sm text-muted-foreground">{isArabic ? 'اختر لغة الواجهة' : 'Choose interface language'}</p>
                  </div>
                  <Select value={locale} onValueChange={(v) => setLocale(v as 'ar' | 'en')} disabled={!isSignedIn}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'المظهر' : 'Theme'}</Label>
                    <p className="text-sm text-muted-foreground">{isArabic ? 'اختر مظهر التطبيق' : 'Choose application theme'}</p>
                  </div>
                  <Select value={theme} onValueChange={setTheme} disabled={!isSignedIn}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">{isArabic ? 'داكن' : 'Dark'}</SelectItem>
                      <SelectItem value="light">{isArabic ? 'فاتح' : 'Light'}</SelectItem>
                      <SelectItem value="system">{isArabic ? 'تلقائي' : 'System'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Database className="mt-0.5 h-5 w-5 text-gold" />
                    <div>
                      <Label>{isArabic ? 'وضع التطبيق' : 'App Mode'}</Label>
                      <p className="text-sm text-muted-foreground">
                        {isArabic
                          ? 'الوضع التجريبي يعرض البيانات الوهمية الحالية، والوضع المباشر ينظفها لتبدأ ببياناتك الحقيقية.'
                          : 'Demo mode shows the current sample dataset, while Live mode clears it so you can start with real data.'}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleModeChange('demo')}
                      disabled={!isSignedIn}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        appMode === 'demo' ? 'border-gold bg-gold/10' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium">{isArabic ? 'الوضع التجريبي' : 'Demo Mode'}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {isArabic ? 'يعيد تحميل المستخدم التجريبي والبيانات الوهمية الحالية.' : 'Restores the sample user and the current mock dataset.'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('live')}
                      disabled={!isSignedIn}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        appMode === 'live' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium">{isArabic ? 'الوضع المباشر' : 'Live Mode'}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {isArabic ? 'يحذف بيانات العرض التجريبي ويترك التطبيق جاهزاً لإدخالات المستخدم الفعلية.' : 'Clears demo data and leaves the app ready for actual user entries.'}
                      </div>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  {isArabic ? 'الإشعارات' : 'Notifications'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  { key: 'email' as const, en: 'Email Notifications', ar: 'إشعارات البريد الإلكتروني', descEn: 'Receive updates via email', descAr: 'تلقي التحديثات عبر البريد' },
                  { key: 'push' as const, en: 'Push Notifications', ar: 'الإشعارات الفورية', descEn: 'In-app alerts for important events', descAr: 'تنبيهات داخل التطبيق للأحداث المهمة' },
                  { key: 'priceAlerts' as const, en: 'Price Alerts', ar: 'تنبيهات الأسعار', descEn: 'Notifications when price targets are hit', descAr: 'إشعارات عند وصول السعر للهدف' },
                  { key: 'budgetAlerts' as const, en: 'Budget Alerts', ar: 'تنبيهات الميزانية', descEn: 'Notifications when budget limits are approaching', descAr: 'إشعارات عند اقتراب الميزانية من الحد' },
                  { key: 'weeklyDigest' as const, en: 'Weekly Digest', ar: 'الملخص الأسبوعي', descEn: 'Weekly summary of your financial performance', descAr: 'ملخص أسبوعي لأدائك المالي' },
                ] as const).map((item, i, arr) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{isArabic ? item.ar : item.en}</Label>
                        <p className="text-sm text-muted-foreground">{isArabic ? item.descAr : item.descEn}</p>
                      </div>
                      <Switch
                        checked={notificationPreferences[item.key]}
                        onCheckedChange={(c) => handleNotificationChange(item.key, c)}
                        disabled={!isSignedIn}
                      />
                    </div>
                    {i < arr.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Subscription ── */}
          <TabsContent value="subscription">
            <div className="space-y-6">
              {/* Current plan banner */}
              <Card className="bg-gradient-to-br from-gold/10 to-gold/5 border-gold/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-gold/20">
                      <Crown className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'خطتك الحالية' : 'Current Plan'}</p>
                      <p className="text-2xl font-bold">
                        {activeTrial
                          ? (isArabic ? 'تجربة 14 يوماً' : '14-Day Trial')
                          : currentPlan === 'none'
                          ? (isArabic ? 'لا توجد خطة مفعّلة' : 'No active plan')
                          : currentPlan === 'core' ? 'Core' : 'Pro'}
                      </p>
                      {activeTrial && (
                        <p className="text-sm text-muted-foreground">
                          {isArabic
                            ? 'الوصول القياسي مفعّل الآن. الذكاء الاصطناعي والتقارير بعد الدفع.'
                            : 'Standard access is active now. AI and reports unlock after payment.'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Billing cycle toggle */}
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex rounded-full border border-border bg-background p-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {isArabic ? 'شهري' : 'Monthly'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      billingCycle === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {isArabic ? 'سنوي' : 'Annually'}
                  </button>
                </div>
                {billingCycle === 'annual' && (
                  <span className="text-xs font-medium text-accent">
                    {isArabic ? '✦ وفّر حتى 20% مع الاشتراك السنوي' : '✦ Save up to 20% with annual billing'}
                  </span>
                )}
              </div>

              {/* Plan cards */}
              <div className="grid gap-4 md:grid-cols-2">
                {pricingByCycle[billingCycle].map((plan) => (
                  <Card
                    key={plan.id}
                    className={`relative border-2 transition-all ${
                      plan.id === 'pro'
                        ? currentPlan === 'pro'
                          ? 'border-emerald-500'
                          : 'border-border hover:border-emerald-500/50'
                        : currentPlan === 'core'
                        ? 'border-gold'
                        : 'border-border hover:border-gold/50'
                    }`}
                  >
                    {plan.id === 'pro' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground text-xs px-3">
                          {isArabic ? 'الأكثر تقدماً' : 'Most Advanced'}
                        </Badge>
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {((plan.id === 'core' && currentPlan === 'core') ||
                          (plan.id === 'pro' && currentPlan === 'pro')) && (
                          <Badge
                            className={plan.id === 'pro' ? 'bg-emerald-500 text-white text-xs' : 'bg-gold text-black text-xs'}
                          >
                            {isArabic ? 'مفعّل' : 'Active'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-3xl font-bold mt-2">
                        ${plan.price}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          {plan.suffix[isArabic ? 'ar' : 'en']}
                        </span>
                      </p>
                      {plan.savings && (
                        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                          {plan.savings[isArabic ? 'ar' : 'en']}
                        </span>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2 text-sm">
                        {plan.features[isArabic ? 'ar' : 'en'].map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={
                          (plan.id === 'core' && currentPlan === 'core') ||
                          (plan.id === 'pro' && currentPlan === 'pro')
                            ? 'outline'
                            : plan.id === 'pro'
                            ? 'default'
                            : 'outline'
                        }
                        disabled={
                          (plan.id === 'core' && currentPlan === 'core') ||
                          (plan.id === 'pro' && currentPlan === 'pro')
                        }
                        onClick={() => handleSubscribe(plan.id)}
                      >
                        {(plan.id === 'core' && currentPlan === 'core') ||
                        (plan.id === 'pro' && currentPlan === 'pro')
                          ? (isArabic ? 'خطتك الحالية' : 'Current Plan')
                          : activeTrial
                          ? (isArabic ? `اشترك في ${plan.name}` : `Subscribe to ${plan.name}`)
                          : (isArabic ? 'ابدأ تجربة مجانية' : 'Start Free Trial')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {isArabic
                  ? 'بعد إنشاء الحساب تختار Core أو Pro ثم تبدأ تجربة 14 يوماً. إذا لم يتم الدفع بعد انتهاء التجربة، يتوقف الوصول حتى تفعيل الاشتراك.'
                  : 'After signup you choose Core or Pro and start a 14-day trial. If payment is not completed when the trial ends, access pauses until the subscription is activated.'}
              </div>
            </div>
          </TabsContent>

          {/* ── Data ── */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'تصدير البيانات' : 'Export Data'}</CardTitle>
                <CardDescription>
                  {isArabic ? 'قم بتنزيل جميع بياناتك بتنسيق JSON' : 'Download all your data in JSON format'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportData} className="gap-2">
                  <Download className="w-4 h-4" />
                  {isArabic ? 'تصدير جميع البيانات' : 'Export All Data'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-rose-500/30">
              <CardHeader>
                <CardTitle className="text-rose-500">{isArabic ? 'إعادة تعيين البيانات المحلية' : 'Reset Local Data'}</CardTitle>
                <CardDescription>
                  {isArabic
                    ? 'يمسح بيانات Wealix المحلية لهذا المستخدم دون حذف حساب Clerk.'
                    : 'Clears this user\'s local Wealix data without deleting the Clerk account.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleDeleteAllData} disabled={!isSignedIn}>
                  {isArabic ? 'مسح البيانات المحلية' : 'Clear Local Data'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() =>
                    toast({
                      title: isArabic ? 'إدارة الحساب عبر Clerk' : 'Account managed by Clerk',
                      description: isArabic
                        ? 'استخدم أيقونة المستخدم في أعلى الصفحة لإدارة الحساب أو تسجيل الخروج.'
                        : 'Use the user menu in the header to manage the account or sign out.',
                    })
                  }
                >
                  <LogOut className="w-4 h-4" />
                  {isArabic ? 'فتح تعليمات الحساب' : 'Open Account Help'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  );
}
