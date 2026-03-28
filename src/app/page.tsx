'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Briefcase, Flame, Globe, LineChart, Moon, Receipt, ShieldCheck, Sun, Wallet } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Show, SignInButton, SignUpButton } from '@clerk/nextjs';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { CookieConsentBanner } from '@/components/shared/CookieConsentBanner';

const sections = {
  en: [
    { id: 'features', label: 'Features' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
  ],
  ar: [
    { id: 'features', label: 'المميزات' },
    { id: 'pricing', label: 'الأسعار' },
    { id: 'faq', label: 'الأسئلة الشائعة' },
  ],
} as const;

const featureCards = [
  {
    icon: Wallet,
    title: { en: 'Financial Command Center', ar: 'مركز قيادة مالي متكامل' },
    description: {
      en: 'Track income, expenses, assets, liabilities, and net worth from one clear operating layer.',
      ar: 'تابع الدخل والمصروفات والأصول والالتزامات وصافي الثروة من طبقة تشغيل واحدة وواضحة.',
    },
  },
  {
    icon: Briefcase,
    title: { en: 'Portfolio Intelligence', ar: 'ذكاء المحفظة الاستثمارية' },
    description: {
      en: 'Import holdings, review allocation, and get AI-guided decisions for hold, trim, add, or diversify.',
      ar: 'استورد المراكز، وراجع التوزيع، واحصل على توصيات ذكية للاحتفاظ أو التخفيض أو الإضافة أو التنويع.',
    },
  },
  {
    icon: Receipt,
    title: { en: 'Receipt Capture & OCR', ar: 'مسح الإيصالات وقراءتها آلياً' },
    description: {
      en: 'Scan or upload receipts, review extracted fields, then approve corrected data into expenses.',
      ar: 'امسح الإيصالات أو ارفعها، ثم راجع البيانات المستخرجة واعتمدها بعد التصحيح ضمن المصروفات.',
    },
  },
  {
    icon: Flame,
    title: { en: 'FIRE Planning', ar: 'تخطيط الاستقلال المالي' },
    description: {
      en: 'Model financial independence progress and connect day-to-day budgeting with long-term freedom.',
      ar: 'احسب تقدمك نحو الاستقلال المالي واربط ميزانيتك اليومية بهدف الحرية المالية على المدى الطويل.',
    },
  },
  {
    icon: Bot,
    title: { en: 'AI Wealth Advisor', ar: 'مستشار ثروة ذكي' },
    description: {
      en: 'Turn your current numbers into practical guidance, summaries, and next-best actions.',
      ar: 'حوّل أرقامك الحالية إلى توصيات عملية وملخصات واضحة وخطوات تالية قابلة للتنفيذ.',
    },
  },
  {
    icon: ShieldCheck,
    title: { en: 'Secure User Accounts', ar: 'حسابات مستخدمين آمنة' },
    description: {
      en: 'Each signed-in user gets an isolated workspace with clean live data and a safe demo experience for guests.',
      ar: 'كل مستخدم مسجل يحصل على مساحة خاصة ببياناته، مع تجربة تجريبية آمنة للزوار.',
    },
  },
];

const stats = [
  { value: '14', label: { en: 'Free Trial Days', ar: 'يوماً للتجربة' } },
  { value: '5+', label: { en: 'Markets', ar: 'أسواق' } },
  { value: 'FIRE', label: { en: 'Planning', ar: 'تخطيط' } },
  { value: 'AI', label: { en: 'Advisor', ar: 'مستشار' } },
];

const pricingByCycle = {
  monthly: [
    {
      id: 'core',
      name: 'Core',
      price: 10,
      currency: 'USD',
      suffix: { en: '/mo', ar: '/شهرياً' },
      savings: null,
      description: {
        en: 'Essential wealth planning for individuals who want a clear operating layer for money, assets, and progress.',
        ar: 'الخطة الأساسية لمن يريد طبقة تشغيل واضحة لإدارة الأموال والأصول ومتابعة التقدم المالي.',
      },
      features: {
        en: ['Income, expenses, budget, and net worth', 'Portfolio tracking and reports', 'Clean financial workspace', '14-day free trial'],
        ar: ['الدخل والمصروفات والميزانية وصافي الثروة', 'متابعة المحفظة والتقارير', 'مساحة مالية منظمة وواضحة', 'تجربة مجانية لمدة 14 يوماً'],
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 15,
      currency: 'USD',
      suffix: { en: '/mo', ar: '/شهرياً' },
      savings: null,
      description: {
        en: 'The full Wealix layer with deeper analysis, premium workflows, and advanced decision support.',
        ar: 'تجربة Wealix الكاملة مع تحليلات أعمق، ومسارات احترافية، ودعم قرار متقدم.',
      },
      features: {
        en: ['Everything in Core', 'AI advisor and portfolio analysis', 'Advanced reports and planning tools', '14-day free trial'],
        ar: ['كل ما في Core', 'المستشار الذكي وتحليل المحفظة', 'تقارير متقدمة وأدوات تخطيط أوسع', 'تجربة مجانية لمدة 14 يوماً'],
      },
    },
  ],
  annual: [
    {
      id: 'core',
      name: 'Core',
      price: 108,
      currency: 'USD',
      suffix: { en: '/year', ar: '/سنوياً' },
      savings: { en: 'Save $12/yr', ar: 'وفّر 12$ سنوياً' },
      description: {
        en: 'Annual Core access — same essential layer, better value. Billed once a year.',
        ar: 'اشتراك سنوي لخطة Core بقيمة أفضل. يُحسب مرة واحدة سنوياً.',
      },
      features: {
        en: ['Income, expenses, budget, and net worth', 'Portfolio tracking and reports', 'Clean financial workspace', '14-day free trial'],
        ar: ['الدخل والمصروفات والميزانية وصافي الثروة', 'متابعة المحفظة والتقارير', 'مساحة مالية منظمة وواضحة', 'تجربة مجانية لمدة 14 يوماً'],
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 144,
      currency: 'USD',
      suffix: { en: '/year', ar: '/سنوياً' },
      savings: { en: 'Save $36/yr', ar: 'وفّر 36$ سنوياً' },
      description: {
        en: 'Annual Pro access — the full Wealix intelligence stack at the best long-term price.',
        ar: 'اشتراك سنوي لخطة Pro للمستخدم الذي يريد طبقة الذكاء والتحليل الكاملة بأفضل قيمة.',
      },
      features: {
        en: ['Everything in Core', 'AI advisor and portfolio analysis', 'Advanced reports and planning tools', '14-day free trial'],
        ar: ['كل ما في Core', 'المستشار الذكي وتحليل المحفظة', 'تقارير متقدمة وأدوات تخطيط أوسع', 'تجربة مجانية لمدة 14 يوماً'],
      },
    },
  ],
} as const;

const faqItems = {
  en: [
    ['What do I get in the 14-day trial?', 'Every new account starts with full premium access for 14 days without a credit card, so you can test the advisor, portfolio analysis, reports, and receipt OCR before choosing a paid plan.'],
    ['Is Wealix a licensed bank, broker, or financial advisor?', 'No. Wealix is a personal wealth management and analysis platform, not a SAMA-licensed bank, brokerage, or regulated investment advisory firm. It does not hold custody of assets or execute trades for you.'],
    ['Where is my data stored?', 'Signed-in workspace data is persisted in Cloudflare D1, and some supporting processors such as AI, OCR, email, and monitoring vendors may handle limited data outside Saudi Arabia depending on the feature you use.'],
    ['How does the AI Advisor use my financial data?', 'When you use AI features, Wealix sends only the financial context needed for that request, such as holdings, cash flow, or receipt content, to the active AI processors. The Privacy Policy explains processing and retention in more detail.'],
    ['How do live market prices work?', 'Saudi holdings are refreshed through SAHMK today. EGX and US coverage can be expanded through additional market providers, but the portfolio page always labels the active source and whether data is live, delayed, or demo.'],
    ['Can I review OCR results before they become expenses?', 'Yes. Receipt OCR is review-first. The extracted merchant, amount, date, category, and raw text are shown for confirmation and editing before anything is saved into your expenses.'],
  ],
  ar: [
    ['ماذا يتضمن الاشتراك التجريبي لمدة 14 يوماً؟', 'يبدأ كل حساب جديد بفترة تجريبية تمنحك وصولاً كاملاً للميزات المميزة لمدة 14 يوماً دون بطاقة ائتمان، حتى تختبر المستشار الذكي وتحليل المحفظة والتقارير وOCR قبل اختيار الخطة المناسبة.'],
    ['هل Wealix بنك أو وسيط أو مستشار استثماري مرخّص؟', 'لا. Wealix منصة لإدارة الثروة الشخصية والتحليل المالي وليست بنكاً مرخصاً من البنك المركزي السعودي أو شركة وساطة أو جهة تقدم استشارات استثمارية منظمة. كما أنها لا تحفظ الأصول ولا تنفذ الصفقات نيابة عنك.'],
    ['أين يتم تخزين بياناتي؟', 'تُحفظ بيانات المستخدمين المسجلين داخل Cloudflare D1، وقد تتعامل بعض الجهات المساندة مثل مزودي الذكاء الاصطناعي وOCR والبريد والمراقبة مع قدر محدود من البيانات خارج السعودية بحسب الميزة المستخدمة.'],
    ['كيف يستخدم المستشار الذكي بياناتي المالية؟', 'عند استخدام ميزات الذكاء الاصطناعي، يرسل Wealix الحد الأدنى اللازم من السياق المالي المرتبط بطلبك، مثل المحفظة أو التدفق النقدي أو محتوى الإيصال، إلى مزودات المعالجة النشطة. وتوضح سياسة الخصوصية تفاصيل المعالجة والاحتفاظ.'],
    ['كيف تعمل أسعار السوق الحية؟', 'يتم تحديث الأسهم السعودية حالياً عبر SAHMK. ويمكن توسيع تغطية مصر والأسواق الأمريكية عبر مزودات إضافية، لكن صفحة المحفظة توضّح دائماً مصدر البيانات وما إذا كانت حية أو متأخرة أو تجريبية.'],
    ['هل أستطيع مراجعة نتيجة OCR قبل حفظها كمصروف؟', 'نعم. مسار OCR في Wealix يعتمد على المراجعة أولاً، حيث تظهر لك بيانات التاجر والمبلغ والتاريخ والتصنيف والنص الخام لتأكيدها أو تعديلها قبل حفظها ضمن المصروفات.'],
  ],
} as const;

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const isArabic = locale === 'ar';
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const currentSections = isArabic ? sections.ar : sections.en;
  const currentFaqItems = isArabic ? faqItems.ar : faqItems.en;

  return (
    <div className={`min-h-screen bg-background text-foreground ${isArabic ? 'font-[family-name:var(--font-arabic)]' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <nav className="glass fixed inset-x-0 top-0 z-50 border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" dir="ltr" className="brand-wordmark flex flex-row items-center gap-0.5 text-xl font-bold">
            <span className="logo-weal">Weal</span>
            <span className="logo-ix">ix</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {currentSections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {section.label}
              </a>
            ))}
            <a href="#contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {isArabic ? 'تواصل معنا' : 'Contact'}
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setLocale(isArabic ? 'en' : 'ar')}
              title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <Globe className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={isArabic ? 'تبديل الوضع' : 'Toggle theme'}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" className="hidden rounded-full md:inline-flex">
                  {isArabic ? 'تسجيل الدخول' : 'Log In'}
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="btn-primary rounded-full">
                  {isArabic ? 'ابدأ الآن' : 'Get Started'}
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button asChild className="btn-primary rounded-full">
                <Link href="/app">
                  {isArabic ? 'افتح التطبيق' : 'Open App'}
                </Link>
              </Button>
            </Show>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden px-4 pt-28 pb-16 sm:px-6 lg:px-8 lg:pt-36 lg:pb-24">
          <div className="hero-orbit pointer-events-none absolute inset-0 opacity-80" />
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="relative z-10"
            >
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                {isArabic ? 'نظام تشغيل الثروة الشخصية' : 'Personal Wealth Operating System'}
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                {isArabic ? (
                  <>
                    أدر ثروتك برؤية <span className="gradient-text">ذكية</span> وواضحة
                  </>
                ) : (
                  <>
                    Master your wealth with <span className="gradient-text">intelligent</span> insights
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                {isArabic
                  ? 'يجمع Wealix بين الميزانية والاستثمار وتخطيط الاستقلال المالي ومسح الإيصالات والتحليل الذكي في منصة واحدة هادئة لإدارة الثروة الشخصية.'
                  : 'Wealix combines budgeting, investing, FIRE planning, OCR-powered expense capture, and AI analysis into one calm operating system for personal wealth.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <Button className="btn-primary rounded-xl px-5 py-6 text-sm">
                      {isArabic ? 'ابدأ التجربة المجانية 14 يوماً' : 'Start 14-Day Trial'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Button asChild className="btn-primary rounded-xl px-5 py-6 text-sm">
                    <Link href="/app">
                      {isArabic ? 'افتح Wealix' : 'Open Wealix'}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </Show>
                <Button asChild variant="outline" className="rounded-xl border-border bg-card/70 px-5 py-6 text-sm">
                  <a href="#features">{isArabic ? 'استكشف المميزات' : 'Explore Features'}</a>
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {isArabic
                  ? 'كل مستخدم جديد يحصل تلقائياً على تجربة مجانية لمدة 14 يوماً، ثم يختار بين Core و Pro.'
                  : 'Every first-time user gets a 14-day free trial automatically, then chooses Core or Pro.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Link href="/privacy" className="transition-colors hover:text-foreground">
                  {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </Link>
                <span className="text-border">•</span>
                <Link href="/terms" className="transition-colors hover:text-foreground">
                  {isArabic ? 'شروط الخدمة' : 'Terms of Service'}
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-primary/18 via-accent/12 to-transparent blur-3xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-border bg-card/90 p-6 shadow-[0_30px_90px_-35px_rgba(0,106,255,0.35)]">
                <div className="flex items-center justify-between border-b border-border pb-5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Wealix App</p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? 'طبقة تشغيل مالية موحّدة' : 'Unified financial operating layer'}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/12 px-3 py-1 text-xs font-medium text-accent">
                    {isArabic ? 'نظام تصميم حي' : 'Live Design System'}
                  </span>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {stats.map((stat) => (
                    <div key={stat.label.en} className="stat-card p-5">
                      <div className="stat-value">{stat.value}</div>
                      <div className="stat-label mt-1">{stat.label[isArabic ? 'ar' : 'en']}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="card-hover rounded-[20px] border border-border bg-background p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{isArabic ? 'صحة المحفظة' : 'Portfolio Health'}</p>
                        <p className="mt-1 text-2xl font-semibold financial-number">612,450 SAR</p>
                      </div>
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <LineChart className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-5 h-28 rounded-2xl bg-[linear-gradient(180deg,rgba(0,106,255,0.14),rgba(0,106,255,0.02))]" />
                  </div>
                  <div className="card-hover rounded-[20px] border border-border bg-background p-5">
                    <p className="text-sm text-muted-foreground">{isArabic ? 'تركيز الذكاء الاصطناعي' : 'AI Focus'}</p>
                    <p className="mt-2 text-base leading-7 text-foreground">
                      {isArabic
                        ? 'خفّض التركز في قطاع الطاقة، وأضف تنويعاً أكبر للدخل، وأعد الموازنة لتحسين مرونة المحفظة.'
                        : 'Reduce concentration in energy, add income diversification, and rebalance to improve resilience.'}
                    </p>
                    <div className="mt-5 flex gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{isArabic ? 'شراء' : 'Buy'}</span>
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{isArabic ? 'احتفاظ' : 'Hold'}</span>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{isArabic ? 'مراجعة' : 'Review'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {isArabic ? 'المميزات' : 'Features'}
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                {isArabic ? 'كل ما تحتاجه في مكان واحد' : 'Everything you need in one place'}
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                {isArabic
                  ? 'تم تصميم Wealix حول واجهة هادئة وبطاقات مالية مركزة وقائمة جانبية مقسمة بوضوح بين النظرة العامة والتخطيط والاستثمار وأدوات النظام.'
                  : 'The live Wealix design is built around calm surfaces, focused financial cards, and a side menu split into overview, planning, investing, and system tools.'}
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature, index) => (
                <motion.div
                  key={feature.title.en}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="card-hover rounded-[20px] border border-border bg-card p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{feature.title[isArabic ? 'ar' : 'en']}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description[isArabic ? 'ar' : 'en']}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-card/70 p-6 sm:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[20px] border border-border bg-background/80 p-5">
                <p className="text-sm font-semibold text-foreground">
                  {isArabic ? 'الخصوصية والشروط' : 'Privacy and terms'}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {isArabic
                    ? 'روابط شروط الخدمة وسياسة الخصوصية متاحة بشكل واضح من الصفحة الرئيسية، وتوضح كيفية استخدام بياناتك وحقوقك ووسائل التواصل القانونية.'
                    : 'Terms of Service and Privacy Policy are linked directly from the homepage and explain how your data is used, your rights, and legal contact channels.'}
                </p>
              </div>
              <div className="rounded-[20px] border border-border bg-background/80 p-5">
                <p className="text-sm font-semibold text-foreground">
                  {isArabic ? 'الحماية التقنية' : 'Technical safeguards'}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {isArabic
                    ? 'تستخدم Wealix تشفير TLS 1.2/1.3 أثناء النقل، وتخزيناً مُشفراً لدى مزودي البنية التحتية، مع عزل بيانات كل مستخدم مسجل داخل مساحة عمل مستقلة.'
                    : 'Wealix uses TLS 1.2/1.3 in transit, encrypted storage with managed infrastructure providers, and isolated signed-in workspaces for each user account.'}
                </p>
              </div>
              <div className="rounded-[20px] border border-border bg-background/80 p-5">
                <p className="text-sm font-semibold text-foreground">
                  {isArabic ? 'معالجة بيانات الذكاء الاصطناعي' : 'AI data processing'}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {isArabic
                    ? 'تُرسل أسئلة المستشار الذكي وتحليل المحفظة إلى واجهات NVIDIA، كما قد تُرسل طلبات OCR إلى NVIDIA أو Datalab بحسب المسار التشغيلي. يتم تمرير الحد الأدنى اللازم من السياق المالي والصور لمعالجة الطلب، وتوضح سياسة الخصوصية تفاصيل المعالجة والاحتفاظ.'
                    : 'AI advisor prompts and portfolio analysis are sent to NVIDIA APIs, and OCR requests may be processed by NVIDIA or Datalab depending on the active OCR path. Only the minimum financial context and image data needed for the request are sent, and the Privacy Policy explains processing and retention in more detail.'}
                </p>
              </div>
              <div className="rounded-[20px] border border-border bg-background/80 p-5">
                <p className="text-sm font-semibold text-foreground">
                  {isArabic ? 'الإفصاح التنظيمي' : 'Regulatory disclosure'}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {isArabic
                    ? 'Wealix ليست بنكاً أو شركة وساطة أو مستشاراً استثمارياً مرخّصاً من البنك المركزي السعودي، ولا تحتفظ بأصول المستخدمين ولا تنفذ الصفقات. المنصة مخصصة للتتبع والتحليل والتخطيط فقط.'
                    : 'Wealix is not a SAMA-licensed bank, broker, or regulated investment advisory firm, does not custody user assets, and does not execute trades. The platform is for tracking, analysis, and planning only.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-border bg-secondary/35 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full bg-card px-3 py-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {isArabic ? 'الأسعار' : 'Pricing'}
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                {isArabic ? 'ابدأ بالتجربة المجانية ثم اختر الخطة المناسبة' : 'Simple paid plans with a 14-day trial first'}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {isArabic
                  ? 'كل حساب جديد يبدأ بتجربة مجانية لمدة 14 يوماً دون بطاقة ائتمان. بعد ذلك يختار المستخدم بين Core أو Pro شهرياً أو سنوياً.'
                  : 'Every first-time account starts on a 14-day free trial without a credit card. After that, users choose Core or Pro monthly or annually.'}
              </p>
              <div className="mt-8 flex flex-col items-center gap-2">
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
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {pricingByCycle[billingCycle].map((plan) => (
                <div
                  key={plan.id}
                  className={`card-hover flex flex-col rounded-[24px] bg-card p-8 ${
                    plan.id === 'pro' ? 'border border-primary/20 ring-1 ring-primary/10' : 'border border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm font-medium ${plan.id === 'pro' ? 'text-primary' : 'text-muted-foreground'}`}>{plan.name}</p>
                      <h3 className="mt-3 text-4xl font-semibold financial-number">
                        ${plan.price}
                        <span className="ml-1 text-base font-normal text-muted-foreground">{plan.suffix[isArabic ? 'ar' : 'en']}</span>
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {plan.id === 'pro' && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {isArabic ? 'الأكثر تقدماً' : 'Most Advanced'}
                        </span>
                      )}
                      {plan.savings && (
                        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                          {plan.savings[isArabic ? 'ar' : 'en']}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{plan.description[isArabic ? 'ar' : 'en']}</p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-muted-foreground">
                    {plan.features[isArabic ? 'ar' : 'en'].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Show when="signed-out">
                      <SignUpButton mode="modal">
                        <Button
                          className={`w-full rounded-xl ${plan.id === 'pro' ? 'btn-primary' : ''}`}
                          variant={plan.id === 'pro' ? 'default' : 'outline'}
                        >
                          {isArabic ? 'ابدأ التجربة المجانية' : 'Start Free Trial'}
                        </Button>
                      </SignUpButton>
                    </Show>
                    <Show when="signed-in">
                      <Button asChild className={`w-full rounded-xl ${plan.id === 'pro' ? 'btn-primary' : ''}`} variant={plan.id === 'pro' ? 'default' : 'outline'}>
                        <Link href="/app/settings/billing">
                          {isArabic ? 'اشترك الآن' : 'Subscribe Now'}
                        </Link>
                      </Button>
                    </Show>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 xl:grid-cols-3">
            {currentFaqItems.map((item) => {
              const [title, body] = item;
              return (
                <div key={title} className="card-hover rounded-[20px] border border-border bg-card p-6">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="contact" className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(135deg,rgba(0,106,255,0.10),rgba(0,204,153,0.08))] p-8 md:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center rounded-full bg-background/80 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                  Wealix
                </span>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {isArabic ? 'نظام تشغيل الثروة الشخصية' : 'Personal Wealth Operating System'}
                </h2>
                <p className="mt-4 text-base leading-8 text-muted-foreground">
                  {isArabic
                    ? 'تعكس هذه الصفحة الرئيسية هوية Wealix الحديثة من حيث الألوان والخطوط وبنية المحتوى وتجربة الدخول إلى التطبيق.'
                    : 'The landing page, token system, split logo, sidebar grouping, and app shell in this repo now follow the live Wealix frontend direction instead of the older navy-gold theme.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <Button className="btn-primary rounded-xl">{isArabic ? 'أنشئ مساحتك الآن' : 'Create your workspace'}</Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Button asChild className="btn-primary rounded-xl">
                    <Link href="/app">{isArabic ? 'اذهب إلى التطبيق' : 'Go to app'}</Link>
                  </Button>
                </Show>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/70 pt-6 text-sm text-muted-foreground">
              <Link href="/terms" className="transition-colors hover:text-foreground">
                {isArabic ? 'شروط الخدمة' : 'Terms of Service'}
              </Link>
              <span className="text-border">•</span>
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <CookieConsentBanner isArabic={isArabic} />
    </div>
  );
}
