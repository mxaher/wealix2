'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Crown, Zap, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/hooks/use-toast';

const PLANS = [
  {
    id: 'core' as const,
    name: 'Core',
    monthlyPrice: 10,
    annualPrice: 100,
    annualSavings: 20,
    highlight: false,
    features: {
      en: ['Income, expenses, budget & net worth', 'Portfolio tracking', 'Clean financial workspace', 'FIRE progress tracking'],
      ar: ['الدخل والمصروفات والميزانية وصافي الثروة', 'متابعة المحفظة', 'مساحة مالية منظمة وواضحة', 'متابعة تقدم الاستقلال المالي'],
    },
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    monthlyPrice: 15,
    annualPrice: 150,
    annualSavings: 30,
    highlight: true,
    features: {
      en: ['Everything in Core', 'AI advisor after payment', 'Portfolio AI analysis after payment', 'Advanced reports after payment'],
      ar: ['كل ما في Core', 'المستشار الذكي بعد الدفع', 'تحليل المحفظة بالذكاء الاصطناعي بعد الدفع', 'تقارير متقدمة بعد الدفع'],
    },
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const locale = useAppStore((s) => s.locale);
  const updateUser = useAppStore((s) => s.updateUser);
  const isArabic = locale === 'ar';
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');

  // If user already has a plan or active trial, skip onboarding
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace('/');
      return;
    }
    const meta = user?.publicMetadata as Record<string, unknown> | undefined;
    const hasPaid = meta?.subscriptionTier === 'core' || meta?.subscriptionTier === 'pro';
    const hasSelectedPlan =
      meta?.subscriptionTier === 'core' ||
      meta?.subscriptionTier === 'pro' ||
      meta?.trialPlan === 'core' ||
      meta?.trialPlan === 'pro';
    const hasTrial =
      meta?.trialStatus === 'active' &&
      typeof meta?.trialEndsAt === 'string' &&
      new Date(meta.trialEndsAt as string).getTime() > Date.now();
    if (hasPaid || hasTrial) {
      router.replace('/app');
      return;
    }
    if (hasSelectedPlan) {
      router.replace('/settings/billing');
    }
  }, [isLoaded, isSignedIn, user, router]);

  const handleStartTrial = async (planId: 'core' | 'pro') => {
    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/billing/trial/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json() as { effectiveTier?: string; error?: string };
      if (!res.ok || !data.effectiveTier) {
        throw new Error(data.error ?? 'Failed to start trial');
      }
      updateUser({
        subscriptionTier: data.effectiveTier === 'core' || data.effectiveTier === 'pro' ? data.effectiveTier : 'none',
      });
      await user?.reload?.().catch(() => undefined);
      setLoadingPlan(null);
      router.replace('/app');
    } catch (err) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
      setLoadingPlan(null);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            {isArabic ? 'ابدأ مجاناً لمدة 14 يوماً' : '14-Day Free Trial'}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {isArabic ? 'اختر خطتك' : 'Choose your plan'}
          </h1>
          <p className="text-muted-foreground text-sm leading-7 max-w-md mx-auto">
            {isArabic
              ? 'اختر Core أو Pro أولاً، ثم ابدأ تجربة 14 يوماً. الذكاء الاصطناعي والتقارير لا تُفتح إلا بعد إتمام الدفع.'
              : 'Choose Core or Pro first, then start a 14-day trial. AI features and reports unlock only after payment.'}
          </p>
        </div>

        {/* Cycle toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${cycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {isArabic ? 'شهري' : 'Monthly'}
            </button>
            <button
              type="button"
              onClick={() => setCycle('annual')}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${cycle === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {isArabic ? 'سنوي' : 'Annual'}
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid gap-5 md:grid-cols-2">
          {PLANS.map((plan) => {
            const price = cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
            const suffix = cycle === 'monthly' ? (isArabic ? '/شهرياً' : '/mo') : (isArabic ? '/سنوياً' : '/yr');
            const isLoading = loadingPlan === plan.id;

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
                    {cycle === 'annual' && (
                      <p className="mt-1 text-xs text-accent font-medium">
                        {isArabic ? `وفّر $${plan.annualSavings}/سنة` : `Save $${plan.annualSavings}/yr`}
                      </p>
                    )}
                  </div>
                  {plan.highlight && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {isArabic ? 'الأكثر تقدماً' : 'Most Advanced'}
                    </span>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features[isArabic ? 'ar' : 'en'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`mt-8 w-full rounded-xl gap-2 ${plan.highlight ? 'btn-primary' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                  disabled={!!loadingPlan}
                  onClick={() => handleStartTrial(plan.id)}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {isArabic ? `ابدأ التجربة — ${plan.name}` : `Start Trial — ${plan.name}`}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isArabic
            ? 'لا حاجة لبطاقة ائتمان الآن. بعد 14 يوماً يمكنك الاشتراك بسهولة من صفحة الفوترة.'
            : 'No credit card required now. After 14 days, subscribe from the billing page to continue.'}
        </p>
      </div>
    </div>
  );
}
