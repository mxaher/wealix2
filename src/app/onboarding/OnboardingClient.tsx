'use client';

import { useState, useEffect } from 'react';
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
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/useAppStore';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';
import { toast } from '@/hooks/use-toast';
import { createOpaqueId } from '@/lib/ids';

// ─── Types ───────────────────────────────────────────────────────────────────

type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
type NotificationChannel = 'whatsapp' | 'email' | 'both' | 'none';
type RetirementGoal = 'early_retirement' | 'comfortable_retirement' | 'legacy' | 'financial_freedom';
type PlanId = 'core' | 'pro';

interface WizardData {
  name: string;
  email: string;
  phone: string;
  notificationChannel: NotificationChannel | '';
  monthlyIncome: string;
  currency: string;
  riskTolerance: RiskTolerance | '';
  preferredMarkets: string[];
  retirementGoal: RetirementGoal | '';
  currentAge: string;
  retirementAge: string;
  selectedPlan: PlanId | '';
  billingCycle: 'monthly' | 'annual';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = ['SAR', 'USD', 'AED', 'EGP', 'KWD', 'GBP', 'EUR'];
const MARKETS = ['TASI', 'NASDAQ', 'NYSE', 'DFM', 'ADX', 'EGX', 'LSE', 'Tadawul'];
const TOTAL_STEPS = 7;
const INCOME_BAR_MAX = 50000; // SAR equivalent cap for visual bar

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

const GOAL_OPTIONS: { id: RetirementGoal; label: string; labelAr: string; desc: string; descAr: string; icon: string }[] = [
  {
    id: 'early_retirement',
    label: 'Early Retirement',
    labelAr: 'التقاعد المبكر',
    desc: 'Achieve financial independence before the conventional retirement age.',
    descAr: 'تحقيق الاستقلال المالي قبل سن التقاعد التقليدي.',
    icon: '🏖️',
  },
  {
    id: 'comfortable_retirement',
    label: 'Comfortable Retirement',
    labelAr: 'تقاعد مريح',
    desc: 'Build enough wealth for a secure and comfortable retirement.',
    descAr: 'بناء ثروة كافية لتقاعد آمن ومريح.',
    icon: '🏡',
  },
  {
    id: 'legacy',
    label: 'Legacy',
    labelAr: 'الإرث',
    desc: 'Accumulate generational wealth to pass on to your heirs.',
    descAr: 'تراكم الثروة الجيلية لتوريثها للأبناء.',
    icon: '🌳',
  },
  {
    id: 'financial_freedom',
    label: 'Financial Freedom',
    labelAr: 'الحرية المالية',
    desc: 'Generate passive income that covers your living expenses.',
    descAr: 'توليد دخل سلبي يغطي نفقاتك المعيشية.',
    icon: '🚀',
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

// ─── Context Panel Visuals ────────────────────────────────────────────────────

function IncomeBarVisual({ income, currency, isArabic }: { income: string; currency: string; isArabic: boolean }) {
  const value = parseFloat(income) || 0;
  const pct = Math.min(100, (value / INCOME_BAR_MAX) * 100);
  const formatted = value > 0
    ? new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
    : (isArabic ? `0 ${currency}` : `0 ${currency}`);

  return (
    <div className="w-full space-y-6">
      <p className="text-4xl font-bold text-foreground tabular-nums transition-all duration-300">{formatted}</p>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{isArabic ? 'الدخل الشهري' : 'Monthly income'}</p>
        <div className="h-4 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>{new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', { notation: 'compact', maximumFractionDigits: 0 }).format(INCOME_BAR_MAX)}</span>
        </div>
      </div>
      {value > 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground">{isArabic ? 'المدخرات المحتملة شهرياً (20%)' : 'Potential monthly savings (20%)'}</p>
          <p className="text-lg font-semibold">
            {new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value * 0.2)}
          </p>
        </div>
      )}
    </div>
  );
}

function RiskSpectrumVisual({ selected, isArabic }: { selected: string; isArabic: boolean }) {
  const positions: Record<string, number> = { conservative: 10, moderate: 50, aggressive: 90 };
  const markerPos = positions[selected] ?? -1;
  const colors = ['#22c55e', '#eab308', '#ef4444'];

  return (
    <div className="w-full space-y-8">
      <div className="relative">
        <div className="h-3 rounded-full" style={{ background: `linear-gradient(to ${isArabic ? 'left' : 'right'}, ${colors[0]}, ${colors[1]}, ${colors[2]})` }} />
        {markerPos >= 0 && (
          <div
            className="absolute -top-1 w-5 h-5 rounded-full bg-background border-2 border-foreground shadow-md transition-all duration-500"
            style={{ [isArabic ? 'right' : 'left']: `calc(${markerPos}% - 10px)` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{isArabic ? 'محافظ' : 'Conservative'}</span>
        <span>{isArabic ? 'معتدل' : 'Moderate'}</span>
        <span>{isArabic ? 'عدواني' : 'Aggressive'}</span>
      </div>
      {selected && (
        <div className="rounded-xl border border-border bg-card/60 p-4">
          {selected === 'conservative' && (
            <p className="text-sm text-muted-foreground">{isArabic ? 'استثمارات منخفضة المخاطر: صناديق أسواق المال، السندات، الودائع.' : 'Low-risk vehicles: money market funds, bonds, term deposits.'}</p>
          )}
          {selected === 'moderate' && (
            <p className="text-sm text-muted-foreground">{isArabic ? 'توازن: أسهم نمو مع صناديق دخل ثابت.' : 'Balanced mix: growth equities alongside fixed-income funds.'}</p>
          )}
          {selected === 'aggressive' && (
            <p className="text-sm text-muted-foreground">{isArabic ? 'تركيز على النمو: أسهم فردية، رأس مال مجازف، أصول بديلة.' : 'Growth-focused: individual stocks, venture capital, alternatives.'}</p>
          )}
        </div>
      )}
    </div>
  );
}

function MarketsDonutVisual({ selected, isArabic }: { selected: string[]; isArabic: boolean }) {
  const count = selected.length;
  const total = MARKETS.length;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const fillFraction = count / total;
  const strokeDashoffset = circumference * (1 - fillFraction);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{count}</span>
          <span className="text-xs text-muted-foreground">{isArabic ? 'أسواق' : 'markets'}</span>
        </div>
      </div>
      {count > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {selected.map((m) => (
            <span key={m} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">{m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function RetirementTimelineVisual({ currentAge, retirementAge, isArabic }: { currentAge: string; retirementAge: string; isArabic: boolean }) {
  const now = new Date().getFullYear();
  const ca = parseInt(currentAge) || 30;
  const ra = parseInt(retirementAge) || 60;
  const yearsLeft = Math.max(1, ra - ca);
  const targetYear = now + yearsLeft;
  const pct = Math.min(98, Math.max(2, ((now - (now - 5)) / (yearsLeft + 5)) * 100));

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{now}</span>
        <span className="text-primary font-bold">{targetYear}</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted">
        <div className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-primary/40 to-primary" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow" style={{ [isArabic ? 'right' : 'left']: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
          <p className="text-2xl font-bold">{yearsLeft}</p>
          <p className="text-xs text-muted-foreground">{isArabic ? 'سنة حتى التقاعد' : 'years to retirement'}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
          <p className="text-2xl font-bold">{targetYear}</p>
          <p className="text-xs text-muted-foreground">{isArabic ? 'سنة التقاعد المستهدفة' : 'target retirement year'}</p>
        </div>
      </div>
    </div>
  );
}

function WelcomeContextPanel({ isArabic }: { isArabic: boolean }) {
  return (
    <div className="space-y-8 w-full max-w-sm">
      <div className="space-y-2">
        <p className="text-4xl font-bold leading-tight">
          {isArabic ? 'رحلتك المالية تبدأ هنا.' : 'Your financial journey starts here.'}
        </p>
        <p className="text-muted-foreground">
          {isArabic
            ? 'Wealix يجمع دخلك، محفظتك، وأهدافك في مكان واحد — واضح، منظم، وقابل للتنفيذ.'
            : 'Wealix unifies your income, portfolio, and goals in one place — clear, organized, and actionable.'}
        </p>
      </div>
      <div className="space-y-3">
        {[
          { en: 'Track every dirham, dollar, and dinar', ar: 'تتبع كل ريال ودولار ودينار' },
          { en: 'Visualize your FIRE timeline', ar: 'شاهد مسيرتك نحو الاستقلال المالي' },
          { en: 'AI-powered portfolio insights', ar: 'تحليل محفظتك بالذكاء الاصطناعي' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm">{isArabic ? item.ar : item.en}</span>
          </div>
        ))}
      </div>
      {/* Blurred dashboard preview */}
      <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-3 blur-[2px] select-none pointer-events-none opacity-80">
        <div className="flex gap-2">
          {['bg-primary/20', 'bg-accent/20', 'bg-muted'].map((c, i) => (
            <div key={i} className={`h-16 flex-1 rounded-xl ${c}`} />
          ))}
        </div>
        <div className="h-2 w-3/4 rounded-full bg-muted" />
        <div className="h-2 w-1/2 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function CompletionScreen({ isArabic, name }: { isArabic: boolean; name: string }) {
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setAnimStep(1), 100);
    const t2 = setTimeout(() => setAnimStep(2), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const circumference = 2 * Math.PI * 54;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6 gap-8" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="70" cy="70" r="54"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={animStep >= 1 ? 0 : circumference}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-500"
          style={{ opacity: animStep >= 1 ? 1 : 0, transform: animStep >= 1 ? 'scale(1)' : 'scale(0.5)' }}
        >
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
      </div>

      <div
        className="space-y-2 transition-all duration-500 delay-200"
        style={{ opacity: animStep >= 2 ? 1 : 0, transform: animStep >= 2 ? 'translateY(0)' : 'translateY(12px)' }}
      >
        <h1 className="text-3xl font-bold">
          {isArabic
            ? `مرحباً${name ? `، ${name}` : ''} 🎯`
            : `Welcome${name ? `, ${name}` : ''} 🎯`}
        </h1>
        <p className="text-muted-foreground text-lg">
          {isArabic ? 'رحلتك المالية تبدأ الآن.' : 'Your financial journey starts now.'}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {isArabic ? 'جارٍ التوجيه إلى لوحة التحكم...' : 'Redirecting to your dashboard...'}
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingClient() {
  const router = useRouter();
  const { user } = useUser();
  const locale = useAppStore((s) => s.locale);
  const updateUser = useAppStore((s) => s.updateUser);
  const isArabic = locale === 'ar';

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [skippingAll, setSkippingAll] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

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

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function submitProfile(extra: Partial<Record<string, unknown>> = {}) {
    const monthlyIncome = data.monthlyIncome ? parseFloat(data.monthlyIncome) : undefined;
    const currentAge = data.currentAge ? parseInt(data.currentAge, 10) : undefined;
    const retirementAge = data.retirementAge ? parseInt(data.retirementAge, 10) : undefined;
    const payload: Record<string, unknown> = {
      name: data.name || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      notificationChannel: data.notificationChannel || undefined,
      monthlyIncome,
      riskTolerance: data.riskTolerance || undefined,
      preferredMarkets: data.preferredMarkets.length > 0 ? data.preferredMarkets : undefined,
      retirementGoal: data.retirementGoal || undefined,
      currentAge,
      retirementAge,
      ...extra,
    };

    await fetch('/api/onboarding/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const store = useAppStore.getState();
    const {
      addIncomeEntry,
      deleteIncomeEntry,
      setUserProfile,
      updateUser: updateStoreUser,
      incomeEntries,
    } = store;

    const onboardingSeedNote = 'Added during onboarding';

    incomeEntries
      .filter((entry) => entry.notes === onboardingSeedNote)
      .forEach((entry) => deleteIncomeEntry(entry.id));

    if (monthlyIncome && monthlyIncome > 0) {
      addIncomeEntry({
        id: createOpaqueId('income'),
        amount: monthlyIncome,
        currency: data.currency,
        source: 'salary',
        sourceName: isArabic ? 'الدخل الأساسي' : 'Primary Income',
        frequency: 'monthly',
        date: new Date().toISOString().split('T')[0],
        isRecurring: true,
        notes: onboardingSeedNote,
      });
    }

    setUserProfile({
      monthlyIncome,
      riskTolerance: (data.riskTolerance as RiskTolerance) || undefined,
      preferredMarkets: data.preferredMarkets.length > 0 ? data.preferredMarkets : undefined,
      retirementGoal: (data.retirementGoal as RetirementGoal) || undefined,
      currentAge,
      retirementAge,
    });

    await useFinancialSettingsStore.getState().initializeFromOnboarding({
      monthlyIncome: monthlyIncome ?? 0,
      annualIncome: (monthlyIncome ?? 0) * 12,
      incomeSource: 'salary',
      currency: data.currency,
      fireTargetAge: retirementAge ?? 60,
      riskProfile:
        data.riskTolerance === 'conservative' || data.riskTolerance === 'aggressive'
          ? data.riskTolerance
          : 'moderate',
      onboardingCompleted: true,
    });
    await useFinancialSettingsStore.getState().syncToBackend();

    updateStoreUser({
      onboardingDone: true,
      ...(data.name ? { name: data.name } : {}),
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

      setIsComplete(true);
      setTimeout(() => router.replace('/app'), 3000);
    } catch {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'حدث خطأ، جارٍ التوجيه...' : 'Something went wrong, redirecting anyway...',
        variant: 'destructive',
      });
      router.replace('/app');
    } finally {
      setSubmitting(false);
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

  // ── Context Panel ──────────────────────────────────────────────────────────

  function renderContextPanel() {
    switch (step) {
      case 1:
        return <WelcomeContextPanel isArabic={isArabic} />;
      case 2:
        return (
          <div className="space-y-6 w-full max-w-sm">
            <p className="text-2xl font-semibold">{isArabic ? 'ابق على اطلاع دائم.' : 'Stay in the loop.'}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isArabic
                ? 'تنبيهات الميزانية، تحديثات المحفظة، وإشعارات اللحظة المناسبة — تصلك عبر القناة التي تفضلها.'
                : 'Budget alerts, portfolio updates, and right-moment nudges — delivered through the channel you prefer.'}
            </p>
            <div className="space-y-3">
              {[
                { icon: '💰', en: 'Budget overspend alerts', ar: 'تنبيهات تجاوز الميزانية' },
                { icon: '📈', en: 'Portfolio milestone updates', ar: 'تحديثات إنجازات المحفظة' },
                { icon: '🎯', en: 'FIRE progress reminders', ar: 'تذكيرات تقدم الاستقلال المالي' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm">{isArabic ? item.ar : item.en}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="w-full max-w-sm space-y-6">
            <p className="text-2xl font-semibold">{isArabic ? 'دخلك، بوضوح.' : 'Your income, clearly.'}</p>
            <IncomeBarVisual income={data.monthlyIncome} currency={data.currency} isArabic={isArabic} />
          </div>
        );
      case 4:
        return (
          <div className="w-full max-w-sm space-y-6">
            <p className="text-2xl font-semibold">{isArabic ? 'استثمارك يعكس شخصيتك.' : 'Your investments reflect who you are.'}</p>
            <RiskSpectrumVisual selected={data.riskTolerance} isArabic={isArabic} />
          </div>
        );
      case 5:
        return (
          <div className="w-full max-w-sm space-y-6 flex flex-col items-center">
            <p className="text-2xl font-semibold text-center">{isArabic ? 'أسواقك، على رادارك.' : 'Your markets, on your radar.'}</p>
            <MarketsDonutVisual selected={data.preferredMarkets} isArabic={isArabic} />
          </div>
        );
      case 6:
        return (
          <div className="w-full max-w-sm space-y-6">
            <p className="text-2xl font-semibold">{isArabic ? 'خطك نحو الحرية.' : 'Your path to freedom.'}</p>
            <RetirementTimelineVisual currentAge={data.currentAge} retirementAge={data.retirementAge} isArabic={isArabic} />
          </div>
        );
      case 7:
        return (
          <div className="w-full max-w-sm space-y-6">
            <p className="text-2xl font-semibold">{isArabic ? 'استثمار في نفسك.' : 'An investment in yourself.'}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isArabic
                ? 'ابدأ بـ 14 يوماً مجاناً. لا بطاقة بنكية مطلوبة. ألغِ في أي وقت.'
                : 'Start with 14 days free. No credit card required. Cancel anytime.'}
            </p>
            <div className="space-y-3">
              {[
                { en: 'Full access during trial', ar: 'وصول كامل خلال التجربة' },
                { en: 'Switch plans anytime', ar: 'غيّر الخطة في أي وقت' },
                { en: 'Your data is always yours', ar: 'بياناتك ملكك دائماً' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm">{isArabic ? item.ar : item.en}</span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  // ── Step copy ──────────────────────────────────────────────────────────────

  const STEP_COPY: Record<number, { title: string; titleAr: string; subtitle: string; subtitleAr: string }> = {
    1: {
      title: "Let's get to know you",
      titleAr: 'دعنا نتعرف عليك',
      subtitle: 'A few details so we can make this feel like yours.',
      subtitleAr: 'بضع تفاصيل لنجعل هذا يبدو كأنه ملكك.',
    },
    2: {
      title: 'How would you like to stay informed?',
      titleAr: 'كيف تريد أن تبقى على اطلاع؟',
      subtitle: "We'll only reach out when it matters.",
      subtitleAr: 'لن نتواصل معك إلا عند الضرورة.',
    },
    3: {
      title: 'What does your monthly income look like?',
      titleAr: 'كيف يبدو دخلك الشهري؟',
      subtitle: 'This helps us calibrate your plans and savings potential.',
      subtitleAr: 'يساعدنا هذا على معايرة خططك وإمكانياتك الادخارية.',
    },
    4: {
      title: "How comfortable are you with your money working harder?",
      titleAr: 'ما مدى راحتك مع تشغيل أموالك بشكل أكثر كثافة؟',
      subtitle: 'No wrong answers — this shapes your portfolio strategy.',
      subtitleAr: 'لا إجابات خاطئة — يؤثر هذا على استراتيجية محفظتك.',
    },
    5: {
      title: "Which markets are you following?",
      titleAr: 'أي الأسواق تتابعها؟',
      subtitle: 'Select all that apply. You can always add more later.',
      subtitleAr: 'اختر كل ما ينطبق. يمكنك إضافة المزيد لاحقاً.',
    },
    6: {
      title: "Let's take stock of where you want to go",
      titleAr: 'دعنا نحدد إلى أين تريد أن تصل',
      subtitle: 'Your goal shapes every recommendation we make.',
      subtitleAr: 'هدفك يشكل كل توصية نقدمها.',
    },
    7: {
      title: 'Choose the plan that fits you',
      titleAr: 'اختر الخطة التي تناسبك',
      subtitle: 'Start free for 14 days. You can skip this and decide later.',
      subtitleAr: 'ابدأ مجاناً لمدة 14 يوماً. يمكنك تخطي هذا والاختيار لاحقاً.',
    },
  };

  const copy = STEP_COPY[step];

  const optionalNote = (
    <p className="text-xs text-muted-foreground mt-4">
      {isArabic
        ? 'جميع الحقول اختيارية. يمكنك تحديثها في أي وقت من الإعدادات.'
        : 'All fields are optional. You can update this anytime in Settings.'}
    </p>
  );

  // ── Completion screen ──────────────────────────────────────────────────────

  if (isComplete) {
    return <CompletionScreen isArabic={isArabic} name={data.name} />;
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <span className="text-sm font-semibold tracking-tight">Wealix</span>
        <button
          type="button"
          onClick={handleSkipAll}
          disabled={skippingAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {skippingAll ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          {isArabic ? 'تخطي الإعداد كله' : 'Skip entire setup'}
        </button>
      </div>

      {/* Progress */}
      <div className="shrink-0 px-6 pt-3 pb-1 space-y-2">
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors duration-300 ${i + 1 <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {isArabic ? `خطوة ${step} من ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`}
        </p>
      </div>

      {/* Split-screen body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* Form panel — DOM-first (left in LTR, right in RTL via dir="rtl" on parent) */}
        <div className="flex-1 lg:max-w-[55%] flex flex-col justify-center px-6 py-8 lg:px-16 lg:py-12">
          <div className="w-full max-w-md mx-auto space-y-8">

            {/* Step heading */}
            <div className="space-y-1.5">
              <h2 className="text-2xl font-semibold leading-snug">
                {isArabic ? copy.titleAr : copy.title}
              </h2>
              <p className="text-sm text-muted-foreground">{isArabic ? copy.subtitleAr : copy.subtitle}</p>
            </div>

            {/* ── Step 1: Profile ── */}
            {step === 1 && (
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
                {optionalNote}
              </div>
            )}

            {/* ── Step 2: Notifications ── */}
            {step === 2 && (
              <div className="space-y-3">
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
                    className={`w-full rounded-xl border p-4 text-start transition-colors ${
                      data.notificationChannel === opt.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <span className="text-sm font-medium">{isArabic ? opt.labelAr : opt.label}</span>
                  </button>
                ))}
                {optionalNote}
              </div>
            )}

            {/* ── Step 3: Income ── */}
            {step === 3 && (
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
                {optionalNote}
              </div>
            )}

            {/* ── Step 4: Risk Tolerance ── */}
            {step === 4 && (
              <div className="space-y-3">
                {RISK_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ riskTolerance: opt.id })}
                    className={`w-full rounded-xl border p-4 text-start transition-colors ${
                      data.riskTolerance === opt.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <p className="text-sm font-semibold">{isArabic ? opt.labelAr : opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{isArabic ? opt.descAr : opt.desc}</p>
                  </button>
                ))}
                {optionalNote}
              </div>
            )}

            {/* ── Step 5: Preferred Markets ── */}
            {step === 5 && (
              <div className="space-y-4">
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
              <div className="space-y-4">
                <div className="space-y-3">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch({ retirementGoal: opt.id })}
                      className={`w-full rounded-xl border p-4 text-start transition-colors ${
                        data.retirementGoal === opt.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <p className="text-sm font-semibold">
                        <span className="me-2">{opt.icon}</span>
                        {isArabic ? opt.labelAr : opt.label}
                      </p>
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
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="inline-flex rounded-full border border-border bg-background p-1">
                    {(['monthly', 'annual'] as const).map((cycle) => (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => patch({ billingCycle: cycle })}
                        className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                          data.billingCycle === cycle ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {cycle === 'monthly' ? (isArabic ? 'شهري' : 'Monthly') : (isArabic ? 'سنوي' : 'Annual')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
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
                        className={`flex flex-col rounded-[20px] p-5 text-start border transition-colors ${
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
                          <span className="text-sm font-normal text-muted-foreground ms-1">{suffix}</span>
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

            {/* Navigation */}
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
                  {isArabic ? 'تخطي' : 'Skip'}
                </button>

                <Button onClick={next} disabled={submitting} className="gap-1.5 min-w-[110px]">
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

        {/* Context panel — desktop only, DOM-second (right in LTR, left in RTL) */}
        <div className="hidden lg:flex flex-col justify-center items-center flex-1 border-s border-border bg-muted/20 px-12 py-12">
          {renderContextPanel()}
        </div>

        {/* Mobile preview drawer toggle */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-10">
          <button
            type="button"
            onClick={() => setShowMobilePreview((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-border bg-background/95 backdrop-blur text-xs text-muted-foreground"
          >
            {showMobilePreview
              ? <><ChevronDown className="h-3.5 w-3.5" />{isArabic ? 'إخفاء المعاينة' : 'Hide preview'}</>
              : <><ChevronUp className="h-3.5 w-3.5" />{isArabic ? 'معاينة' : 'Preview'}</>}
          </button>
          {showMobilePreview && (
            <div className="border-t border-border bg-muted/30 px-6 py-8 max-h-64 overflow-y-auto">
              {renderContextPanel()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
