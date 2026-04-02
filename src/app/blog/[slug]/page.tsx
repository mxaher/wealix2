import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogSlugClient } from './BlogSlugClient';

type Props = { params: Promise<{ slug: string }> };

export type Article = {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  date: string;
  readTime: string;
  readTimeAr: string;
  tag: string;
  tagAr: string;
  content: string;
  contentAr: string;
  faq: { q: string; a: string; qAr: string; aAr: string }[];
};

const articles: Record<string, Article> = {
  'how-to-track-investment-portfolio': {
    title: 'How to Track Your Investment Portfolio in 2025 (The Right Way)',
    titleAr: 'كيفية تتبع محفظتك الاستثمارية في 2025 (الطريقة الصحيحة)',
    description:
      'Most investors check their brokerage app and call it tracking. That is not tracking — that is hoping. Here is how to build a real-time view of every asset you own.',
    descriptionAr:
      'معظم المستثمرين يتحققون من تطبيق الوساطة ويعتبرونه تتبعاً. هذا ليس تتبعاً — هذا أمل. إليك كيفية بناء رؤية فورية لكل أصل تملكه.',
    date: '2025-03-15',
    readTime: '8 min read',
    readTimeAr: '8 دقائق قراءة',
    tag: 'Portfolio',
    tagAr: 'المحفظة',
    content: `## The Problem With How Most People Track Investments
Most people think they track their portfolio. They open their brokerage app, see a green number, and feel good. That is not tracking. That is checking.
Real portfolio tracking means knowing your **actual return** (not the brokerage's inflated IRR), your **allocation across all accounts** (not just one broker), your **sector exposure**, your **currency risk**, and your **progress toward a specific goal**.
Once you define tracking that way, most tools fall short immediately.
## What Good Portfolio Tracking Looks Like
A proper tracking system answers six questions daily:
1. **What is my total net worth today?** — Across all accounts, brokers, cash, real estate, crypto.
2. **What is my actual return (XIRR)?** — Time-weighted, not the broker's distorted number.
3. **Am I over-concentrated anywhere?** — Sector, geography, single stock.
4. **Am I on track for my goal?** — Whether that goal is FIRE, a house, or retirement.
5. **What is my biggest drag on performance?** — Not to panic-sell, but to re-evaluate.
6. **Do I need to rebalance?** — Based on your target allocation, not emotion.
## Why Spreadsheets Break Down
Spreadsheets work for 6 months. Then you add a third broker, forget to update for a week, and the data becomes unreliable. Manual entry is not a system — it is a habit that will eventually fail.
Automated aggregation connected to real-time market data is the only sustainable approach for serious investors.
## The Wealix Approach
Wealix consolidates every account, applies real-time pricing, calculates true XIRR, flags concentration risk automatically, and shows FIRE progress without any manual data entry after initial setup. The AI advisor then tells you specifically what to do — not generic advice, but recommendations based on your actual holdings.`,
    contentAr: `## المشكلة في كيفية تتبع معظم الناس للاستثمارات
يعتقد معظم الناس أنهم يتتبعون محفظتهم. يفتحون تطبيق الوساطة، ويرون رقماً أخضر، ويشعرون بالرضا. هذا ليس تتبعاً. هذا تفقد.
تتبع المحفظة الحقيقي يعني معرفة **عائدك الفعلي** (ليس معدل العائد الداخلي IRR المضخم للوساطة)، و**توزيعك عبر جميع الحسابات** (ليس فقط وسيط واحد)، و**تعرضك للقطاعات**، و**مخاطر العملة**، و**تقدمك نحو هدف محدد**.
بمجرد تعريف التتبع بهذه الطريقة، تفشل معظم الأدوات على الفور.
## كيف يبدو تتبع المحفظة الجيد
يجيب نظام التتبع المناسب على ستة أسئلة يومياً:
1. **ما هو إجمالي صافي ثروتي اليوم؟** — عبر جميع الحسابات، الوسطاء، النقد، العقارات، الكريبتو.
2. **ما هو عائدي الفعلي (XIRR)؟** — مرجح زمنياً، وليس رقم الوسيط المشوه.
3. **هل لدي تركيز مفرط في أي مكان؟** — قطاع، جغرافيا، سهم واحد.
4. **هل أنا على المسار الصحيح لهدفي؟** — سواء كان هذا الهدف هو FIRE، أو منزل، أو تقاعد.
5. **ما هو أكبر عائق للأداء؟** — ليس للبيع المذعور، بل لإعادة التقييم.
6. **هل أحتاج لإعادة التوازن؟** — بناءً على توزيعك المستهدف، وليس العاطفة.
## لماذا تنهار جداول البيانات
جداول البيانات تعمل لمدة 6 أشهر. ثم تضيف وسيطاً ثالثاً، وتنسى التحديث لمدة أسبوع، وتصبح البيانات غير موثوقة. الإدخال اليدوي ليس نظاماً — إنه عادة ستفشل في النهاية.
التجميع التلقائي المرتبط ببيانات السوق الفورية هو النهج المستدام الوحيد للمستثمرين الجادين.
## نهج Wealix
تجمع Wealix كل حساب، وتطبق تسعيراً فورياً، وتحسب XIRR الحقيقي، وتنبه لمخاطر التركيز تلقائياً، وتظهر تقدم FIRE دون أي إدخال يدوي للبيانات بعد الإعداد الأولي. ثم يخبرك مستشار الذكاء الاصطناعي بما يجب فعله تحديداً — ليس نصيحة عامة، بل توصيات بناءً على ممتلكاتك الفعلية.`,
    faq: [
      {
        q: 'What is the best way to track a multi-asset investment portfolio?',
        a: 'Use a platform that aggregates all accounts in one place and calculates true time-weighted returns (XIRR). Manual spreadsheets work short-term but break down as your portfolio grows. Wealix provides automated multi-account aggregation with real-time data.',
        qAr: 'ما هي أفضل طريقة لتتبع محفظة استثمارية متعددة الأصول؟',
        aAr: 'استخدم منصة تجمع جميع الحسابات في مكان واحد وتحسب العوائد الحقيقية المرجحة زمنياً (XIRR). جداول البيانات اليدوية تعمل لفترة قصيرة ولكنها تنهار مع نمو محفظتك. توفر Wealix تجميعاً آلياً للحسابات المتعددة مع بيانات فورية.',
      },
      {
        q: 'How often should I check my investment portfolio?',
        a: 'For long-term investors, weekly is sufficient. Daily checking increases anxiety and impulsive decisions without improving outcomes. Set alerts for significant moves and let automated tools do the daily monitoring for you.',
        qAr: 'كم مرة يجب أن أتحقق من محفظتي الاستثمارية؟',
        aAr: 'للمستثمرين طويلي الأجل، يكفي التحقق أسبوعياً. التحقق اليومي يزيد من القلق والقرارات الاندفاعية دون تحسين النتائج. اضبط تنبيهات للتحركات الكبيرة واترك الأدوات الآلية تقوم بالمراقبة اليومية لك.',
      },
      {
        q: 'What metrics matter most in portfolio tracking?',
        a: 'XIRR (actual return accounting for timing of contributions), sector allocation percentage, geographic exposure, and progress-to-goal are the four most important.',
        qAr: 'ما هي المقاييس الأكثر أهمية في تتبع المحفظة؟',
        aAr: 'معدل XIRR (العائد الفعلي مع مراعاة توقيت المساهمات)، ونسبة توزيع القطاعات، والتعرض الجغرافي، والتقدم نحو الهدف هي الأربعة الأهم.',
      },
    ],
  },
  'fire-number-calculator-mena': {
    title: 'Your FIRE Number Explained — And Why It Is Different in the Gulf',
    titleAr: 'رقم FIRE الخاص بك — ولماذا يختلف في الخليج',
    description:
      'The classic 4% rule was built for US markets. Gulf investors face a different reality. Here is what to use instead.',
    descriptionAr:
      'قاعدة 4٪ الكلاسيكية صُممت للأسواق الأمريكية. مستثمرو الخليج يواجهون واقعاً مختلفاً. إليك ما يجب استخدامه بدلاً من ذلك.',
    date: '2025-03-22',
    readTime: '10 min read',
    readTimeAr: '10 دقائق قراءة',
    tag: 'FIRE',
    tagAr: 'الاستقلال المالي',
    content: `## What Is the FIRE Number?
The FIRE (Financial Independence, Retire Early) number is the portfolio size at which your investment returns sustainably cover your living expenses forever — without working.
The classic formula: **Annual Expenses x 25 = FIRE Number**
This is based on the 4% safe withdrawal rate, derived from the Trinity Study using US market data from 1926 to 1995.
## Why Gulf Investors Need a Different Calculation
Three structural differences make the US-derived 4% rule unreliable for Saudi and Gulf investors:
**1. No income tax** — Your withdrawal rate does not need to cover a 25-37% tax haircut. This actually helps you — your effective withdrawal rate can be slightly higher.
**2. Currency peg stability** — SAR is pegged to USD at 3.75, which removes currency risk for USD-denominated investments. This reduces sequence-of-return risk compared to floating currencies.
**3. Healthcare cost structure** — Government healthcare access and lower private healthcare costs in Saudi Arabia mean the US assumption of high annual healthcare costs in retirement does not apply.
## The MENA-Adjusted FIRE Calculation
For Gulf investors, a 3.5% safe withdrawal rate is more conservative and appropriate — especially for early retirees (retiring before 50) with longer time horizons.
**MENA FIRE Formula:** Annual Expenses (post-tax equivalent) x 28.5 = FIRE Number
Wealix applies this calculation automatically and adjusts for your currency, location, and spending profile.`,
    contentAr: `## ما هو رقم FIRE؟
رقم FIRE (الاستقلال المالي، التقاعد المبكر) هو حجم المحفظة الذي تغطي فيه عوائد استثماراتك نفقات معيشك بشكل مستدام وإلى الأبد — دون الحاجة للعمل.
الصيغة الكلاسيكية: **النفقات السنوية × 25 = رقم FIRE**
## لماذا يحتاج مستثمرو الخليج إلى حساب مختلف
ثلاثة اختلافات هيكلية تجعل قاعدة 4٪ المشتقة من الولايات المتحدة غير موثوقة للمستثمرين في السعودية والخليج:
**1. لا ضرائب دخل** — لا يحتاج معدل سحبك لتغطية خصم ضريبي. هذا يساعدك فعلياً.
**2. استقرار ربط العملة** — الريال السعودي مربوط بالدولار عند 3.75، مما يزيل مخاطر العملة.
**3. هيكل تكلفة الرعاية الصحية** — تكاليف الرعاية الصحية المنخفضة في السعودية تغير المعادلة.
## حساب FIRE المعدل لمنطقة الشرق الأوسط وشمال أفريقيا
لمستثمري الخليج، معدل سحب آمن بنسبة 3.5٪ هو أكثر تحفظاً وملاءمة.
**صيغة FIRE للخليج:** النفقات السنوية × 28.5 = رقم FIRE
تطبق Wealix هذا الحساب تلقائياً وتعدله بناءً على عملتك وموقعك ونمط إنفاقك.`,
    faq: [
      {
        q: 'What is the FIRE number for someone living in Saudi Arabia?',
        a: 'Multiply your annual expenses by 25-28.5 depending on your planned retirement age. Gulf investors benefit from no income tax, which lowers the required withdrawal rate.',
        qAr: 'ما هو رقم FIRE لشخص يعيش في السعودية؟',
        aAr: 'اضرب نفقاتك السنوية في 25-28.5 اعتماداً على سن التقاعد المخطط له. يستفيد مستثمرو الخليج من عدم وجود ضريبة دخل.',
      },
      {
        q: 'Does the 4% rule apply in Saudi Arabia and the Gulf?',
        a: 'The 4% rule was derived from US market data and does not account for Gulf-specific advantages. A modified 3.5-4% rate is appropriate depending on your investment mix.',
        qAr: 'هل تنطبق قاعدة 4٪ في السعودية والخليج؟',
        aAr: 'اشتققت قاعدة 4٪ من بيانات السوق الأمريكية ولا تأخذ في الاعتبار المزايا الخاصة بالخليج.',
      },
      {
        q: 'How do I track my FIRE progress automatically?',
        a: 'Wealix calculates your FIRE number based on your actual spending, investment returns, and target retirement date — updating in real time as your portfolio grows.',
        qAr: 'كيف أتتبع تقدمي نحو FIRE تلقائياً؟',
        aAr: 'تحسب Wealix رقم FIRE الخاص بك بناءً على إنفاقك الفعلي وعوائد استثماراتك وتاريخ التقاعد المستهدف.',
      },
    ],
  },
  'best-investment-apps-saudi-arabia': {
    title: 'Best Investment Tracking Apps in Saudi Arabia (2025 Honest Review)',
    titleAr: 'أفضل تطبيقات تتبع الاستثمار في السعودية (مراجعة صادقة 2025)',
    description:
      'We tested 12 apps available to Saudi investors. Here are the ones actually worth your time.',
    descriptionAr:
      'اختبرنا 12 تطبيقاً متاحاً للمستثمرين السعوديين. إليك التطبيقات التي تستحق وقتك فعلاً.',
    date: '2025-04-25',
    readTime: '12 min read',
    readTimeAr: '12 دقيقة قراءة',
    tag: 'Reviews',
    tagAr: 'المراجعات',
    content: `## The Problem With Most Investment Apps in Saudi Arabia
Most investment apps available to Saudi users are either brokerage apps (showing you only their own assets) or US-centric tools that do not support SAR, Tadawul stocks, or Gulf-specific financial realities.
We evaluated 12 apps across five criteria: multi-account aggregation, Arabic language support, FIRE planning, AI analysis quality, and regional asset coverage.
## What Saudi Investors Actually Need
- **Tadawul (Saudi Stock Exchange) support** — native, not manual entry
- **SAR and multi-currency support** — with real-time exchange rates
- **Islamic finance consideration** — halal screening, sukuk tracking
- **FIRE planning calibrated to Gulf realities** — no income tax, different cost of living
- **Arabic UI** — not translated, natively designed for RTL
## The Honest Verdict
No existing app does all five well. Most do one or two.
Wealix was built specifically to fill this gap — a personal wealth OS designed for MENA investors, with native Arabic support, Gulf-calibrated FIRE planning, AI portfolio analysis, and multi-account aggregation including Tadawul assets.`,
    contentAr: `## المشكلة في معظم تطبيقات الاستثمار في السعودية
معظم تطبيقات الاستثمار المتاحة للمستخدمين السعوديين هي إما تطبيقات وساطة أو أدوات متمحورة حول الولايات المتحدة لا تدعم الريال السعودي أو أسهم تداول.
قيمنا 12 تطبيقاً عبر خمسة معايير: تجميع الحسابات المتعددة، دعم اللغة العربية، تخطيط FIRE، جودة تحليل الذكاء الاصطناعي، وتغطية الأصول الإقليمية.
## ما يحتاجه المستثمرون السعوديون فعلاً
- **دعم تداول** — بشكل أصيل، وليس إدخالاً يدوياً
- **دعم الريال السعودي والعملات المتعددة** — مع أسعار صرف فورية
- **مراعاة التمويل الإسلامي** — فحص الأسهم الحلال، تتبع الصكوك
- **تخطيط FIRE معاير لواقع الخليج**
- **واجهة مستخدم عربية أصيلة**
## الحكم الصادق
لا يوجد تطبيق حالي يقوم بجميع الخمسة بشكل جيد.
تم بناء Wealix خصيصاً لسد هذه الفجوة.`,
    faq: [
      {
        q: 'What is the best investment tracking app in Saudi Arabia?',
        a: 'No single app does everything well for Saudi investors. Wealix is built specifically for MENA investors with native Arabic support, SAR/multi-currency tracking, Tadawul integration, and Gulf-calibrated FIRE planning.',
        qAr: 'ما هو أفضل تطبيق لتتبع الاستثمار في السعودية؟',
        aAr: 'لا يوجد تطبيق واحد يفعل كل شيء بشكل جيد للمستثمرين السعوديين. تم بناء Wealix خصيصاً لمستثمري منطقة الشرق الأوسط وشمال أفريقيا.',
      },
      {
        q: 'Can I track my Tadawul portfolio with an app?',
        a: 'Yes. Wealix supports Tadawul stock tracking alongside international equities, giving you a consolidated view of your entire portfolio in one place.',
        qAr: 'هل يمكنني تتبع محفظة تداول الخاصة بي من خلال تطبيق؟',
        aAr: 'نعم. تدعم Wealix تتبع أسهم تداول جنباً إلى جنب مع الأسهم الدولية.',
      },
      {
        q: 'Are there Arabic investment apps with AI features?',
        a: 'Wealix offers a bilingual (Arabic/English) AI financial advisor that analyzes your portfolio and provides actionable recommendations tailored to Gulf investors.',
        qAr: 'هل هناك تطبيقات استثمار عربية بميزات الذكاء الاصطناعي؟',
        aAr: 'تقدم Wealix مستشاراً مالياً بالذكاء الاصطناعي ثنائي اللغة يحلل محفظتك ويقدم توصيات قابلة للتنفيذ.',
      },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) return { title: 'Not Found' };
  return {
    title: `${article.title} | Wealix Blog`,
    description: article.description,
    alternates: { canonical: `https://wealix.app/blog/${slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `https://wealix.app/blog/${slug}`,
      type: 'article',
      images: [{ url: 'https://wealix.app/og/og-default.png', width: 1200, height: 630 }],
    },
  };
}

export function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) notFound();
  return <BlogSlugClient article={article} slug={slug} />;
}
