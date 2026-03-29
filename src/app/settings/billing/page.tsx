'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Crown,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  CreditCard,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanId = 'core' | 'pro';
type BillingCycle = 'monthly' | 'annual';
type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'none';

interface PlanDef {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  currency: string;
  description: { en: string; ar: string };
  features: { en: string[]; ar: string[] };
  highlight: boolean;
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

const PLANS: PlanDef[] = [
  {
    id: 'core',
    name: 'Core',
    monthlyPrice: 10,
    annualPrice: 100.08,
    annualSavings: 19.92,
    currency: 'USD',
    highlight: false,
    description: {
      en: 'Essential wealth planning with a clear operating layer for money, assets, and progress.',
      ar: 'الخطة الأساسية لإدارة الأموال والأصول ومتابعة التقدم المالي.',
    },
    features: {
      en: ['Income, expenses, budget, and net worth', 'Portfolio tracking and reports', 'Clean financial workspace'],
      ar: ['الدخل والمصروفات والميزانية وصافي الثروة', 'متابعة المحفظة والتقارير', 'مساحة مالية منظمة وواضحة'],
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 15,
    annualPrice: 150,
    annualSavings: 30,
    currency: 'USD',
    highlight: true,
    description: {
      en: 'The full Wealix layer with AI advisor, deeper analysis, and advanced decision support.',
      ar: 'تجربة Wealix الكاملة مع المستشار الذكي وتحليلات أعمق ودعم قرار متقدم.',
    },
    features: {
      en: ['Everything in Core', 'AI wealth advisor', 'Portfolio AI analysis', 'Advanced reports and planning tools'],
      ar: ['كل ما في Core', 'المستشار الذكي للثروة', 'تحليل المحفظة بالذكاء الاصطناعي', 'تقارير متقدمة وأدوات تخطيط'],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysRemaining(endsAt: string): number {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// ─── Current Plan Banner ──────────────────────────────────────────────────────

interface PlanBannerProps {
  isArabic: boolean;
  subscriptionTier: string;
  subscriptionStatus: SubscriptionStatus;
  onTrial: boolean;
  trialDaysLeft: number;
  trialPlan: string;
  onManage: () => void;
  isManaging: boolean;
}

function PlanBanner({
  isArabic,
  subscriptionTier,
  subscriptionStatus,
  onTrial,
  trialDaysLeft,
  trialPlan,
  onManage,
  isManaging,
}: PlanBannerProps) {
  const isPaid = subscriptionTier === 'core' || subscriptionTier === 'pro';
  const isPastDue = subscriptionStatus === 'past_due';
  const isCanceled = subscriptionStatus === 'canceled';

  if (isPastDue) {
    return (
      <div className="flex items-start gap-4 rounded-[20px] border border-destructive/30 bg-destructive/8 p-6">
        <div className="rounded-2xl bg-destructive/15 p-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-destructive">
            {isArabic ? 'فشل تجديد الاشتراك' : 'Payment failed'}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {isArabic
              ? 'يرجى تحديث بيانات الدفع لإعادة تفعيل اشتراكك.'
              : 'Please update your payment method to reactivate your subscription.'}
          </p>
        </div>
        <Button variant="destructive" size="sm" className="rounded-xl" onClick={onManage} disabled={isManaging}>
          {isManaging ? <RefreshCw className="h-4 w-4 animate-spin" /> : isArabic ? 'تحديث بيانات الدفع' : 'Update payment'}
        </Button>
      </div>
    );
  }

  if (isCanceled) {
    return (
      <div className="flex items-start gap-4 rounded-[20px] border border-border bg-card p-6">
        <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">{isArabic ? 'تم إلغاء الاشتراك' : 'Subscription canceled'}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {isArabic
              ? 'اشتراكك منتهٍ. اختر خطة أدناه لإعادة التفعيل.'
              : 'Your subscription has ended. Choose a plan below to reactivate.'}
          </p>
        </div>
      </div>
    );
  }

  if (isPaid) {
    return (
      <div className="flex items-start gap-4 rounded-[20px] border border-accent/25 bg-accent/6 p-6">
        <div className="rounded-2xl bg-accent/15 p-3 text-accent">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {isArabic ? `خطة ${subscriptionTier === 'pro' ? 'Pro' : 'Core'} نشطة` : `${subscriptionTier === 'pro' ? 'Pro' : 'Core'} plan — Active`}
            </p>
            <Badge className="bg-accent/15 text-accent hover:bg-accent/15">
              {isArabic ? 'نشط' : 'Active'}
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {isArabic
              ? 'تحكم في اشتراكك، وطريقة الدفع، والفواتير من البوابة أدناه.'
              : 'Manage your subscription, payment method, and invoices from the portal below.'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={onManage} disabled={isManaging}>
          {isManaging
            ? <RefreshCw className="h-4 w-4 animate-spin" />
            : <><ExternalLink className="h-4 w-4" />{isArabic ? 'إدارة الاشتراك' : 'Manage'}</>
          }
        </Button>
      </div>
    );
  }

  if (onTrial) {
    return (
      <div className="flex items-start gap-4 rounded-[20px] border border-primary/25 bg-primary/6 p-6">
        <div className="rounded-2xl bg-primary/15 p-3 text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {isArabic ? `تجربة مجانية — ${trialPlan === 'pro' ? 'Pro' : 'Core'}` : `Free Trial — ${trialPlan === 'pro' ? 'Pro' : 'Core'}`}
            </p>
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
              {isArabic ? `${trialDaysLeft} يوم متبقٍ` : `${trialDaysLeft}d left`}
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {isArabic
              ? `تجربتك تنتهي خلال ${trialDaysLeft} يوم. اشترك الآن للاستمرار دون انقطاع.`
              : `Your trial ends in ${trialDaysLeft} days. Subscribe now to continue without interruption.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-border bg-card p-6">
      <div className="rounded-2xl bg-secondary p-3 text-muted-foreground">
        <CreditCard className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{isArabic ? 'الخطة المجانية' : 'Free plan'}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {isArabic
            ? 'اشترك في Core أو Pro أدناه للوصول الكامل إلى Wealix.'
            : 'Subscribe to Core or Pro below to unlock full access to Wealix.'}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function BillingPageContent() {
  const { user: clerkUser, isLoaded } = useUser();
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';
  const router = useRouter();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);

  // ── Parse Clerk metadata ──────────────────────────────────────────────────
  const metadata = clerkUser?.publicMetadata as Record<string, unknown> | undefined;

  const subscriptionTier: string =
    metadata?.subscriptionTier === 'core' || metadata?.subscriptionTier === 'pro'
      ? (metadata.subscriptionTier as string)
      : 'free';

  const subscriptionStatus: SubscriptionStatus =
    metadata?.subscriptionStatus === 'active'
      ? 'active'
      : metadata?.subscriptionStatus === 'past_due'
        ? 'past_due'
        : metadata?.subscriptionStatus === 'canceled'
          ? 'canceled'
          : 'none';

  const trialActive =
    metadata?.trialStatus === 'active' &&
    (metadata?.trialPlan === 'core' || metadata?.trialPlan === 'pro') &&
    typeof metadata?.trialEndsAt === 'string' &&
    new Date(metadata.trialEndsAt as string).getTime() > Date.now();

  const trialDaysLeft = trialActive && typeof metadata?.trialEndsAt === 'string'
    ? daysRemaining(metadata.trialEndsAt as string)
    : 0;

  const trialPlan = (metadata?.trialPlan as string) ?? 'pro';

  // ── Handle success/cancel redirects ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const plan = params.get('plan') ?? '';
      toast({
        title: isArabic ? 'تم الاشتراك بنجاح!' : 'Subscription activated!',
        description: isArabic
          ? `مرحباً بك في خطة ${plan === 'pro' ? 'Pro' : 'Core'}.`
          : `Welcome to the ${plan === 'pro' ? 'Pro' : 'Core'} plan.`,
      });
      router.replace('/settings/billing');
    }
    if (params.get('canceled') === 'true') {
      toast({
        title: isArabic ? 'تم الإلغاء' : 'Checkout canceled',
        description: isArabic ? 'لم يتم إجراء أي عملية دفع.' : 'No payment was made.',
        variant: 'destructive',
      });
      router.replace('/settings/billing');
    }
  }, [isArabic, router]);

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const handleSubscribe = useCallback(async (planId: PlanId) => {
    if (!clerkUser) return;
    setLoadingPlan(`${planId}-${billingCycle}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, cycle: billingCycle }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Failed to create checkout');
      }
      window.location.href = data.url;
    } catch (err) {
      clearTimeout(timeout);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: err instanceof Error && err.name === 'AbortError'
          ? (isArabic ? 'انتهت مهلة الطلب. حاول مجدداً.' : 'Request timed out. Please try again.')
          : (err instanceof Error ? err.message : 'Something went wrong'),
        variant: 'destructive',
      });
      setLoadingPlan(null);
    }
  }, [clerkUser, billingCycle, isArabic]);

  // ── Manage (portal) ────────────────────────────────────────────────────────
  const handleManage = useCallback(async () => {
    setIsManaging(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to open portal');
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
      setIsManaging(false);
    }
  }, [isArabic]);

  // ── Guest state ────────────────────────────────────────────────────────────
  if (isLoaded && !clerkUser) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <Crown className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-5 text-2xl font-semibold">
            {isArabic ? 'سجّل الدخول لإدارة اشتراكك' : 'Sign in to manage your subscription'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {isArabic
              ? 'أنشئ حساباً واحصل على تجربة مجانية 14 يوماً، ثم اختر بين Core و Pro.'
              : 'Create an account and get a 14-day free trial, then choose Core or Pro.'}
          </p>
          <SignInButton mode="modal">
            <Button className="btn-primary mt-6 rounded-xl">
              {isArabic ? 'تسجيل الدخول' : 'Sign In'} <ArrowRight className="h-4 w-4" />
            </Button>
          </SignInButton>
        </div>
      </DashboardShell>
    );
  }

  const isPaid = subscriptionTier === 'core' || subscriptionTier === 'pro';

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 md:px-6">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isArabic ? 'الاشتراك والفوترة' : 'Billing & Subscription'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isArabic
              ? 'أدر خطتك الحالية، وطريقة الدفع، وفواتيرك.'
              : 'Manage your plan, payment method, and invoices.'}
          </p>
        </div>

        {/* ── Current plan banner ── */}
        <PlanBanner
          isArabic={isArabic}
          subscriptionTier={subscriptionTier}
          subscriptionStatus={subscriptionStatus}
          onTrial={Boolean(trialActive)}
          trialDaysLeft={trialDaysLeft}
          trialPlan={trialPlan}
          onManage={handleManage}
          isManaging={isManaging}
        />

        {/* ── Plan cards (hidden for active paid users — they use portal) ── */}
        {!isPaid || subscriptionStatus === 'canceled' || subscriptionStatus === 'past_due' ? (
          <div className="space-y-6">
            <Separator />
            <div>
              <h2 className="text-lg font-semibold">
                {isArabic ? 'اختر خطتك' : 'Choose a plan'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isArabic
                  ? 'تبدأ جميع الخطط بتجربة مجانية 14 يوماً بدون بطاقة ائتمان.'
                  : 'All plans start with a 14-day free trial, no credit card required.'}
              </p>
            </div>

            {/* Billing cycle toggle */}
            <div className="flex flex-col gap-2">
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
            <div className="grid gap-5 md:grid-cols-2">
              {PLANS.map((plan) => {
                const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
                const suffix = billingCycle === 'monthly'
                  ? (isArabic ? '/شهرياً' : '/mo')
                  : (isArabic ? '/سنوياً' : '/yr');
                const isCurrentPlan = subscriptionTier === plan.id;
                const isLoading = loadingPlan === `${plan.id}-${billingCycle}`;

                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col rounded-[24px] p-8 ${
                      plan.highlight
                        ? 'border border-primary/25 bg-card ring-1 ring-primary/10'
                        : 'border border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {plan.id === 'pro' ? (
                            <Crown className="h-4 w-4 text-primary" />
                          ) : (
                            <Zap className="h-4 w-4 text-muted-foreground" />
                          )}
                          <p className={`text-sm font-medium ${plan.highlight ? 'text-primary' : 'text-muted-foreground'}`}>
                            {plan.name}
                          </p>
                        </div>
                        <h3 className="mt-3 text-4xl font-semibold financial-number">
                          ${price}
                          <span className="ml-1 text-base font-normal text-muted-foreground">{suffix}</span>
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {plan.highlight && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                            {isArabic ? 'الأكثر تقدماً' : 'Most Advanced'}
                          </Badge>
                        )}
                        {billingCycle === 'annual' && (
                          <Badge variant="outline" className="border-accent/40 text-accent">
                            {isArabic ? `وفّر $${plan.annualSavings}` : `Save $${plan.annualSavings}`}
                          </Badge>
                        )}
                        {isCurrentPlan && subscriptionStatus === 'active' && (
                          <Badge variant="outline" className="border-accent/40 text-accent">
                            {isArabic ? 'خطتك الحالية' : 'Current plan'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {plan.description[isArabic ? 'ar' : 'en']}
                    </p>

                    <ul className="mt-6 flex-1 space-y-3">
                      {plan.features[isArabic ? 'ar' : 'en'].map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`mt-8 w-full rounded-xl ${plan.highlight ? 'btn-primary' : ''}`}
                      variant={plan.highlight ? 'default' : 'outline'}
                      disabled={isLoading || !clerkUser}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : trialActive ? (
                        isArabic ? `اشترك في ${plan.name}` : `Subscribe to ${plan.name}`
                      ) : (
                        isArabic ? `ابدأ التجربة — ${plan.name}` : `Start trial — ${plan.name}`
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Upgrade section for paid users ── */
          <div className="space-y-4">
            <Separator />
            <div className="rounded-[20px] border border-border bg-card p-6">
              <h2 className="font-semibold">{isArabic ? 'تغيير الخطة أو إلغاؤها' : 'Change or cancel plan'}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isArabic
                  ? 'لتغيير خطتك أو طريقة الدفع أو إلغاء الاشتراك، افتح بوابة الفوترة أدناه.'
                  : 'To switch plans, update your payment method, or cancel your subscription, open the billing portal below.'}
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-xl gap-2"
                onClick={handleManage}
                disabled={isManaging}
              >
                {isManaging
                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                  : <><ExternalLink className="h-4 w-4" />{isArabic ? 'فتح بوابة الفوترة' : 'Open billing portal'}</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── FAQ ── */}
        <div className="space-y-4">
          <Separator />
          <h2 className="text-lg font-semibold">{isArabic ? 'أسئلة شائعة' : 'Billing FAQ'}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(isArabic ? [
              ['هل أحتاج بطاقة ائتمان للتجربة المجانية؟', 'لا. التجربة المجانية لمدة 14 يوماً تبدأ تلقائياً عند إنشاء الحساب دون الحاجة لبطاقة ائتمان.'],
              ['ماذا يحدث بعد انتهاء التجربة؟', 'ينتقل حسابك إلى الخطة المجانية تلقائياً. لن تُحسب منك أي رسوم ما لم تختر خطة مدفوعة.'],
              ['هل يمكنني الإلغاء في أي وقت؟', 'نعم. يمكنك إلغاء اشتراكك في أي وقت من بوابة الفوترة. يبقى وصولك فعّالاً حتى نهاية فترة الفوترة.'],
              ['ما طرق الدفع المقبولة؟', 'جميع البطاقات الائتمانية والمدينة الرئيسية (Visa، Mastercard، Mada) عبر Stripe.'],
            ] : [
              ['Do I need a credit card for the trial?', 'No. The 14-day free trial starts automatically when you create your account, no credit card required.'],
              ['What happens when the trial ends?', 'Your account downgrades to the free tier automatically. No charge unless you choose a paid plan.'],
              ['Can I cancel any time?', 'Yes. Cancel from the billing portal at any time. Access remains active until the end of the billing period.'],
              ['What payment methods are accepted?', 'All major credit and debit cards (Visa, Mastercard) via Stripe.'],
            ]).map(([q, a]) => (
              <div key={q} className="rounded-[16px] border border-border bg-card p-5">
                <p className="text-sm font-semibold">{q}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}

export default function BillingPage() {
  return <BillingPageContent />;
}
