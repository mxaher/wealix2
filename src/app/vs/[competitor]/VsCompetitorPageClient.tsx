'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { MarketingNav } from '@/components/landing/MarketingNav';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Feature = {
  label: string;
  labelAr: string;
  wealix: boolean | string;
  them: boolean | string;
};

type FaqItem = {
  q: string;
  qAr: string;
  a: string;
  aAr: string;
};

type CompetitorData = {
  name: string;
  tagline: string;
  taglineAr: string;
  description: string;
  descriptionAr: string;
  features: Feature[];
  verdict: string;
  verdictAr: string;
  faq: FaqItem[];
};

// ---------------------------------------------------------------------------
// Bilingual competitor data
// ---------------------------------------------------------------------------
const competitors: Record<string, CompetitorData> = {
  empower: {
    name: 'Empower (Personal Capital)',
    tagline: 'Wealix vs. Empower — Which Is Better for International Investors?',
    taglineAr: 'Wealix مقابل Empower — أيهما أفضل للمستثمرين الدوليين؟',
    description:
      'Empower (formerly Personal Capital) is a strong US wealth management tool. But if you invest outside the US market, it has a fundamental problem: it was not built for you.',
    descriptionAr:
      'Empower (المعروف سابقاً بـ Personal Capital) أداة قوية لإدارة الثروات مصممة للسوق الأمريكية. لكن إن كنت تستثمر خارج الولايات المتحدة، فهي تفتقر إلى دعم اللغات والعملات المحلية.',
    features: [
      { label: 'Arabic Language Support', labelAr: 'دعم اللغة العربية', wealix: true, them: false },
      { label: 'SAR / AED Currency', labelAr: 'دعم عملة الريال / الدرهم', wealix: true, them: false },
      { label: 'Tadawul Stock Tracking', labelAr: 'تتبع أسهم تداول', wealix: true, them: false },
      { label: 'FIRE Planning', labelAr: 'تخطيط FIRE', wealix: true, them: true },
      { label: 'AI Portfolio Analysis', labelAr: 'تحليل المحفظة بالذكاء الاصطناعي', wealix: true, them: false },
      { label: 'Net Worth Tracking', labelAr: 'تتبع صافي الثروة', wealix: true, them: true },
      { label: 'Gulf-Calibrated Calculations', labelAr: 'حسابات معاير للخليج', wealix: true, them: false },
      { label: 'Free Tier Available', labelAr: 'خطة مجانية متاحة', wealix: true, them: true },
    ],
    verdict:
      'Empower is excellent for US-based investors. For international investors, it is a square peg in a round hole. No Arabic, no regional currencies, no local market integrations — it fundamentally cannot serve investors outside the US. Wealix was built from scratch for investors around the world.',
    verdictAr:
      'Empower ممتاز للمستثمرين في الولايات المتحدة. أما للمستثمرين الدوليين، فهو غير مناسب؛ لا دعم لغات متعددة، ولا عملات إقليمية، ولا تكامل مع الأسواق المحلية. بُني Wealix من الصفر ليخدم المستثمرين في جميع أنحاء العالم.',
    faq: [
      {
        q: 'Is Empower Personal Capital available for international investors?',
        qAr: 'هل Empower Personal Capital متاح للمستثمرين الدوليين؟',
        a: 'Empower is technically accessible but not designed for users outside the US. It lacks Arabic language support, regional currency handling, and local market integrations.',
        aAr: 'Empower متاح تقنياً ولكنه غير مصمم للمستثمرين خارج الولايات المتحدة. يفتقر إلى دعم اللغة العربية، ومعالجة العملات المحلية، والتكامل مع الأسواق الإقليمية.',
      },
      {
        q: 'What is the best Empower alternative for international investors?',
        qAr: 'ما هو أفضل بديل لـ Empower للمستثمرين الدوليين؟',
        a: 'Wealix is built specifically for international investors with native Arabic support, multi-currency handling, regional market tracking, and Gulf-calibrated FIRE planning.',
        aAr: 'Wealix مبني خصيصاً للمستثمرين الدوليين مع دعم اللغة العربية الأصيل، ومعالجة متعددة العملات، وتتبع الأسواق الإقليمية، وتخطيط FIRE المعاير للخليج.',
      },
    ],
  },
  mint: {
    name: 'Mint',
    tagline: 'Wealix vs. Mint — A Fairer Tool for International Personal Finance',
    taglineAr: 'Wealix مقابل Mint — الأداة الأنسب للمستثمرين الدوليين',
    description:
      'Mint was a good budgeting app — until Intuit shut it down in 2024. But even when it was alive, it was a US-only product that never supported international users properly.',
    descriptionAr:
      'كان Mint تطبيق ميزانية جيداً — حتى أوقفه Intuit في 2024. لكن حتى عندما كان نشطاً، كان منتجاً مخصصاً للولايات المتحدة ولم يدعم المستخدمين الدوليين بشكل صحيح.',
    features: [
      { label: 'Currently Active', labelAr: 'النظام نشط حالياً', wealix: true, them: false },
      { label: 'Arabic Language Support', labelAr: 'دعم اللغة العربية', wealix: true, them: false },
      { label: 'Investment Portfolio Tracking', labelAr: 'تتبع المحفظة الاستثمارية', wealix: true, them: '⚠️ Basic only' },
      { label: 'AI Financial Advisor', labelAr: 'مستشار مالي ذكي', wealix: true, them: false },
      { label: 'FIRE Planning', labelAr: 'تخطيط FIRE', wealix: true, them: false },
      { label: 'Multi-Currency Support', labelAr: 'دعم العملات المتعددة', wealix: true, them: false },
    ],
    verdict:
      'Mint no longer exists. If you were a Mint user looking for an alternative that actually works for international investors, Wealix is the answer — built with investment tracking and AI analysis that Mint never had.',
    verdictAr:
      'Mint لم يعد موجوداً. إن كنت مستخدماً سابقاً لـ Mint تبحث عن بديل يعمل فعلاً للمستثمرين الدوليين، Wealix هو الإجابة — مبني مع تتبع الاستثمارات وتحليل الذكاء الاصطناعي الذي لم يوفره Mint أبداً.',
    faq: [
      {
        q: 'What replaced Mint for international users?',
        qAr: 'ما الذي حلّ محل Mint للمستخدمين الدوليين؟',
        a: 'Mint was shut down in January 2024. For international users, Wealix is the best replacement — with investment tracking, FIRE planning, and AI analysis that Mint never offered.',
        aAr: 'أغلق Mint في يناير 2024. للمستخدمين الدوليين، Wealix هو أفضل بديل — مع تتبع الاستثمارات وتخطيط FIRE وتحليل الذكاء الاصطناعي الذي لم يوفره Mint أبداً.',
      },
      {
        q: 'Is there a Mint alternative that supports Arabic?',
        qAr: 'هل يوجد بديل لـ Mint يدعم اللغة العربية؟',
        a: 'Wealix is the closest equivalent for Arabic-speaking users, with Arabic support, multi-currency handling, budget tracking, and investment portfolio management in one platform.',
        aAr: 'Wealix هو أقرب بديل للمستخدمين الناطقين بالعربية، مع دعم اللغة العربية وتعدد العملات وتتبع الميزانية وإدارة المحفظة الاستثمارية في منصة واحدة.',
      },
    ],
  },
  wealthica: {
    name: 'Wealthica',
    tagline: 'Wealix vs. Wealthica — Global-First vs. Canada-First',
    taglineAr: 'Wealix مقابل Wealthica — عالمي أولاً مقابل كندي أولاً',
    description:
      'Wealthica is a solid Canadian portfolio aggregator with good multi-broker support. But "global" for Wealthica means Canadian and US brokers. International markets beyond North America are an afterthought.',
    descriptionAr:
      'Wealthica مجمّع محافظ كندي متين مع دعم جيد لتعدد الوسطاء. لكن "العالمية" في Wealthica تعني الوسطاء الكنديين والأمريكيين. الأسواق الدولية خارج أمريكا الشمالية تبقى ثانوية.',
    features: [
      { label: 'Arabic Language Support', labelAr: 'دعم اللغة العربية', wealix: true, them: false },
      { label: 'Regional Market Integration', labelAr: 'تكامل مع الأسواق الإقليمية', wealix: true, them: false },
      { label: 'AI Portfolio Analysis', labelAr: 'تحليل المحفظة بالذكاء الاصطناعي', wealix: true, them: false },
      { label: 'FIRE Planning', labelAr: 'تخطيط FIRE', wealix: true, them: '⚠️ Plugin only' },
      { label: 'Multi-Account Aggregation', labelAr: 'تجميع الحسابات المتعددة', wealix: true, them: true },
      { label: 'Free Core Features', labelAr: 'ميزات أساسية مجانية', wealix: true, them: false },
    ],
    verdict:
      'Wealthica works well if you invest through Canadian or US brokers. If your investments are in regional markets or local brokers outside North America, it simply cannot connect. Wealix was built to fill exactly this gap.',
    verdictAr:
      'Wealthica يعمل بشكل جيد إذا كنت تستثمر عبر وسطاء كنديين أو أمريكيين. أما إذا كانت استثماراتك في أسواق إقليمية أو وسطاء محليين خارج أمريكا الشمالية، فهو لا يستطيع الاتصال بها. Wealix بُني لسد هذا الفراغ بالضبط.',
    faq: [
      {
        q: 'Does Wealthica work for investors outside North America?',
        qAr: 'هل Wealthica يعمل للمستثمرين خارج أمريكا الشمالية؟',
        a: 'Wealthica has limited support for brokers outside Canada and the US. For investors in regional markets, Wealix provides native integration with local brokers and exchanges.',
        aAr: 'دعم Wealthica للوسطاء خارج كندا والولايات المتحدة محدود. للمستثمرين في الأسواق الإقليمية، يوفر Wealix تكاملاً أصلياً مع الوسطاء المحليين والبورصات الإقليمية.',
      },
    ],
  },
  spreadsheet: {
    name: 'Excel / Google Sheets',
    tagline: 'Wealix vs. Spreadsheets — Why Your Excel Portfolio Tracker Will Eventually Fail',
    taglineAr: 'Wealix مقابل جداول البيانات — لماذا ستفشل محفظة Excel في نهاية المطاف',
    description:
      'Spreadsheets are how most serious investors start. They give you control, flexibility, and a false sense of accuracy. The problem is not the spreadsheet — it is what happens after 12 months.',
    descriptionAr:
      'جداول البيانات هي كيف يبدأ معظم المستثمرين الجادين. توفر التحكم والمرونة وإحساساً زائفاً بالدقة. المشكلة ليست في جدول البيانات — بل فيما يحدث بعد 12 شهراً.',
    features: [
      { label: 'Automatic Price Updates', labelAr: 'تحديث تلقائي للأسعار', wealix: true, them: false },
      { label: 'Multi-Account Aggregation', labelAr: 'تجميع الحسابات المتعددة', wealix: true, them: '⚠️ Manual' },
      { label: 'AI Portfolio Analysis', labelAr: 'تحليل المحفظة بالذكاء الاصطناعي', wealix: true, them: false },
      { label: 'FIRE Progress Tracking', labelAr: 'تتبع تقدم FIRE', wealix: true, them: '⚠️ Build yourself' },
      { label: 'Mobile Access', labelAr: 'الوصول من الجوال', wealix: true, them: '⚠️ Limited' },
      { label: 'Alerts & Notifications', labelAr: 'التنبيهات والإشعارات', wealix: true, them: false },
      { label: 'Error-Free Data', labelAr: 'بيانات دقيقة بلا أخطاء', wealix: true, them: false },
    ],
    verdict:
      'Spreadsheets are the best tool for investors who enjoy building them. For everyone else, they are a time sink that gets abandoned. Wealix gives you the control of a spreadsheet with the automation of a platform built by engineers who also invest.',
    verdictAr:
      'جداول البيانات هي أفضل أداة للمستثمرين الذين يستمتعون ببنائها. لغيرهم، هي مضيعة للوقت تُهجر في نهاية المطاف. Wealix يمنحك تحكم جدول البيانات مع أتمتة منصة بناها مهندسون يستثمرون هم أيضاً.',
    faq: [
      {
        q: 'Why should I replace my investment spreadsheet?',
        qAr: 'لماذا يجب أن أستبدل جدول بيانات الاستثمار الخاص بي؟',
        a: 'Spreadsheets require manual price updates, break when brokers change formats, and have no mobile push alerts. Wealix automates everything while giving you the same level of control over your data.',
        aAr: 'تتطلب جداول البيانات تحديثات يدوية للأسعار، وتنهار عندما يغير الوسطاء صيغهم، وتفتقر إلى تنبيهات الجوال. Wealix يؤتمت كل شيء مع منحك نفس مستوى التحكم في بياناتك.',
      },
      {
        q: 'Can I import my existing spreadsheet data into Wealix?',
        qAr: 'هل يمكنني استيراد بيانات جداول البيانات الموجودة إلى Wealix؟',
        a: 'Yes. Wealix supports CSV import for historical transactions and positions, so you can migrate your spreadsheet history without losing data.',
        aAr: 'نعم. Wealix يدعم استيراد CSV للمعاملات والمراكز التاريخية، حتى تتمكن من نقل سجل جداول البيانات الخاص بك دون فقدان البيانات.',
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type Props = { competitor: string };

export function VsCompetitorPageClient({ competitor }: Props) {
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';
  const data = competitors[competitor];

  if (!data) return null;

  return (
    <>
      <MarketingNav />
      <main className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className="max-w-4xl mx-auto px-4 pt-28 pb-20">
        <Link href="/vs" className="text-sm text-muted-foreground hover:text-primary mb-8 inline-block">
          {isArabic ? 'كل المقارنات ←' : '← All Comparisons'}
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          {isArabic ? data.taglineAr : data.tagline}
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          {isArabic ? data.descriptionAr : data.description}
        </p>

        {/* Feature Comparison Table */}
        <div className="overflow-x-auto mb-12">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className={`py-3 px-4 text-muted-foreground font-medium text-sm ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'الميزة' : 'Feature'}
                </th>
                <th className="text-center py-3 px-4 text-primary font-semibold text-sm">Wealix</th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium text-sm">{data.name}</th>
              </tr>
            </thead>
            <tbody>
              {data.features.map((f, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className={`py-3 px-4 text-sm text-foreground ${isArabic ? 'text-right' : 'text-left'}`}>
                    {isArabic ? f.labelAr : f.label}
                  </td>
                  <td className="py-3 px-4 text-center text-sm">
                    {f.wealix === true ? '✅' : f.wealix === false ? '❌' : f.wealix}
                  </td>
                  <td className="py-3 px-4 text-center text-sm">
                    {f.them === true ? '✅' : f.them === false ? '❌' : f.them}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Verdict */}
        <div className="bg-muted/30 border border-border rounded-xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {isArabic ? 'الحكم النهائي' : 'The Verdict'}
          </h2>
          <p className="text-muted-foreground">{isArabic ? data.verdictAr : data.verdict}</p>
        </div>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
          </h2>
          <div className="space-y-4">
            {data.faq.map((item, i) => (
              <div key={i} className="border border-border rounded-lg p-5">
                <h3 className="font-semibold text-foreground mb-2">
                  {isArabic ? item.qAr : item.q}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {isArabic ? item.aAr : item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <p className="font-semibold text-foreground mb-2">
            {isArabic ? 'جرّب Wealix مجاناً اليوم' : 'Try Wealix free today'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {isArabic
              ? 'لا بطاقة ائتمانية مطلوبة. أعدّ إعداد محفظتك في أقل من 5 دقائق.'
              : 'No credit card required. Set up your portfolio in under 5 minutes.'}
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isArabic ? 'ابدأ مجاناً ←' : 'Start free →'}
          </Link>
        </div>
      </section>
    </main>
    </>
  );
}
