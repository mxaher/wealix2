'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Globe2,
  Layers3,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useAppStore } from '@/store/useAppStore';
import { CookieConsentBanner } from '@/components/shared/CookieConsentBanner';
import { MarketingNav } from '@/components/landing/MarketingNav';
import { ContactForm } from '@/components/landing/ContactForm';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

const heroStats = [
  {
    value: 'MENA +',
    label: { en: 'Investor-ready regions', ar: 'أسواق جاهزة للمستثمرين' },
  },
  {
    value: 'AI',
    label: { en: 'Decision support layer', ar: 'طبقة دعم القرار' },
  },
  {
    value: '24/7',
    label: { en: 'Portfolio context on demand', ar: 'سياق محفظتك عند الطلب' },
  },
  {
    value: 'EN / AR',
    label: { en: 'Native bilingual experience', ar: 'تجربة ثنائية اللغة أصلية' },
  },
] as const;

const content = {
  en: {
    heroBadge: 'Global investing intelligence, designed for MENA',
    heroTitle: 'One AI-powered platform for portfolios, context, and confident investment decisions.',
    heroDescription:
      'Wealix helps investors across MENA understand allocations, ask portfolio questions in natural language, and evaluate decisions with a calm, bilingual product built for regional markets and global expansion.',
    primaryCta: 'Start 14-Day Trial',
    secondaryCta: 'Explore the Platform',
    trustNote:
      'Decision support only. Wealix helps you evaluate options, understand risk, and stay organized. It does not provide regulated financial advice or execute trades.',
    valueEyebrow: 'Positioning',
    valueTitle: 'Built for investors across MENA, ready for more markets over time.',
    valueDescription:
      'Start with regional relevance, keep a global product standard, and scale market coverage without rewriting the investment experience.',
    valuePoints: [
      'Bilingual workflows for Arabic and English investors.',
      'Regional market support today, with additional markets added over time.',
      'A single operating layer for questions, analysis, and portfolio monitoring.',
    ],
    featuresEyebrow: 'Platform Highlights',
    featuresTitle: 'Clear product depth, not generic fintech promises.',
    featuresDescription:
      'Each section is built to help an investor understand what they own, why it matters, and what to evaluate next.',
    features: [
      {
        icon: Globe2,
        title: 'Global positioning with MENA focus',
        description:
          'Built for investors across MENA with a roadmap that supports regional markets now and expands into new markets over time.',
      },
      {
        icon: BrainCircuit,
        title: 'AI advisor with portfolio context',
        description:
          'Ask practical questions in natural language and receive explanations grounded in your holdings, allocation, and investment goals.',
      },
      {
        icon: Layers3,
        title: 'Portfolio analysis you can actually act on',
        description:
          'See diversification, concentration, gains and losses, sector mix, and allocation shifts in a format made for real decisions.',
      },
      {
        icon: Target,
        title: 'Decision support, not hype',
        description:
          'Evaluate buy, hold, and sell scenarios with clear reasoning around exposure, signals, valuation, and portfolio fit.',
      },
    ],
    pricingEyebrow: 'Pricing',
    pricingTitle: 'Start with the plan that matches your analysis workflow.',
    pricingDescription:
      'Both plans are built for bilingual investors who want clarity, portfolio intelligence, and a cleaner investment operating layer.',
    pricingPlans: [
      {
        name: 'Core',
        price: '$10',
        cadence: '/month',
        description: 'For investors who want a calm workspace for tracking and understanding their portfolio.',
        points: [
          'Portfolio tracking and allocation monitoring',
          'Bilingual Arabic and English experience',
          'Regional market support with ongoing expansion',
          '14-day trial before committing',
        ],
      },
      {
        name: 'Pro',
        price: '$15',
        cadence: '/month',
        description: 'For investors who want the full AI and decision-support layer.',
        points: [
          'Everything in Core',
          'AI Advisor with portfolio context',
          'Advanced portfolio analysis views',
          'Decision-support workflows for buy, hold, and sell reviews',
        ],
      },
    ],
    advisorEyebrow: 'AI Advisor',
    advisorTitle: 'Ask investment questions the way you naturally think.',
    advisorDescription:
      'The AI Advisor is a working investment copilot, not a generic chatbot. It reads portfolio context, explains exposures, highlights risks, and helps investors move from confusion to clarity.',
    advisorBullets: [
      'Ask what changed in your portfolio and why it matters.',
      'Get portfolio insights, definitions, and plain-language explanations.',
      'Understand key risks, opportunities, and concentration issues.',
      'Receive context-aware guidance tied to your holdings and allocation.',
    ],
    advisorPrompts: [
      'What is driving the risk in my portfolio right now?',
      'Does this new stock improve diversification or add more concentration?',
      'Explain my sector exposure in simple terms.',
      'Which holdings deserve a deeper review before I buy more?',
    ],
    analysisEyebrow: 'Portfolio Analysis',
    analysisTitle: 'Advanced analysis inspired by institutional-grade portfolio tooling.',
    analysisDescription:
      'Wealix surfaces the kind of portfolio questions serious investors ask every week, then packages them in a product that stays readable on desktop and mobile.',
    analysisBullets: [
      'Allocation analysis by asset, sector, geography, and strategy.',
      'Diversification insights with concentration risk detection.',
      'Performance tracking with gains and losses breakdown.',
      'Sector and asset comparison to spot imbalance quickly.',
      'Portfolio snapshots that make change over time easy to read.',
    ],
    analysisPanels: [
      {
        label: 'Allocation mix',
        value: '43%',
        description: 'Largest asset cluster shown with concentration flags and diversification prompts.',
      },
      {
        label: 'Performance view',
        value: '+12.4%',
        description: 'Track gains, losses, and attribution across positions instead of only total return.',
      },
      {
        label: 'Risk scan',
        value: '3 alerts',
        description: 'Detect when one sector, theme, or market begins to dominate the portfolio.',
      },
    ],
    decisionEyebrow: 'Decision Support',
    decisionTitle: 'Evaluate buy, hold, and sell decisions with context.',
    decisionDescription:
      'Wealix helps investors test whether an idea fits the current portfolio before they act. The platform frames trade-offs clearly and keeps the product on the right side of financial-advice boundaries.',
    decisionColumns: [
      {
        title: 'What investors can evaluate',
        points: [
          'Whether a position still fits the portfolio objective.',
          'How a new idea changes exposure and concentration.',
          'Whether current market signals support patience or review.',
          'How valuation and personal risk profile affect the decision.',
        ],
      },
      {
        title: 'How it is framed',
        points: [
          'Decision support only, not a directive to trade.',
          'Explanations are built around context, not certainty.',
          'Users stay in control of the final decision.',
          'Reasoning stays transparent so investors can challenge it.',
        ],
      },
    ],
    faqEyebrow: 'FAQ',
    faqTitle: 'Clear answers for investors, compliance, and trust.',
    faqItems: [
      {
        question: 'What does the AI Advisor do?',
        answer:
          'It lets you ask investment and portfolio questions in natural language, then returns context-aware explanations about allocations, risks, opportunities, and portfolio fit.',
      },
      {
        question: 'How does portfolio analysis work?',
        answer:
          'Wealix reads your holdings and surfaces allocation, diversification, concentration risk, sector mix, performance tracking, and gains or losses breakdowns so you can review the portfolio from multiple angles.',
      },
      {
        question: 'Can I decide whether to buy or sell?',
        answer:
          'You can evaluate buy, hold, and sell scenarios inside the app, but the product is framed as decision support. It helps you assess exposure, valuation, signals, and fit rather than giving regulated financial advice.',
      },
      {
        question: 'Does the app support MENA markets?',
        answer:
          'Yes. The platform is built for investors across MENA and is designed to support regional markets first while remaining ready for broader global coverage.',
      },
      {
        question: 'Will more markets be added?',
        answer:
          'Yes. The product direction is to expand market coverage over time so investors can keep using the same workflow as new exchanges and regions are introduced.',
      },
      {
        question: 'Is this financial advice?',
        answer:
          'No. Wealix provides analytics, portfolio context, and decision-support tools. It does not provide regulated investment advice, hold assets, or execute trades.',
      },
      {
        question: 'How is my data used?',
        answer:
          'Your data is used to power your workspace, generate portfolio insights, and support the AI features you actively use. Privacy and processing details are documented clearly in the Privacy Policy.',
      },
    ],
    ctaTitle: 'See your portfolio with more context and less noise.',
    ctaDescription:
      'Move from scattered spreadsheets and disconnected apps to one intelligent workspace for analysis, questions, and portfolio decision support.',
    ctaPrimary: 'Create your workspace',
    ctaSecondary: 'Contact sales',
    footerBlurb:
      'A bilingual investment platform for investors across MENA, built to support regional markets now and expand globally over time.',
  },
  ar: {
    heroBadge: 'ذكاء استثماري عالمي مصمم للمستثمرين في المنطقة',
    heroTitle: 'منصة واحدة مدعومة بالذكاء الاصطناعي للمحافظ الاستثمارية والسياق واتخاذ القرار بثقة.',
    heroDescription:
      'تساعد Wealix المستثمرين في منطقة الشرق الأوسط وشمال أفريقيا على فهم التوزيع، وطرح الأسئلة الاستثمارية باللغة الطبيعية، وتقييم القرارات ضمن تجربة هادئة ثنائية اللغة تدعم الأسواق الإقليمية اليوم وتتوسع عالمياً مع الوقت.',
    primaryCta: 'ابدأ التجربة المجانية لمدة 14 يوماً',
    secondaryCta: 'استكشف المنصة',
    trustNote:
      'المنصة مخصصة لدعم القرار فقط. تساعدك Wealix على تقييم الخيارات وفهم المخاطر وتنظيم الصورة الاستثمارية، لكنها لا تقدم نصيحة مالية منظمة ولا تنفذ الصفقات.',
    valueEyebrow: 'التموضع',
    valueTitle: 'مصممة للمستثمرين في المنطقة، وجاهزة لإضافة أسواق جديدة مع الوقت.',
    valueDescription:
      'ابدأ بملاءمة حقيقية لأسواق المنطقة، وحافظ على مستوى منتج عالمي، ووسّع تغطية الأسواق من دون إعادة بناء تجربة الاستثمار من الصفر.',
    valuePoints: [
      'مسارات استخدام أصلية بالعربية والإنجليزية.',
      'دعم للأسواق الإقليمية اليوم مع إضافة أسواق جديدة تدريجياً.',
      'طبقة تشغيل واحدة للأسئلة والتحليل ومتابعة المحفظة.',
    ],
    featuresEyebrow: 'أبرز مزايا المنصة',
    featuresTitle: 'عمق منتج واضح، بعيد عن الوعود المالية العامة.',
    featuresDescription:
      'كل قسم مصمم ليساعد المستثمر على فهم ما يملكه، ولماذا يهم، وما الذي يستحق التقييم بعد ذلك.',
    features: [
      {
        icon: Globe2,
        title: 'تموضع عالمي مع تركيز على المنطقة',
        description:
          'مبنية للمستثمرين في الشرق الأوسط وشمال أفريقيا، مع خارطة طريق تدعم الأسواق الإقليمية حالياً وتتوسع إلى أسواق جديدة مع الوقت.',
      },
      {
        icon: BrainCircuit,
        title: 'مستشار ذكي يفهم سياق المحفظة',
        description:
          'اطرح أسئلة عملية باللغة الطبيعية واحصل على تفسيرات مرتبطة مباشرة بمقتنياتك وتوزيعك وأهدافك الاستثمارية.',
      },
      {
        icon: Layers3,
        title: 'تحليل محفظة يمكن العمل عليه فعلاً',
        description:
          'شاهد التنويع ومخاطر التركز والأرباح والخسائر وتوزيع القطاعات وتحولات التخصيص ضمن عرض يساعد على اتخاذ القرار.',
      },
      {
        icon: Target,
        title: 'دعم قرار واضح لا ضجيج فيه',
        description:
          'قيّم سيناريوهات الشراء أو الاحتفاظ أو البيع من خلال شرح واضح للتعرض والإشارات والتقييم ومدى ملاءمة الاستثمار للمحفظة.',
      },
    ],
    pricingEyebrow: 'الأسعار',
    pricingTitle: 'ابدأ بالخطة التي تناسب أسلوبك في التحليل والمتابعة.',
    pricingDescription:
      'كلتا الخطتين موجهتان للمستثمر الذي يريد وضوحاً أكبر وذكاءً أفضل للمحفظة وتجربة استثمار ثنائية اللغة.',
    pricingPlans: [
      {
        name: 'Core',
        price: '$10',
        cadence: '/شهرياً',
        description: 'للمستثمر الذي يريد مساحة هادئة لتتبع المحفظة وفهمها.',
        points: [
          'متابعة المحفظة ومراقبة التخصيص',
          'تجربة أصلية بالعربية والإنجليزية',
          'دعم للأسواق الإقليمية مع توسع مستمر',
          'تجربة لمدة 14 يوماً قبل الاشتراك',
        ],
      },
      {
        name: 'Pro',
        price: '$15',
        cadence: '/شهرياً',
        description: 'لمن يريد طبقة الذكاء الاصطناعي ودعم القرار بالكامل.',
        points: [
          'كل ما في Core',
          'مستشار ذكي يفهم سياق المحفظة',
          'واجهات تحليل متقدمة للمحفظة',
          'مسارات دعم قرار لسيناريوهات الشراء والاحتفاظ والبيع',
        ],
      },
    ],
    advisorEyebrow: 'المستشار الذكي',
    advisorTitle: 'اسأل عن استثماراتك بالطريقة التي تفكر بها فعلاً.',
    advisorDescription:
      'المستشار الذكي في Wealix ليس دردشة عامة، بل طبقة عمل استثمارية تفهم سياق المحفظة، وتشرح التعرض، وتلفت الانتباه إلى المخاطر، وتحوّل الغموض إلى صورة أوضح.',
    advisorBullets: [
      'اسأل ما الذي تغيّر في محفظتك ولماذا يهم.',
      'احصل على تحليلات وتعريفات وشروحات بلغة واضحة.',
      'افهم المخاطر الرئيسية والفرص ومناطق التركز.',
      'تلقَّ توجيهاً سياقياً مرتبطاً بمقتنياتك وتوزيعك.',
    ],
    advisorPrompts: [
      'ما الذي يرفع مستوى المخاطر في محفظتي حالياً؟',
      'هل يضيف هذا السهم الجديد تنويعاً أم يزيد التركز؟',
      'اشرح لي تعرضي القطاعي بلغة بسيطة.',
      'أي المراكز يستحق مراجعة أعمق قبل أن أزيده؟',
    ],
    analysisEyebrow: 'تحليل المحفظة',
    analysisTitle: 'تحليل متقدم مستلهم من أدوات المحافظ الاحترافية.',
    analysisDescription:
      'تُظهر Wealix الأسئلة التي يطرحها المستثمر الجاد على محفظته بشكل متكرر، ثم تقدّمها في منتج سهل القراءة على الجوال وسطح المكتب.',
    analysisBullets: [
      'تحليل التخصيص حسب الأصل والقطاع والجغرافيا والاستراتيجية.',
      'رؤى تنويع مع اكتشاف مخاطر التركز.',
      'متابعة الأداء مع تفصيل الأرباح والخسائر.',
      'مقارنة القطاعات والأصول لاكتشاف الاختلال بسرعة.',
      'لقطات واضحة للمحفظة تجعل التغيّر عبر الوقت أسهل فهماً.',
    ],
    analysisPanels: [
      {
        label: 'مزيج التخصيص',
        value: '43%',
        description: 'إظهار أكبر كتلة في المحفظة مع تنبيهات التركز واقتراحات التنويع.',
      },
      {
        label: 'قراءة الأداء',
        value: '+12.4%',
        description: 'تابع الأرباح والخسائر وأثر كل مركز بدلاً من الاكتفاء بالعائد الكلي.',
      },
      {
        label: 'فحص المخاطر',
        value: '3 تنبيهات',
        description: 'اكتشف متى يبدأ قطاع أو موضوع أو سوق واحد بالهيمنة على المحفظة.',
      },
    ],
    decisionEyebrow: 'دعم القرار',
    decisionTitle: 'قيّم قرارات الشراء والاحتفاظ والبيع ضمن سياق واضح.',
    decisionDescription:
      'تساعد Wealix المستثمر على اختبار ما إذا كانت الفكرة الاستثمارية مناسبة للمحفظة الحالية قبل التنفيذ، مع توضيح المفاضلات من دون تجاوز حدود النصيحة المالية المنظمة.',
    decisionColumns: [
      {
        title: 'ما الذي يمكن للمستثمر تقييمه',
        points: [
          'هل ما زال المركز مناسباً لهدف المحفظة؟',
          'كيف تغيّر الفكرة الجديدة مستوى التعرض أو التركز؟',
          'هل تدعم إشارات السوق الحالية الانتظار أو المراجعة؟',
          'كيف يؤثر التقييم ومستوى المخاطر الشخصي على القرار؟',
        ],
      },
      {
        title: 'كيف يتم تأطير ذلك',
        points: [
          'دعم قرار فقط، وليس توجيهاً مباشراً للتداول.',
          'الشرح مبني على السياق لا على اليقين المطلق.',
          'المستخدم يحتفظ بالقرار النهائي دائماً.',
          'المنطق واضح حتى يستطيع المستثمر مراجعته ونقده.',
        ],
      },
    ],
    faqEyebrow: 'الأسئلة الشائعة',
    faqTitle: 'إجابات واضحة تبني الثقة للمستثمر والامتثال معاً.',
    faqItems: [
      {
        question: 'ماذا يفعل المستشار الذكي؟',
        answer:
          'يتيح لك طرح أسئلة استثمارية وأسئلة عن المحفظة باللغة الطبيعية، ثم يعرض تفسيرات مرتبطة بسياقك حول التوزيع والمخاطر والفرص ومدى ملاءمة الاستثمار للمحفظة.',
      },
      {
        question: 'كيف يعمل تحليل المحفظة؟',
        answer:
          'تقرأ Wealix مقتنياتك وتعرض التخصيص والتنويع ومخاطر التركز وتوزيع القطاعات وتتبع الأداء وتفصيل الأرباح والخسائر حتى تراجع المحفظة من أكثر من زاوية.',
      },
      {
        question: 'هل أستطيع تحديد ما إذا كنت سأشتري أو أبيع؟',
        answer:
          'يمكنك تقييم سيناريوهات الشراء والاحتفاظ والبيع داخل التطبيق، لكن المنتج مؤطر كأداة دعم قرار. فهو يساعدك على تقييم التعرض والتقييم والإشارات والملاءمة، وليس تقديم نصيحة مالية منظمة.',
      },
      {
        question: 'هل يدعم التطبيق أسواق الشرق الأوسط وشمال أفريقيا؟',
        answer:
          'نعم. المنصة مصممة للمستثمرين في المنطقة، مع بنية تتيح دعم الأسواق الإقليمية أولاً مع الجاهزية لتغطية أوسع عالمياً.',
      },
      {
        question: 'هل ستتم إضافة أسواق جديدة؟',
        answer:
          'نعم. اتجاه المنتج هو توسيع تغطية الأسواق تدريجياً حتى يحافظ المستثمر على نفس سير العمل مع إضافة بورصات ومناطق جديدة.',
      },
      {
        question: 'هل هذا يعد نصيحة مالية؟',
        answer:
          'لا. تقدم Wealix أدوات تحليل وسياق للمحفظة ودعم قرار فقط. وهي لا تقدم نصيحة استثمارية منظمة ولا تحتفظ بالأصول ولا تنفذ الصفقات.',
      },
      {
        question: 'كيف تُستخدم بياناتي؟',
        answer:
          'تُستخدم بياناتك لتشغيل مساحة عملك وتوليد تحليلات المحفظة ودعم ميزات الذكاء الاصطناعي التي تختار استخدامها. وتوضح سياسة الخصوصية تفاصيل المعالجة بشكل واضح.',
      },
    ],
    ctaTitle: 'شاهد محفظتك بسياق أوضح وضجيج أقل.',
    ctaDescription:
      'انتقل من الجداول المتفرقة والأدوات المنفصلة إلى مساحة ذكية واحدة للتحليل وطرح الأسئلة ودعم قرارات المحفظة الاستثمارية.',
    ctaPrimary: 'أنشئ مساحتك',
    ctaSecondary: 'تواصل مع الفريق',
    footerBlurb:
      'منصة استثمار ثنائية اللغة للمستثمرين في المنطقة، تدعم الأسواق الإقليمية اليوم وتتوسع إلى تغطية أوسع عالمياً مع الوقت.',
  },
} as const;

export function LandingPageClient() {
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';
  const [activePrompt, setActivePrompt] = useState(0);
  const { isLoaded, isSignedIn } = useAuth();
  const clerkSignedIn = isLoaded && isSignedIn;
  const t = content[locale];

  return (
    <div
      className={`min-h-screen bg-background text-foreground ${isArabic ? 'font-[family-name:var(--font-arabic)]' : ''}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <MarketingNav showSections />

      <main>
        <section className="relative overflow-hidden px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-34 lg:pb-28">
          <div className="hero-orbit pointer-events-none absolute inset-0 opacity-80" />
          <div className="hero-grid pointer-events-none absolute inset-x-0 top-16 h-[42rem] opacity-60" />
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="relative z-10"
            >
              <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                {t.heroBadge}
              </span>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                {isArabic ? (
                  <>
                    منصة واحدة مدعومة{' '}
                    <span className="gradient-text">بالذكاء الاصطناعي</span>
                    {' '}للمحافظ الاستثمارية والسياق واتخاذ القرار بثقة.
                  </>
                ) : (
                  <>
                    One <span className="gradient-text">AI-powered</span> platform for portfolios, context, and confident investment decisions.
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                {t.heroDescription}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {!clerkSignedIn && (
                  <Button asChild className="btn-primary rounded-full px-5 py-6 text-sm">
                    <Link href="/sign-up">
                      {t.primaryCta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {clerkSignedIn && (
                  <Button asChild className="btn-primary rounded-full px-5 py-6 text-sm">
                    <Link href="/app">
                      {isArabic ? 'افتح Wealix' : 'Open Wealix'}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-full border-border bg-card/80 px-5 py-6 text-sm">
                  <a href="#value">{t.secondaryCta}</a>
                </Button>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                {t.trustNote}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-primary/18 via-accent/12 to-transparent blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-border/80 bg-white/92 p-6 shadow-[0_30px_80px_-28px_rgba(0,106,255,0.25)] backdrop-blur dark:bg-card/90">
                <div className="flex items-center justify-between border-b border-border/80 pb-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Wealix AI Advisor</p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? 'رؤية محفظتك بلغة أوضح' : 'Portfolio clarity in natural language'}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                    {isArabic ? 'دعم قرار' : 'Decision Support'}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {heroStats.map((stat) => (
                    <div key={stat.value} className="stat-card border border-border/70 p-5">
                      <div className="stat-value">{stat.value}</div>
                      <div className="stat-label mt-1">{stat.label[locale]}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[24px] border border-border bg-background/90 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {isArabic ? 'مثال حي من المستشار' : 'Advisor example'}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {content[locale].advisorPrompts[activePrompt]}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Bot className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 rounded-[20px] bg-secondary/70 p-4 text-sm leading-7 text-muted-foreground">
                    {isArabic
                      ? 'يعرض Wealix أثر هذا السؤال على التركز والقطاعات وتوازن المحفظة، ثم يشرح المفاضلات بلغتك وبأسلوب عملي.'
                      : 'Wealix explains the impact on concentration, sectors, and portfolio balance, then turns the trade-offs into practical language.'}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.advisorPrompts.map((prompt, index) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setActivePrompt(index)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          activePrompt === index
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="value" className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-[32px] border border-border bg-card/85 p-8 shadow-sm lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{t.valueEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t.valueTitle}</h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{t.valueDescription}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {t.valuePoints.map((point) => (
                <div key={point} className="rounded-[24px] border border-border bg-background/80 p-5">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-sm leading-7 text-foreground">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{t.featuresEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t.featuresTitle}</h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{t.featuresDescription}</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {t.features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className="card-hover rounded-[28px] border border-border bg-card p-7"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-border bg-secondary/35 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{t.pricingEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t.pricingTitle}</h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{t.pricingDescription}</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {t.pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className={`rounded-[28px] border bg-card p-8 shadow-sm ${
                    index === 1 ? 'border-primary/25 ring-1 ring-primary/12' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm font-semibold ${index === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {plan.name}
                      </p>
                      <div className="mt-3 flex items-end gap-1">
                        <p className="text-4xl font-semibold financial-number">{plan.price}</p>
                        <span className="pb-1 text-sm text-muted-foreground">{plan.cadence}</span>
                      </div>
                    </div>
                    {index === 1 && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {isArabic ? 'الأكثر شمولاً' : 'Most complete'}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{plan.description}</p>
                  <ul className="mt-6 space-y-3">
                    {plan.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm leading-7 text-foreground">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    {!clerkSignedIn && (
                      <Button asChild className={`w-full rounded-xl ${index === 1 ? 'btn-primary' : ''}`} variant={index === 1 ? 'default' : 'outline'}>
                        <Link href="/sign-up">{isArabic ? 'ابدأ الآن' : 'Get started'}</Link>
                      </Button>
                    )}
                    {clerkSignedIn && (
                      <Button asChild className={`w-full rounded-xl ${index === 1 ? 'btn-primary' : ''}`} variant={index === 1 ? 'default' : 'outline'}>
                        <Link href="/app">{isArabic ? 'افتح التطبيق' : 'Open app'}</Link>
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="advisor" className="border-y border-border bg-secondary/35 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{t.advisorEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t.advisorTitle}</h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{t.advisorDescription}</p>
              <ul className="mt-8 space-y-3">
                {t.advisorBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm leading-7 text-foreground">
                    <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-accent" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4">
              {t.advisorPrompts.map((prompt, index) => (
                <motion.div
                  key={prompt}
                  initial={{ opacity: 0, x: isArabic ? 20 : -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.32, delay: index * 0.06 }}
                  className="rounded-[24px] border border-border bg-card p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                    {isArabic ? 'مثال سؤال' : 'Example prompt'}
                  </p>
                  <p className="mt-3 text-base font-medium text-foreground">{prompt}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="analysis" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="rounded-[32px] border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">{t.analysisEyebrow}</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.analysisTitle}</h2>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{t.analysisDescription}</p>
              <ul className="mt-8 space-y-3">
                {t.analysisBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm leading-7 text-foreground">
                    <Radar className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4">
              {t.analysisPanels.map((panel) => (
                <div key={panel.label} className="rounded-[26px] border border-border bg-white/88 p-6 shadow-sm dark:bg-card/88">
                  <p className="text-sm text-muted-foreground">{panel.label}</p>
                  <p className="mt-3 text-4xl font-semibold financial-number text-foreground">{panel.value}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{panel.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="decisions" className="border-y border-border bg-[linear-gradient(180deg,rgba(0,106,255,0.04),rgba(0,204,153,0.03))] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{t.decisionEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t.decisionTitle}</h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{t.decisionDescription}</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {t.decisionColumns.map((column) => (
                <div key={column.title} className="rounded-[28px] border border-border bg-card p-7 shadow-sm">
                  <div className="flex items-center gap-3">
                    <BriefcaseBusiness className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{column.title}</h3>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {column.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{t.faqEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t.faqTitle}</h2>
            </div>
            <div className="rounded-[28px] border border-border bg-card px-6 py-2 shadow-sm sm:px-8">
              <Accordion type="single" collapsible className="w-full">
                {t.faqItems.map((item, index) => (
                  <AccordionItem key={item.question} value={`faq-${index}`} className="border-border">
                    <AccordionTrigger className="py-5 text-base font-medium hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto overflow-hidden rounded-[34px] border border-border bg-card p-8 shadow-[0_22px_65px_-35px_rgba(0,106,255,0.24)] sm:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Wealix</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t.ctaTitle}</h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">{t.ctaDescription}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {!clerkSignedIn && (
                    <Button asChild className="btn-primary rounded-full px-5">
                      <Link href="/sign-up">{t.ctaPrimary}</Link>
                    </Button>
                  )}
                  {clerkSignedIn && (
                    <Button asChild className="btn-primary rounded-full px-5">
                      <Link href="/app">{isArabic ? 'افتح التطبيق' : 'Open app'}</Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="rounded-full px-5">
                    <Link href="/contact">{t.ctaSecondary}</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="rounded-[28px] border border-border bg-background/70 p-6">
                  <ContactForm isArabic={isArabic} compact />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Link href="/contact" className="transition-colors hover:text-foreground">
                    {isArabic ? 'صفحة التواصل' : 'Contact page'}
                  </Link>
                  <span className="text-border">•</span>
                  <Link href="/privacy" className="transition-colors hover:text-foreground">
                    {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
                  </Link>
                  <span className="text-border">•</span>
                  <Link href="/terms" className="transition-colors hover:text-foreground">
                    {isArabic ? 'شروط الخدمة' : 'Terms of Service'}
                  </Link>
                  <span className="text-border">•</span>
                  <Link href="/blog" className="transition-colors hover:text-foreground">
                    {isArabic ? 'المدونة' : 'Blog'}
                  </Link>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{t.footerBlurb}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <CookieConsentBanner isArabic={isArabic} />
    </div>
  );
}
