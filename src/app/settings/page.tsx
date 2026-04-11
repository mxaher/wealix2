'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
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
  RefreshCw,
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
import { AIModelSelector } from '@/components/shared';
import { useAppStore } from '@/store/useAppStore';
import { useAIModelStore } from '@/store/useAIModelStore';
import { useAgentTaskStore } from '@/store/useAgentTaskStore';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';
import { useTheme } from 'next-themes';
import { toast } from '@/hooks/use-toast';
import { getStartPageHref, type StartPage } from '@/lib/start-page';
import { clearPreferredTrialPlan } from '@/lib/trial-selection';

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
    startPage,
    setStartPage,
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
  const loadAIModels = useAIModelStore((state) => state.loadFromBackend);
  const resetAIModels = useAIModelStore((state) => state.reset);
  const resetFinancialSettings = useFinancialSettingsStore((state) => state.reset);
  const resetAgentTasks = useAgentTaskStore((state) => state.reset);

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
        ? (isArabic ? 'تم عزل بياناتك الحقيقية والانتقال إلى مساحة العرض التجريبي بأمان.' : 'Your live workspace is preserved and the app switched to an isolated demo sandbox.')
        : (isArabic ? 'تمت استعادة بياناتك الحقيقية بأمان.' : 'Your live workspace has been restored safely.'),
    });
  };

  const handleNotificationChange = (
    key:
      | 'email'
      | 'push'
      | 'sms'
      | 'whatsapp'
      | 'priceAlerts'
      | 'budgetAlerts'
      | 'planningUpdates'
      | 'statusChanges'
      | 'reminders'
      | 'weeklyDigest',
    value: boolean
  ) => { updateNotificationPreferences({ [key]: value }); };

  const handleStartPageChange = (value: StartPage) => {
    if (!isSignedIn) { requireAccount(); return; }
    setStartPage(value);
    toast({
      title: isArabic ? 'تم تحديث صفحة البدء' : 'Start page updated',
      description: isArabic
        ? 'سيتم فتح التطبيق على الصفحة التي اخترتها في المرة القادمة.'
        : 'The app will open on your selected page the next time you enter it.',
    });
  };

  const handleDeleteAllData = () => {
    if (!isSignedIn) { requireAccount(); return; }

    clearAllData();
    resetFinancialSettings();
    resetAIModels();
    resetAgentTasks();

    if (typeof window !== 'undefined') {
      clearPreferredTrialPlan();

      const localKeysToRemove = [
        'wealix-storage-v4',
        'wealthos-storage',
        'wealix-storage-v3',
        'wealix-financial-settings-v1',
        'wealix-financial-settings-broadcast',
        'wealix-ai-models-v1',
        'wealix-ai-models-broadcast',
        'wealix-agent-command-center-v1',
        'wealix-agent-command-center-broadcast',
        'wealix-advisor-chat-v1',
        'wealix-cookie-consent',
      ];

      for (const key of localKeysToRemove) {
        window.localStorage.removeItem(key);
      }
    }

    setTheme('light');
    router.replace('/settings?tab=profile');
    toast({
      title: isArabic ? 'تم حذف البيانات' : 'All data cleared',
      description: isArabic
        ? 'تمت إعادة تعيين جميع بيانات التطبيق بالكامل.'
        : 'All app data has been fully reset across all stores.',
      variant: 'destructive',
    });
  };

  useEffect(() => {
    void loadAIModels();
  }, [loadAIModels]);

  useEffect(() => {
    if (activeTab === 'subscription') {
      router.replace('/settings/billing');
    }
  }, [activeTab, router]);

  return (
    <DashboardShell>
      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        lang={locale}
        className={`settings-layout mx-auto max-w-4xl space-y-6 ${isArabic ? 'font-arabic text-end' : 'font-sans text-start'}`}
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <SettingsIcon className="icon-no-flip h-6 w-6" />
            {isArabic ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة حسابك وتفضيلاتك' : 'Manage your account and preferences'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="profile" className="btn-with-icon">
              <User className="icon-no-flip me-2 h-4 w-4" />
              {isArabic ? 'الملف الشخصي' : 'Profile'}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="btn-with-icon">
              <Globe className="icon-no-flip me-2 h-4 w-4" />
              {isArabic ? 'التفضيلات' : 'Preferences'}
            </TabsTrigger>
            <TabsTrigger value="subscription" className="btn-with-icon">
              <CreditCard className="icon-no-flip me-2 h-4 w-4" />
              {isArabic ? 'الاشتراك' : 'Subscription'}
            </TabsTrigger>
            <TabsTrigger value="data" className="btn-with-icon">
              <Download className="icon-no-flip me-2 h-4 w-4" />
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
                  <div className="wealix-avatar-frame flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
                    <UserButton
                      appearance={{
                        elements: {
                          rootBox: 'flex h-20 w-20 items-center justify-center',
                          userButtonBox: 'flex h-20 w-20 items-center justify-center',
                          userButtonTrigger: 'flex h-20 w-20 items-center justify-center rounded-full p-0',
                          avatarBox: 'h-20 w-20 overflow-hidden rounded-full',
                          avatarImage: 'h-full w-full object-cover object-center',
                        },
                      }}
                    />
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

            {/* ── Financial Profile ── */}
            <FinancialProfileSection isArabic={isArabic} isSignedIn={isSignedIn} />
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
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'صفحة البدء' : 'Start Page'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic
                        ? 'اختر الصفحة التي تفتح أولاً عند دخول التطبيق.'
                        : 'Choose which page opens first when you enter the app.'}
                    </p>
                  </div>
                  <Select value={startPage} onValueChange={(value) => handleStartPageChange(value as StartPage)} disabled={!isSignedIn}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dashboard">{isArabic ? 'لوحة التحكم' : 'Dashboard'}</SelectItem>
                      <SelectItem value="portfolio">{isArabic ? 'المحفظة' : 'Portfolio'}</SelectItem>
                      <SelectItem value="advisor">{isArabic ? 'المستشار الذكي' : 'AI Advisor'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'الرابط الحالي:' : 'Current destination:'}{' '}
                  <Link href={getStartPageHref(startPage)} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {getStartPageHref(startPage)}
                  </Link>
                </p>
                <Separator />
                <div className="space-y-3 rounded-xl border p-4">
                  <div>
                    <Label>{isArabic ? 'تفضيلات الذكاء الاصطناعي' : 'AI Preferences'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic
                        ? 'اختر النموذج الذي يستخدمه وائل في المحادثة والتحليل.'
                        : 'Choose which model Wael uses for chat and analysis.'}
                    </p>
                  </div>
                  <AIModelSelector isArabic={isArabic} />
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
                      className={`rounded-xl border p-4 text-start transition-colors ${
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
                      className={`rounded-xl border p-4 text-start transition-colors ${
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
                  { key: 'sms' as const, en: 'SMS Notifications', ar: 'إشعارات الرسائل النصية', descEn: 'Deliver reminders and alerts over SMS via sent.dm', descAr: 'إرسال التذكيرات والتنبيهات عبر الرسائل النصية من خلال sent.dm' },
                  { key: 'whatsapp' as const, en: 'WhatsApp Notifications', ar: 'إشعارات واتساب', descEn: 'Send planning updates and reminders in WhatsApp', descAr: 'إرسال تحديثات التخطيط والتذكيرات عبر واتساب' },
                  { key: 'priceAlerts' as const, en: 'Price Alerts', ar: 'تنبيهات الأسعار', descEn: 'Notifications when price targets are hit', descAr: 'إشعارات عند وصول السعر للهدف' },
                  { key: 'budgetAlerts' as const, en: 'Budget Alerts', ar: 'تنبيهات الميزانية', descEn: 'Notifications when budget limits are approaching', descAr: 'إشعارات عند اقتراب الميزانية من الحد' },
                  { key: 'planningUpdates' as const, en: 'Planning Updates', ar: 'تحديثات التخطيط', descEn: 'Daily digest and planning status updates', descAr: 'الموجز اليومي وتغييرات حالة التخطيط' },
                  { key: 'statusChanges' as const, en: 'Status Changes', ar: 'تغييرات الحالة', descEn: 'Important changes to obligations or execution state', descAr: 'التغييرات المهمة في الالتزامات أو حالة التنفيذ' },
                  { key: 'reminders' as const, en: 'Reminders', ar: 'التذكيرات', descEn: 'Due soon reminders for bills and actions', descAr: 'تذكيرات الاستحقاقات والإجراءات القريبة' },
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
                <Separator />
                <div className="space-y-2">
                  <Label>{isArabic ? 'رقم الجوال الأساسي' : 'Primary phone number'}</Label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    dir="ltr"
                    value={notificationPreferences.phoneNumber}
                    onChange={(event) =>
                      updateNotificationPreferences({
                        phoneNumber: event.target.value,
                        ...(notificationPreferences.useSamePhoneNumberForWhatsApp
                          ? { whatsappNumber: event.target.value }
                          : {}),
                      })
                    }
                    disabled={!isSignedIn}
                    placeholder="+9665XXXXXXXX"
                  />
                  <p className="text-sm text-muted-foreground">
                    {isArabic
                      ? 'يُستخدم هذا الرقم للرسائل النصية، ويمكن استخدامه أيضاً لواتساب.'
                      : 'This number is used for SMS and can also be reused for WhatsApp.'}
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <Label>{isArabic ? 'استخدام نفس الرقم لواتساب' : 'Use same number for WhatsApp'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic
                        ? 'عند التفعيل، سيتم استخدام رقم الجوال الأساسي نفسه لرسائل واتساب.'
                        : 'When enabled, WhatsApp will use the same primary phone number.'}
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.useSamePhoneNumberForWhatsApp}
                    onCheckedChange={(checked) =>
                      updateNotificationPreferences({
                        useSamePhoneNumberForWhatsApp: checked,
                        ...(checked ? { whatsappNumber: notificationPreferences.phoneNumber } : {}),
                      })
                    }
                    disabled={!isSignedIn}
                  />
                </div>
                {!notificationPreferences.useSamePhoneNumberForWhatsApp && (
                  <div className="space-y-2">
                    <Label>{isArabic ? 'رقم واتساب المخصص' : 'Dedicated WhatsApp number'}</Label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      dir="ltr"
                      value={notificationPreferences.whatsappNumber}
                      onChange={(event) => updateNotificationPreferences({ whatsappNumber: event.target.value })}
                      disabled={!isSignedIn}
                      placeholder="+9665XXXXXXXX"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{isArabic ? 'القناة المفضلة' : 'Preferred delivery channel'}</Label>
                  <Select
                    value={notificationPreferences.preferredChannel}
                    onValueChange={(value) =>
                      updateNotificationPreferences({ preferredChannel: value as 'push' | 'email' | 'sms' | 'whatsapp' })
                    }
                    disabled={!isSignedIn}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">{isArabic ? 'داخل التطبيق' : 'In-app push'}</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Subscription ── */}
          <TabsContent value="subscription">
            <Card>
              <CardContent className="flex items-center justify-between gap-4 p-6">
                <div>
                  <p className="font-semibold">
                    {isArabic ? 'جارٍ فتح صفحة الفوترة الجديدة…' : 'Opening the new billing page…'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isArabic
                      ? 'تم نقل إدارة الاشتراك إلى صفحة فوترة مخصصة حتى تعمل التجربة وتغيير الخطة بشكل صحيح.'
                      : 'Subscription management has moved to the dedicated billing page so trials and plan changes work correctly.'}
                  </p>
                </div>
                <Button asChild className="rounded-xl">
                  <Link href="/settings/billing">
                    {isArabic ? 'فتح الفوترة' : 'Open billing'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
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

// ─── Financial Profile Section ────────────────────────────────────────────────

function FinancialProfileSection({ isArabic, isSignedIn }: { isArabic: boolean; isSignedIn: boolean }) {
  const data = useFinancialSettingsStore((state) => state.data);
  const updateFields = useFinancialSettingsStore((state) => state.updateFields);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    riskTolerance: data.riskProfile ?? '',
    retirementAge: data.fireTargetAge?.toString() ?? '',
  });

  useEffect(() => {
    setForm({
      riskTolerance: data.riskProfile ?? '',
      retirementAge: data.fireTargetAge?.toString() ?? '',
    });
  }, [data]);

  async function save() {
    if (!isSignedIn) return;
    setSaving(true);
    try {
      updateFields({
        riskProfile:
          form.riskTolerance === 'conservative' || form.riskTolerance === 'aggressive'
            ? form.riskTolerance
            : 'moderate',
        fireTargetAge: form.retirementAge ? parseInt(form.retirementAge, 10) : 60,
      });
      toast({ title: isArabic ? 'تم الحفظ' : 'Saved', description: isArabic ? 'تم تحديث ملفك المالي.' : 'Financial profile updated.' });
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', description: isArabic ? 'فشل الحفظ.' : 'Save failed.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isArabic ? 'الملف المالي' : 'Financial Profile'}</CardTitle>
        <CardDescription>
          {isArabic
            ? 'يُستخدم هذا لتخصيص توصيات الذكاء الاصطناعي وتحليلات المحفظة.'
            : 'Used to personalise AI recommendations and portfolio analysis.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{isArabic ? 'تحمّل المخاطر' : 'Risk Tolerance'}</Label>
          <div className="flex flex-wrap gap-2">
            {(['conservative', 'moderate', 'aggressive'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm((p) => ({ ...p, riskTolerance: r }))}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  form.riskTolerance === r ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {isArabic
                  ? { conservative: 'محافظ', moderate: 'معتدل', aggressive: 'عدواني' }[r]
                  : { conservative: 'Conservative', moderate: 'Moderate', aggressive: 'Aggressive' }[r]}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{isArabic ? 'سن التقاعد المستهدف' : 'Target Retirement Age'}</Label>
            <input
              type="number"
              min="30"
              max="100"
              value={form.retirementAge}
              onChange={(e) => setForm((p) => ({ ...p, retirementAge: e.target.value }))}
              placeholder="60"
              className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${isArabic ? 'text-end' : 'text-start'}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isArabic ? 'التوزيع الحالي' : 'Current Allocation'}</Label>
            <div className="rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
              {data.investmentAllocation.length > 0
                ? data.investmentAllocation.map((entry) => `${entry.label} ${entry.percentage.toFixed(0)}%`).join(' • ')
                : (isArabic ? 'لا يوجد بعد' : 'Not set yet')}
            </div>
          </div>
        </div>

        <Button onClick={save} disabled={saving || !isSignedIn} className="btn-with-icon w-full">
          {saving ? <RefreshCw className="icon-no-flip me-2 h-4 w-4 animate-spin" /> : null}
          {isArabic ? 'حفظ الملف المالي' : 'Save Financial Profile'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          {isArabic
            ? 'هذه البيانات تُستخدم فقط لتخصيص التحليل المالي. لا تُشارك مع أطراف خارجية.'
            : 'This data is used only to personalise financial analysis. Never shared with third parties.'}
        </p>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  );
}
