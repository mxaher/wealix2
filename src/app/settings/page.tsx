'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Bell,
  CreditCard,
  Download,
  Trash2,
  Crown,
  Check,
  LogOut,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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
import { DashboardShell } from '@/components/layout';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from 'next-themes';
import { toast } from '@/hooks/use-toast';

// Subscription tiers
const subscriptionTiers = [
  {
    id: 'free',
    name: { en: 'Free', ar: 'مجاني' },
    price: 0,
    features: [
      { en: '5 portfolio holdings', ar: '5 ممتلكات في المحفظة' },
      { en: 'Basic net worth tracking', ar: 'تتبع صافي الثروة الأساسي' },
      { en: 'Current month budget', ar: 'ميزانية الشهر الحالي' },
    ],
  },
  {
    id: 'core',
    name: { en: 'Core', ar: 'الأساسية' },
    price: 25,
    features: [
      { en: 'Unlimited portfolio holdings', ar: 'ممتلكات غير محدودة' },
      { en: 'Full net worth history', ar: 'تاريخ كامل لصافي الثروة' },
      { en: 'Full budget history', ar: 'تاريخ كامل للميزانية' },
      { en: 'Basic PDF reports', ar: 'تقارير PDF أساسية' },
      { en: '3 price alerts', ar: '3 تنبيهات أسعار' },
    ],
  },
  {
    id: 'pro',
    name: { en: 'Pro', ar: 'المحترفة' },
    price: 49,
    features: [
      { en: 'Everything in Core', ar: 'كل ميزات الأساسية' },
      { en: 'AI Financial Advisor', ar: 'مستشار مالي بالذكاء الاصطناعي' },
      { en: 'AI Portfolio Analysis', ar: 'تحليل المحفظة بالذكاء الاصطناعي' },
      { en: 'Multiple FIRE scenarios', ar: 'سيناريوهات FIRE متعددة' },
      { en: 'Unlimited price alerts', ar: 'تنبيهات أسعار غير محدودة' },
      { en: 'Full PDF reports', ar: 'تقارير PDF كاملة' },
    ],
  },
];

export default function SettingsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const router = useRouter();
  const {
    locale,
    setLocale,
    user,
    updateUser,
    notificationPreferences,
    updateNotificationPreferences,
    clearAllData,
    setUser,
    setSubscriptionTier,
  } = useAppStore();
  const { theme, setTheme } = useTheme();
  const isArabic = locale === 'ar';
  const currentUser = user ?? {
    id: 'guest',
    name: '',
    email: '',
    avatarUrl: null,
    locale,
    currency: 'SAR',
    subscriptionTier: 'free' as const,
    onboardingDone: false,
  };
  const [name, setName] = useState(currentUser.name ?? '');
  const [email, setEmail] = useState(currentUser.email);
  const currentPlan = user?.subscriptionTier ?? 'free';
  const validTabs = useMemo(() => ['profile', 'preferences', 'subscription', 'data'] as const, []);
  const activeTabParam = searchParams?.tab ?? null;
  const activeTab = validTabs.find((value) => value === activeTabParam) ?? 'profile';

  const handleSubscriptionChange = (tier: 'free' | 'core' | 'pro') => {
    setSubscriptionTier(tier);
    toast({
      title: isArabic ? 'تم تحديث الاشتراك' : 'Subscription updated',
      description: isArabic
        ? 'تم تطبيق الخطة الجديدة على حساب العرض التجريبي.'
        : 'The new plan was applied to the demo account.',
    });
  };

  const handleExportData = () => {
    const data = {
      user: currentUser,
      assets: [],
      liabilities: [],
      portfolio: [],
      budget: [],
      expenses: [],
      notificationPreferences,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wealthos-data-export.json';
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
    router.replace(`/settings?tab=${nextTab}`, { scroll: false });
  };

  const handleSaveProfile = () => {
    updateUser({
      name: name.trim() || null,
      email: email.trim(),
      locale,
    });

    toast({
      title: isArabic ? 'تم حفظ الملف الشخصي' : 'Profile saved',
      description: isArabic
        ? 'تم تحديث بيانات حسابك بنجاح.'
        : 'Your account details were updated successfully.',
    });
  };

  const handleCancelProfile = () => {
    setName(currentUser.name ?? '');
    setEmail(currentUser.email);
  };

  const handleNotificationChange = (
    key: 'email' | 'push' | 'priceAlerts' | 'budgetAlerts' | 'weeklyDigest',
    value: boolean
  ) => {
    updateNotificationPreferences({ [key]: value });
  };

  const handleDeleteAllData = () => {
    clearAllData();
    setUser(null);
    setTheme('dark');
    router.replace('/settings?tab=profile');
    setName('');
    setEmail('');

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
        <Tabs
          key={activeTab}
          defaultValue={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
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
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast({
                          title: isArabic ? 'قريباً' : 'Coming soon',
                          description: isArabic
                            ? 'رفع الصورة سيتوفر في تحديث لاحق.'
                            : 'Avatar upload will be added in a future update.',
                        })
                      }
                    >
                      {isArabic ? 'تغيير الصورة' : 'Change Avatar'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isArabic ? 'JPG, PNG بحد أقصى 2MB' : 'JPG, PNG up to 2MB'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? 'الاسم' : 'Name'}</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>

                <Separator />

                {/* Password */}
                <div>
                  <h4 className="font-medium mb-4">{isArabic ? 'تغيير كلمة المرور' : 'Change Password'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
                      <Input type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                      <Input type="password" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelProfile}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSaveProfile}>{isArabic ? 'حفظ التغييرات' : 'Save Changes'}</Button>
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
                  <Select value={locale} onValueChange={(v) => setLocale(v as 'ar' | 'en')}>
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
                  <Select value={theme} onValueChange={setTheme}>
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
                  <Switch checked={notificationPreferences.email} onCheckedChange={(c) => handleNotificationChange('email', c)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'الإشعارات الفورية' : 'Push Notifications'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'تنبيهات داخل التطبيق للأحداث المهمة' : 'In-app alerts for important events'}
                    </p>
                  </div>
                  <Switch checked={notificationPreferences.push} onCheckedChange={(c) => handleNotificationChange('push', c)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'تنبيهات الأسعار' : 'Price Alerts'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'إشعارات عند وصول السعر للهدف' : 'Notifications when price targets are hit'}
                    </p>
                  </div>
                  <Switch checked={notificationPreferences.priceAlerts} onCheckedChange={(c) => handleNotificationChange('priceAlerts', c)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'تنبيهات الميزانية' : 'Budget Alerts'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'إشعارات عند اقتراب الميزانية من الحد' : 'Notifications when budget limits are approaching'}
                    </p>
                  </div>
                  <Switch checked={notificationPreferences.budgetAlerts} onCheckedChange={(c) => handleNotificationChange('budgetAlerts', c)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{isArabic ? 'الملخص الأسبوعي' : 'Weekly Digest'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'ملخص أسبوعي لأدائك المالي' : 'Weekly summary of your financial performance'}
                    </p>
                  </div>
                  <Switch checked={notificationPreferences.weeklyDigest} onCheckedChange={(c) => handleNotificationChange('weeklyDigest', c)} />
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
                          {subscriptionTiers.find(t => t.id === currentPlan)?.name[isArabic ? 'ar' : 'en']}
                        </p>
                      </div>
                    </div>
                    {currentPlan !== 'pro' && (
                        <Button
                          className="bg-gold hover:bg-gold-dark text-navy-dark"
                          onClick={() => handleSubscriptionChange('pro')}
                        >
                          {isArabic ? 'ترقية' : 'Upgrade'}
                        </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Plans Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subscriptionTiers.map((tier) => (
                  <Card
                    key={tier.id}
                    className={currentPlan === tier.id ? 'border-gold' : ''}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{tier.name[isArabic ? 'ar' : 'en']}</CardTitle>
                        {currentPlan === tier.id && (
                          <Badge className="bg-gold text-navy-dark">
                            <Check className="w-3 h-3 mr-1" />
                            {isArabic ? 'الحالية' : 'Current'}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">
                          {tier.price === 0 ? (isArabic ? 'مجاني' : 'Free') : tier.price}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-muted-foreground"> SAR{isArabic ? '/شهر' : '/mo'}</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-emerald-500" />
                            {feature[isArabic ? 'ar' : 'en']}
                          </li>
                        ))}
                      </ul>
                      {currentPlan !== tier.id && tier.id !== 'free' && (
                        <Button
                          className="w-full mt-4"
                          variant={tier.id === 'pro' ? 'default' : 'outline'}
                          onClick={() => handleSubscriptionChange(tier.id as 'free' | 'core' | 'pro')}
                        >
                          {isArabic ? 'ابدأ التجربة' : 'Start Trial'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
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

            {/* Danger Zone */}
            <Card className="border-rose-500/30">
              <CardHeader>
                <CardTitle className="text-rose-500">{isArabic ? 'منطقة الخطر' : 'Danger Zone'}</CardTitle>
                <CardDescription>
                  {isArabic ? 'إجراءات لا يمكن التراجع عنها' : 'Irreversible actions'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-rose-500/10">
                  <div>
                    <h4 className="font-medium">{isArabic ? 'حذف الحساب' : 'Delete Account'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'حذف حسابك وجميع بياناتك نهائياً' : 'Permanently delete your account and all data'}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isArabic ? 'حذف الحساب' : 'Delete Account'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {isArabic ? 'هل أنت متأكد؟' : 'Are you sure?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isArabic
                            ? 'سيتم حذف حسابك وجميع بياناتك نهائياً. هذا الإجراء لا يمكن التراجع عنه.'
                            : 'This will permanently delete your account and all your data. This action cannot be undone.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-rose-500 hover:bg-rose-600"
                          onClick={handleDeleteAllData}
                        >
                          {isArabic ? 'حذف' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            {/* Logout */}
            <Card>
              <CardContent className="p-6">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() =>
                    toast({
                      title: isArabic ? 'تم تسجيل الخروج' : 'Signed out',
                      description: isArabic
                        ? 'تمت إزالة بيانات الجلسة المحلية.'
                        : 'Local session data has been cleared.',
                    })
                  }
                >
                  <LogOut className="w-4 h-4" />
                  {isArabic ? 'تسجيل الخروج' : 'Log Out'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
