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
    updateUser,
  } = useAppStore();
  const { user: clerkUser } = useUser();
  const isSignedIn = Boolean(clerkUser);
  const { theme, setTheme } = useTheme();
  const isArabic = locale === 'ar';
  const metadata = clerkUser?.publicMetadata as Record<string, unknown> | undefined;
  const actualPlan =
    metadata?.subscriptionTier === 'core' || metadata?.subscriptionTier === 'pro'
      ? metadata.subscriptionTier
      : 'free';
  const activeTrial =
    metadata?.trialStatus === 'active' &&
    (metadata?.trialPlan === 'core' || metadata?.trialPlan === 'pro') &&
    typeof metadata?.trialEndsAt === 'string' &&
    Number.isFinite(new Date(metadata.trialEndsAt).getTime()) &&
    new Date(metadata.trialEndsAt).getTime() > Date.now();
  const currentPlan = actualPlan;
  const validTabs = useMemo(() => ['profile', 'preferences', 'subscription', 'data'] as const, []);
  const activeTabParam = searchParams.get('tab');
  const initialTab = validTabs.find((value) => value === activeTabParam) ?? 'profile';
  const [activeTab, setActiveTabState] = useState<(typeof validTabs)[number]>(initialTab);

  const handleExportData = () => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'يتطلب تسجيل الدخول' : 'Sign in required',
        description: isArabic
          ? 'يمكن للضيف تصفح البيانات التجريبية فقط. أنشئ حساباً لتصدير بياناتك.'
          : 'Guests can browse the demo only. Create an account to export your data.',
        variant: 'destructive',
      });
      return;
    }

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
      description: isArabic
        ? 'تم تنزيل نسخة من بياناتك.'
        : 'A copy of your data has been downloaded.',
    });
  };

  const setActiveTab = (tab: string) => {
    const nextTab = validTabs.find((value) => value === tab) ?? 'profile';
    setActiveTabState(nextTab);
    router.replace(`/settings?tab=${nextTab}`, { scroll: false });
  };

  const handleModeChange = (mode: 'demo' | 'live') => {
    if (!isSignedIn) {
      toast({
        title: isArabic ? 'الوضع المباشر يتطلب حساباً' : 'Live mode requires an account',
        description: isArabic
          ? 'الضيف يبقى في الوضع التجريبي للعرض فقط. سجّل الدخول لاستخدام بياناتك الحقيقية.'
          : 'Guests stay in demo mode for browsing only. Sign in to use your real data.',
      });
      return;
    }

    setAppMode(mode);
    setTheme('light');

    toast({
      title: mode === 'demo'
        ? (isArabic ? 'تم تفعيل الوضع التجريبي' : 'Demo mode enabled')
        : (isArabic ? 'تم تفعيل الوضع المباشر' : 'Live mode enabled'),
      description: mode === 'demo'
        ? (isArabic
            ? 'تمت استعادة بيانات العرض التجريبي الحالية.'
            : 'The sample demo dataset has been restored.')
        : (isArabic
            ? 'تم تنظيف بيانات العرض التجريبي وأصبح التطبيق جاهزاً لبياناتك الحقيقية.'
            : 'Sample demo data was cleared and the app is ready for real entries.'),
    });
  };

  const handleNotificationChange = (
    key: 'email' | 'push' | 'priceAlerts' | 'budgetAlerts' | 'weeklyDigest',
    value: boolean
  ) => {
    updateNotificationPreferences({ [key]: value });
  };

  const handleDeleteAllData = () => {
    clearAllData();
    setTheme('light');
    router.replace('/settings?tab=profile');

    toast({
      title: isArabic ? 'تم حذف البيانات' : 'All data deleted',
      description: isArabic
        ? 'تمت إعادة تعيين بيانات التطبيق المحلية.'
        : 'The app has been reset and local data was cleared.',
      variant: 'destructive',
    });
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            {isArabic ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة حسابك وتفضيلاتك' : 'Manage your account and preferences'}
          </p>
        </div>

        {/* Tabs */}
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

          {/* Profile Tab */}
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
                      <Link href="/terms" className="transition-colors hover:text-foreground">
                        {isArabic ? 'شروط الخدمة' : 'Terms'}
                      </Link>
                      <span className="text-border">•</span>
                      <Link href="/privacy" className="transition-colors hover:text-foreground">
                        {isArabic ? 'سياسة الخصوصية' : 'Privacy'}
                      </Link>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <Label>{isArabic ? 'اسم الحساب' : 'Account Name'}</Label>
                    <p className="mt-2 font-medium">
                      {clerkUser?.fullName || clerkUser?.firstName || '-'}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <Label>{isArabic ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <p className="mt-2 font-medium">
                      {clerkUser?.primaryEmailAddress?.emailAddress || '-'}
                    </p>
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

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            {/* Language & Theme */}
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'اللغة والمظهر' : 'Language & Appearance'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'اللغة' : 'Language'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'اختر لغة الواجهة' : 'Choose interface language'}
                    </p>
                  </div>
                  <Select value={locale} onValueChange={(v) => setLocale(v as 'ar' | 'en')} disabled={!isSignedIn}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
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
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'اختر مظهر التطبيق' : 'Choose application theme'}
                    </p>
                  </div>
                  <Select value={theme} onValueChange={setTheme} disabled={!isSignedIn}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
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
                        {isArabic
                          ? 'يعيد تحميل المستخدم التجريبي والبيانات الوهمية الحالية.'
                          : 'Restores the sample user and the current mock dataset.'}
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
                        {isArabic
                          ? 'يحذف بيانات العرض التجريبي ويترك التطبيق جاهزاً لإدخالات المستخدم الفعلية.'
                          : 'Clears demo data and leaves the app ready for actual user entries.'}
                      </div>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  {isArabic ? 'الإشعارات' : 'Notifications'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'تلقي التحديثات عبر البريد' : 'Receive updates via email'}
                    </p>
                  </div>
                  <Switch checked={notificationPreferences.email} onCheckedChange={(c) => handleNotificationChange('email', c)} disabled={!isSignedIn} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'الإشعارات الفورية' : 'Push Notifications'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'تنبيهات داخل التطبيق للأحداث المهمة' : 'In-app alerts for important events'}
                    </p>
                  </div>
                  <Switch checked={notificationPreferences.push} onCheckedChange={(c) => handleNotificationChange('push', c)} disabled={!isSignedIn} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'تنبيهات الأسعار' : 'Price Alerts'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'إشعارات عند وصول السعر للهدف' : 'Notifications when price targets are hit'}
                    </p>
                  </div>
                  <Switch checked={notificationPreferences.priceAlerts} onCheckedChange={(c) => handleNotificationChange('priceAlerts', c)} disabled={!isSignedIn} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'تنبيهات الميزانية' : 'Budget Alerts'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'إشعارات عند اقتراب الميزانية من الحد' : 'Notifications when budget limits are approaching'}
                    </p>
                  </div>
                  <Switch checked={notificationPreferences.budgetAlerts} onCheckedChange={(c) => handleNotificationChange('budgetAlerts', c)} disabled={!isSignedIn} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'الملخص الأسبوعي' : 'Weekly Digest'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'ملخص أسبوعي لأدائك المالي' : 'Weekly summary of your financial performance'}
                    </p>
                  </div>
                  <Switch checked={notificationPreferences.weeklyDigest} onCheckedChange={(c) => handleNotificationChange('weeklyDigest', c)} disabled={!isSignedIn} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <div className="space-y-6">
              {/* Current Plan */}
              <Card className="bg-gradient-to-br from-gold/10 to-gold/5 border-gold/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-gold/20">
                        <Crown className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{isArabic ? 'خطتك الحالية' : 'Current Plan'}</p>
                        <p className="text-2xl font-bold">
                          {activeTrial
                            ? (isArabic ? 'تجربة مجانية' : 'Free Trial')
                            : currentPlan === 'free'
                            ? (isArabic ? 'مجاني' : 'Free')
                            : currentPlan === 'core'
                            ? 'Core'
                            : 'Pro'}
                        </p>
                        {activeTrial && (
                          <p className="text-sm text-muted-foreground">
                            {isArabic ? '14 يوماً ثم تختار Core أو Pro' : '14 days, then choose Core or Pro'}
                          </p>
                        )}
                        {!activeTrial && currentPlan !== 'free' && (
                          <p className="text-sm text-muted-foreground">
                            {isArabic ? 'الخطة المفعلة حالياً على حسابك.' : 'This is the plan currently active on your account.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {isArabic
                  ? 'يحصل كل مستخدم جديد على تجربة مجانية لمدة 14 يوماً بدون بطاقة ائتمان. بعد انتهائها ستحتاج إلى اختيار Core أو Pro للمتابعة.'
                  : 'Every new user starts with a 14-day free trial and no credit card. After the trial ends, choose Core or Pro to continue.'}
              </div>
            </div>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-6">
            {/* Export */}
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
                  {isArabic ? 'يمسح بيانات Wealix المحلية لهذا المستخدم دون حذف حساب Clerk.' : 'Clears this user’s local Wealix data without deleting the Clerk account.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleDeleteAllData} disabled={!isSignedIn}>
                  {isArabic ? 'مسح البيانات المحلية' : 'Clear Local Data'}
                </Button>
              </CardContent>
            </Card>

            {/* Account Access */}
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
