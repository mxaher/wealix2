'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  ArrowRight,
  ArrowLeft,
  Crown,
  Zap,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
type NotificationChannel = 'whatsapp' | 'email' | 'both' | 'none';
type RetirementGoal = 'early_retirement' | 'comfortable_retirement' | 'legacy' | 'financial_freedom';
type PlanId = 'core' | 'pro';

interface WizardData {
  // Step 1
  name: string;
  email: string;
  phone: string;
  // Step 2
  notificationChannel: NotificationChannel | '';
  // Step 3
  monthlyIncome: string;
  currency: string;
  // Step 4
  riskTolerance: RiskTolerance | '';
  // Step 5
  preferredMarkets: string[];
  // Step 6
  retirementGoal: RetirementGoal | '';
  currentAge: string;
  retirementAge: string;
  // Step 7
  selectedPlan: PlanId | '';
  billingCycle: 'monthly' | 'annual';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = ['SAR', 'USD', 'AED', 'EGP', 'KWD', 'GBP', 'EUR'];

const MARKETS = ['TASI', 'NASDAQ', 'NYSE', 'DFM', 'ADX', 'EGX', 'LSE', 'Tadawul'];

const RISK_OPTIONS: { id: RiskTolerance; label: string; labelAr: string; desc: string; descAr: string }[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    labelAr: 'محافظ',
    desc: 'Capital preservation first. Low volatility, stable returns.',
    descAr: 'الحفاظ على رأس المال أولاً. تذبذب منخفض وعوائد مستقرة.',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    labelAr: 'معتدل',
    desc: 'Balanced growth and safety. Accepts measured risk for better returns.',
    descAr: 'توازن بين النمو والأمان. قبول مخاطر معقولة لعوائد أفضل.',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    labelAr: 'عدواني',
    desc: 'Maximum growth. Comfortable with high volatility and concentrated bets.',
    descAr: 'أقصى نمو. مرتاح للتذبذب العالي والمراكز المركّزة.',
  },
];

const GOAL_OPTIONS: { id: RetirementGoal; label: string; labelAr: string; desc: string; descAr: string }[] = [
  {
    id: 'early_retirement',
    label: 'Early Retirement',
    labelAr: 'التقاعد المبكر',
    desc: 'Achieve financial independence before the conventional retirement age.',
    descAr: 'تحقيق الاستقلال المالي قبل سن التقاعد التقليدي.',
  },
  {
    id: 'comfortable_retirement',
    label: 'Comfortable Retirement',
    labelAr: 'تقاعد مريح',
    desc: 'Build enough wealth for a secure and comfortable retirement.',
    descAr: 'بناء ثروة كافية لتقاعد آمن ومريح.',
  },
  {
    id: 'legacy',
    label: 'Legacy',
    labelAr: 'الإرث',
    desc: 'Accumulate generational wealth to pass on to your heirs.',
    descAr: 'تراكم الثروة الجيلية لتوريثها للأبناء.',
  },
  {
    id: 'financial_freedom',
    label: 'Financial Freedom',
    labelAr: 'الحرية المالية',
    desc: 'Generate passive income that covers your living expenses.',
    descAr: 'توليد دخل سلبي يغطي نفقاتك المعيشية.',
  },
];

const PLANS = [
  {
    id: 'core' as PlanId,
    name: 'Core',
    monthlyPrice: 10,
    annualPrice: 100,
    annualSavings: 20,
    highlight: false,
    features: {
      en: ['Income, expenses, budget & net worth', 'Portfolio tracking', 'Clean financial workspace', 'FIRE progress tracking'],
      ar: ['الدخل والمصروفات والميزانية وصافي الثروة', 'متابعة المحفظة', 'مساحة مالية منظمة', 'متابعة تقدم الاستقلال المالي'],
    },
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    monthlyPrice: 15,
    annualPrice: 150,
    annualSavings: 30,
    highlight: true,
    features: {
      en: ['Everything in Core', 'AI advisor after payment', 'Portfolio AI analysis', 'Advanced reports'],
      ar: ['كل ما في Core', 'المستشار الذكي بعد الدفع', 'تحليل المحفظة بالذكاء الاصطناعي', 'تقارير متقدمة'],
    },
  },
];

const TOTAL_STEPS = 7;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingClient() {
  const router = useRouter();
  const { user } = useUser();
  const locale = useAppStore((s) => s.locale);
  const updateUser = useAppStore((s) => s.updateUser);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const isArabic = locale === 'ar';

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [skippingAll, setSkippingAll] = useState(false);

  const [data, setData] = useState<WizardData>({
    name: user?.fullName ?? '',
    email: user?.primaryEmailAddress?.emailAddress ?? '',
    phone: '',
    notificationChannel: '',
    monthlyIncome: '',
    currency: 'SAR',
    riskTolerance: '',
    preferredMarkets: [],
    retirementGoal: '',
    currentAge: '',
    retirementAge: '',
    selectedPlan: '',
    billingCycle: 'monthly',
  });

  function patch(updates: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function toggleMarket(market: string) {
    patch({
      preferredMarkets: data.preferredMarkets.includes(market)
        ? data.preferredMarkets.filter((m) => m !== market)
        : [...data.preferredMarkets, market],
    });
  }

  // ── Submit / redirect ──────────────────────────────────────────────────────

  async function submitProfile(extra: Partial<Record<string, unknown>> = {}) {
    const payload: Record<string, unknown> = {
      name: data.name || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      notificationChannel: data.notificationChannel || undefined,
      monthlyIncome: data.monthlyIncome ? parseFloat(data.monthlyIncome) : undefined,
      riskTolerance: data.riskTolerance || undefined,
      preferredMarkets: data.preferredMarkets.length > 0 ? data.preferredMarkets : undefined,
      retirementGoal: data.retirementGoal || undefined,
      currentAge: data.currentAge ? parseInt(data.currentAge, 10) : undefined,
      retirementAge: data.retirementAge ? parseInt(data.retirementAge, 10) : undefined,
      ...extra,
    };

    try {
      await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Non-blocking — never prevent redirect
    }

    // Update Zustand store immediately
    if (data.name) updateUser({ name: data.name });
    setUserProfile({
      monthlyIncome: data.monthlyIncome ? parseFloat(data.monthlyIncome) : undefined,
      riskTolerance: (data.riskTolerance as RiskTolerance) || undefined,
      preferredMarkets: data.preferredMarkets.length > 0 ? data.preferredMarkets : undefined,
      retirementGoal: (data.retirementGoal as RetirementGoal) || undefined,
      currentAge: data.currentAge ? parseInt(data.currentAge, 10) : undefined,
      retirementAge: data.retirementAge ? parseInt(data.retirementAge, 10) : undefined,
    });
  }

  async function handleFinish() {
    setSubmitting(true);
    try {
      await submitProfile();

      if (data.selectedPlan) {
        try {
          const res = await fetch('/api/billing/trial/ensure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: data.selectedPlan }),
          });
          const json = await res.json() as { effectiveTier?: string };
          if (json.effectiveTier === 'core' || json.effectiveTier === 'pro') {
            updateUser({ subscriptionTier: json.effectiveTier });
          }
        } catch {
          // Non-blocking
        }
      }
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'حدث خطأ، جارٍ التوجيه...' : 'Something went wrong, redirecting anyway...',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      router.replace('/app');
    }
  }

  async function handleSkipAll() {
    setSkippingAll(true);
    try {
      await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingSkipped: true }),
      });
    } catch {
      // Non-blocking
    }
    router.replace('/app');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function next() {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleFinish();
  }

  function back() {
    if (step > 1) setStep(step - 1);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const optionalNote = (
    <p className="text-xs text-muted-foreground mt-4">
      {isArabic
        ? 'جميع الحقول اختيارية. يمكنك تحديثها في أي وقت من الإعدادات ← الملف الشخصي.'
        : 'All fields are optional. You can update this anytime in Settings → Profile.'}
    </p>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="text-sm font-semibold tracking-tight text-foreground">Wealix</span>
        <button
          type="button"
          onClick={handleSkipAll}
          disabled={skippingAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {skippingAll ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          {isArabic ? 'تخطي الإعداد كله' : 'Skip entire setup'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <div
          className="h-1 bg-primary transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Step segments */}
      <div className="flex gap-1 px-6 pt-3">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i + 1 <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-8">
          <p className="text-xs text-muted-foreground text-center">
            {isArabic ? `خطوة ${step} من ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`}
          </p>

          {/* ── Step 1: Profile ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{isArabic ? 'ملفك الشخصي' : 'Your Profile'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'أخبرنا باسمك حتى نخاطبك بشكل شخصي.' : 'Tell us your name so we can address you personally.'}
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{isArabic ? 'الاسم الكامل' : 'Full Name'}</Label>
                  <Input
                    value={data.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder={isArabic ? 'الاسم الكامل' : 'Full name'}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{isArabic ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <Input value={data.email} disabled className="opacity-60" />
                </div>
                <div className="space-y-1.5">
                  <Label>{isArabic ? 'رقم الهاتف' : 'Phone Number'}</Label>
                  <Input
                    value={data.phone}
                    onChange={(e) => patch({ phone: e.target.value })}
                    placeholder="+966 5x xxx xxxx"
                    type="tel"
                  />
                </div>
              </div>
              {optionalNote}
            </div>
          )}

          {/* ── Step 2: Notifications ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{isArabic ? 'طريقة الإشعارات' : 'Notifications'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'كيف تريد أن نرسل لك التنبيهات المالية؟' : 'How would you like to receive financial alerts?'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { id: 'whatsapp', label: 'WhatsApp', labelAr: 'واتساب' },
                    { id: 'email', label: 'Email', labelAr: 'البريد الإلكتروني' },
                    { id: 'both', label: 'Both', labelAr: 'كلاهما' },
                    { id: 'none', label: 'No notifications', labelAr: 'بدون إشعارات' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ notificationChannel: opt.id })}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      data.notificationChannel === opt.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <span className="text-sm font-medium">{isArabic ? opt.labelAr : opt.label}</span>
                  </button>
                ))}
              </div>
              {optionalNote}
            </div>
          )}

          {/* ── Step 3: Income ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{isArabic ? 'دخلك الشهري' : 'Monthly Income'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'يساعدنا هذا على معايرة التوصيات والخطط.' : 'Helps us calibrate recommendations and plans.'}
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{isArabic ? 'المبلغ الشهري' : 'Monthly Amount'}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={data.monthlyIncome}
                      onChange={(e) => patch({ monthlyIncome: e.target.value })}
                      placeholder="0"
                      className="flex-1"
                    />
                    <select
                      value={data.currency}
                      onChange={(e) => patch({ currency: e.target.value })}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {optionalNote}
            </div>
          )}

          {/* ── Step 4: Risk Tolerance ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{isArabic ? 'تحمّل المخاطر' : 'Risk Tolerance'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'يؤثر هذا على توصيات المحفظة والادخار.' : 'This shapes portfolio and savings recommendations.'}
                </p>
              </div>
              <div className="space-y-3">
                {RISK_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ riskTolerance: opt.id })}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      data.riskTolerance === opt.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <p className="text-sm font-semibold">{isArabic ? opt.labelAr : opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{isArabic ? opt.descAr : opt.desc}</p>
                  </button>
                ))}
              </div>
              {optionalNote}
            </div>
          )}

          {/* ── Step 5: Preferred Markets ── */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{isArabic ? 'الأسواق المفضلة' : 'Preferred Markets'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'اختر الأسواق التي تستثمر فيها أو تتابعها.' : 'Select the markets you invest in or follow.'}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MARKETS.map((market) => (
                  <button
                    key={market}
                    type="button"
                    onClick={() => toggleMarket(market)}
                    className={`rounded-xl border py-3 text-sm font-medium transition-colors ${
                      data.preferredMarkets.includes(market)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {market}
                  </button>
                ))}
              </div>
              {optionalNote}
            </div>
          )}

          {/* ── Step 6: Retirement Goal ── */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{isArabic ? 'هدفك المالي' : 'Financial Goal'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'يضبط هذا مسار خطتك المالية طويلة المدى.' : 'This calibrates your long-term financial path.'}
                </p>
              </div>
              <div className="space-y-3">
                {GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ retirementGoal: opt.id })}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      data.retirementGoal === opt.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <p className="text-sm font-semibold">{isArabic ? opt.labelAr : opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{isArabic ? opt.descAr : opt.desc}</p>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{isArabic ? 'عمرك الحالي' : 'Current Age'}</Label>
                  <Input
                    type="number"
                    min="16"
                    max="100"
                    value={data.currentAge}
                    onChange={(e) => patch({ currentAge: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{isArabic ? 'سن التقاعد المستهدف' : 'Target Retirement Age'}</Label>
                  <Input
                    type="number"
                    min="30"
                    max="100"
                    value={data.retirementAge}
                    onChange={(e) => patch({ retirementAge: e.target.value })}
                    placeholder="60"
                  />
                </div>
              </div>
              {optionalNote}
            </div>
          )}

          {/* ── Step 7: Plan Selection ── */}
          {step === 7 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{isArabic ? 'اختر خطتك' : 'Choose your plan'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isArabic
                    ? 'ابدأ بتجربة 14 يوماً مجانية. يمكنك التخطي والاختيار لاحقاً.'
                    : 'Start with a 14-day free trial. You can skip and choose later.'}
                </p>
              </div>
              <div className="flex justify-center">
                <div className="inline-flex rounded-full border border-border bg-background p-1">
                  {(['monthly', 'annual'] as const).map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => patch({ billingCycle: cycle })}
                      className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                        data.billingCycle === cycle
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {cycle === 'monthly'
                        ? isArabic ? 'شهري' : 'Monthly'
                        : isArabic ? 'سنوي' : 'Annual'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {PLANS.map((plan) => {
                  const price = data.billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
                  const suffix = data.billingCycle === 'monthly'
                    ? (isArabic ? '/شهرياً' : '/mo')
                    : (isArabic ? '/سنوياً' : '/yr');
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => patch({ selectedPlan: plan.id })}
                      className={`flex flex-col rounded-[20px] p-6 text-left border transition-colors ${
                        data.selectedPlan === plan.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {plan.id === 'pro'
                          ? <Crown className="h-4 w-4 text-primary" />
                          : <Zap className="h-4 w-4 text-muted-foreground" />}
                        <span className={`text-sm font-medium ${plan.highlight ? 'text-primary' : 'text-muted-foreground'}`}>
                          {plan.name}
                        </span>
                      </div>
                      <p className="text-3xl font-semibold">
                        ${price}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>
                      </p>
                      {data.billingCycle === 'annual' && (
                        <p className="text-xs text-accent font-medium mt-1">
                          {isArabic ? `وفّر $${plan.annualSavings}/سنة` : `Save $${plan.annualSavings}/yr`}
                        </p>
                      )}
                      <ul className="mt-4 space-y-2">
                        {plan.features[isArabic ? 'ar' : 'en'].map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
              {optionalNote}
            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={back}
              disabled={step === 1 || submitting}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              {isArabic ? 'السابق' : 'Back'}
            </Button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={next}
                disabled={submitting}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isArabic ? 'تخطي هذه الخطوة' : 'Skip this step'}
              </button>

              <Button onClick={next} disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : step === TOTAL_STEPS ? (
                  <>
                    {isArabic ? 'ابدأ الآن' : 'Get Started'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    {isArabic ? 'التالي' : 'Next'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
