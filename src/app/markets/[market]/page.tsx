import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarketPageClient } from './MarketPageClient';

type Props = { params: Promise<{ market: string }> };

export type MarketData = {
  name: string;
  nameAr: string;
  flag: string;
  headline: string;
  headlineAr: string;
  description: string;
  descriptionAr: string;
  features: string[];
  featuresAr: string[];
  faq: { q: string; a: string; qAr: string; aAr: string }[];
};

const marketData: Record<string, MarketData> = {
  'saudi-arabia': {
    name: 'Saudi Arabia',
    nameAr: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    headline: 'Investment Portfolio Tracking for Saudi Investors | Wealix',
    headlineAr: 'تتبع المحفظة الاستثمارية للمستثمرين السعوديين | Wealix',
    description:
      'Wealix is the personal wealth OS built for Saudi investors — with native Arabic support, SAR currency, Tadawul integration, and FIRE planning calibrated to the Kingdom.',
    descriptionAr:
      'Wealix هو نظام تشغيل الثروة الشخصية المصمم للمستثمرين السعوديين — مع دعم اللغة العربية الأصيل، وعملة الريال السعودي، وتكامل تداول، وتخطيط FIRE المعاير للمملكة.',
    features: [
      'Track Tadawul and Nomu stocks in real time',
      'SAR as primary currency with multi-currency support',
      'Native Arabic interface (RTL)',
      'FIRE planning calibrated to Saudi living costs (no income tax model)',
      'AI portfolio analysis with Gulf-aware risk scoring',
      'Net worth tracking including real estate and local funds',
    ],
    featuresAr: [
      'تتبع أسهم تداول ونمو في الوقت الفعلي',
      'الريال السعودي كعملة أساسية مع دعم العملات المتعددة',
      'واجهة عربية أصيلة (RTL)',
      'تخطيط FIRE معاير لتكاليف المعيشة في السعودية (نموذج بدون ضريبة دخل)',
      'تحليل المحفظة بالذكاء الاصطناعي مع تقييم مخاطر مراعٍ للخليج',
      'تتبع صافي الثروة بما في ذلك العقارات والصناديق المحلية',
    ],
    faq: [
      {
        q: 'Is there an investment tracking app for Saudi Arabia in Arabic?',
        a: 'Wealix is built natively in Arabic with full RTL support, SAR currency, and Tadawul stock tracking. It is one of the few personal finance platforms built specifically for Saudi investors.',
        qAr: 'هل يوجد تطبيق لتتبع الاستثمار في السعودية باللغة العربية؟',
        aAr: 'تم بناء Wealix بشكل أصيل باللغة العربية مع دعم كامل لليمين إلى اليسار (RTL)، وعملة الريال السعودي، وتتبع أسهم تداول. إنها واحدة من منصات التمويل الشخصي القليلة المصممة خصيصاً للمستثمرين السعوديين.',
      },
      {
        q: 'Can I track my Tadawul portfolio automatically?',
        a: 'Yes. Wealix connects to Tadawul (Saudi Stock Exchange) data and updates your portfolio positions in real time without manual entry.',
        qAr: 'هل يمكنني تتبع محفظة تداول الخاصة بي تلقائياً؟',
        aAr: 'نعم. يتصل Wealix ببيانات تداول (السوق المالية السعودية) ويحدث مراكز محفظتك في الوقت الفعلي دون إدخال يدوي.',
      },
      {
        q: 'Does Wealix support Islamic finance screening?',
        a: 'Wealix includes halal stock screening flags so Saudi investors can filter their portfolios by Shariah compliance.',
        qAr: 'هل يدعم Wealix فحص التمويل الإسلامي؟',
        aAr: 'يتضمن Wealix أعلام فحص الأسهم الحلال حتى يتمكن المستثمرون السعوديون من تصفية محافظهم حسب الامتثال للشريعة.',
      },
      {
        q: 'How does FIRE planning work for Saudi investors?',
        a: 'Saudi Arabia has no income tax, which significantly changes the FIRE calculation. Wealix applies a Gulf-adjusted safe withdrawal rate and uses SAR-based cost of living to calculate your true FIRE number.',
        qAr: 'كيف يعمل تخطيط FIRE للمستثمرين السعوديين؟',
        aAr: 'لا توجد ضريبة دخل في السعودية، مما يغير حساب FIRE بشكل كبير. يطبق Wealix معدل سحب آمن معدل للخليج ويستخدم تكلفة المعيشة القائمة على الريال لحساب رقم FIRE الحقيقي الخاص بك.',
      },
    ],
  },
  uae: {
    name: 'United Arab Emirates',
    nameAr: 'الإمارات العربية المتحدة',
    flag: '🇦🇪',
    headline: 'Investment Portfolio Tracking for UAE Investors | Wealix',
    headlineAr: 'تتبع المحفظة الاستثمارية للمستثمرين في الإمارات | Wealix',
    description:
      'Wealix tracks DFM, ADX, and international investments for UAE-based investors — with AED support, multi-currency net worth, and AI portfolio analysis.',
    descriptionAr:
      'يتتبع Wealix أسهم سوق دبي وسوق أبوظبي والاستثمارات الدولية للمستثمرين المقيمين في الإمارات — مع دعم الدرهم، وصافي الثروة متعدد العملات، وتحليل المحفظة بالذكاء الاصطناعي.',
    features: [
      'Track DFM and ADX listed stocks',
      'AED and multi-currency support (USD, EUR, GBP)',
      'Net worth tracking across UAE real estate, equities, and crypto',
      'AI-powered portfolio rebalancing suggestions',
      'FIRE planning for UAE expat and national investors',
      'Arabic and English bilingual interface',
    ],
    featuresAr: [
      'تتبع الأسهم المدرجة في سوق دبي وسوق أبوظبي',
      'دعم الدرهم والعملات المتعددة (الدولار، اليورو، الجنيه الإسترليني)',
      'تتبع صافي الثروة عبر العقارات الإماراتية والأسهم والكريبتو',
      'اقتراحات إعادة توازن المحفظة المدعومة بالذكاء الاصطناعي',
      'تخطيط FIRE للمستثمرين الوافدين والمواطنين في الإمارات',
      'واجهة ثنائية اللغة العربية والإنجليزية',
    ],
    faq: [
      {
        q: 'What is the best investment tracking app in the UAE?',
        a: 'Wealix supports UAE investors with DFM/ADX stock tracking, AED currency, multi-currency net worth, and Gulf-calibrated FIRE planning in both Arabic and English.',
        qAr: 'ما هو أفضل تطبيق لتتبع الاستثمار في الإمارات؟',
        aAr: 'يدعم Wealix المستثمرين في الإمارات من خلال تتبع أسهم سوق دبي/سوق أبوظبي، وعملة الدرهم، وصافي الثروة متعدد العملات، وتخطيط FIRE المعاير للخليج باللغتين العربية والإنجليزية.',
      },
      {
        q: 'Can I track DFM and ADX stocks with an app?',
        a: 'Yes. Wealix supports Dubai Financial Market (DFM) and Abu Dhabi Securities Exchange (ADX) stock tracking alongside international equities.',
        qAr: 'هل يمكنني تتبع أسهم سوق دبي وسوق أبوظبي من خلال تطبيق؟',
        aAr: 'نعم. يدعم Wealix تتبع أسهم سوق دبي المالي وسوق أبوظبي للأوراق المالية جنباً إلى جنب مع الأسهم الدولية.',
      },
      {
        q: 'How does Wealix handle UAE expat investment tracking?',
        a: 'UAE expats often hold investments in multiple currencies and countries. Wealix aggregates all accounts with real-time FX conversion, giving a unified view of net worth in AED or any other base currency.',
        qAr: 'كيف يتعامل Wealix مع تتبع استثمارات الوافدين في الإمارات؟',
        aAr: 'غالباً ما يمتلك الوافدون في الإمارات استثمارات بعملات وبلدان متعددة. يجمع Wealix جميع الحسابات مع تحويل العملات في الوقت الفعلي، مما يعطي رؤية موحدة لصافي الثروة بالدرهم أو أي عملة أساسية أخرى.',
      },
    ],
  },
  global: {
    name: 'Global Markets',
    nameAr: 'الأسواق العالمية',
    flag: '🌍',
    headline: 'Global Investment Portfolio Tracker — Stocks, ETFs, Crypto | Wealix',
    headlineAr: 'متتبع المحفظة الاستثمارية العالمية — أسهم، صناديق، كريبتو | Wealix',
    description:
      'Track US equities, international ETFs, crypto, and multi-asset portfolios from anywhere in the world — with AI analysis and real-time net worth.',
    descriptionAr:
      'تتبع الأسهم الأمريكية، وصناديق الاستثمار المتداولة الدولية، والكريبتو، والمحافظ متعددة الأصول من أي مكان في العالم — مع تحليل الذكاء الاصطناعي وصافي الثروة في الوقت الفعلي.',
    features: [
      'US equities, ETFs, and index funds (NYSE, NASDAQ)',
      'International stock markets (LSE, Euronext, TSX)',
      'Cryptocurrency portfolio tracking',
      'Real-time FX for 150+ currencies',
      'AI-powered portfolio analysis and rebalancing',
      'FIRE progress tracking with custom withdrawal rate',
    ],
    featuresAr: [
      'الأسهم الأمريكية، الصناديق المتداولة، وصناديق المؤشرات (NYSE, NASDAQ)',
      'أسواق الأسهم الدولية (لندن، يورونكست، تورونتو)',
      'تتبع محفظة العملات المشفرة',
      'أسعار صرف فورية لأكثر من 150 عملة',
      'تحليل وإعادة توازن المحفظة بالذكاء الاصطناعي',
      'تتبع تقدم FIRE مع معدل سحب مخصص',
    ],
    faq: [
      {
        q: 'Can I track international stocks and ETFs with Wealix?',
        a: 'Yes. Wealix supports equities from NYSE, NASDAQ, LSE, and other major exchanges alongside ETFs, mutual funds, and crypto — all in one consolidated portfolio view.',
        qAr: 'هل يمكنني تتبع الأسهم الدولية وصناديق الاستثمار المتداولة مع Wealix؟',
        aAr: 'نعم. يدعم Wealix الأسهم من NYSE وNASDAQ ولندن والبورصات الرئيسية الأخرى جنباً إلى جنب مع الصناديق المتداولة والصناديق المشتركة والكريبتو — كل ذلك في عرض واحد موحد للمحفظة.',
      },
      {
        q: 'Does Wealix support multi-currency portfolios?',
        a: 'Wealix supports 150+ currencies with real-time exchange rates, allowing investors who hold assets in multiple currencies to see a unified net worth in their preferred base currency.',
        qAr: 'هل يدعم Wealix المحافظ متعددة العملات؟',
        aAr: 'يدعم Wealix أكثر من 150 عملة مع أسعار صرف فورية، مما يسمح للمستثمرين الذين يمتلكون أصولاً بعملات متعددة برؤية صافي ثروة موحد بعملتهم الأساسية المفضلة.',
      },
      {
        q: 'Can I track crypto alongside my stock portfolio?',
        a: 'Yes. Wealix integrates crypto holdings alongside traditional equities, giving you a complete picture of your total investment portfolio.',
        qAr: 'هل يمكنني تتبع الكريبتو جنباً إلى جنب مع محفظة الأسهم الخاصة بي؟',
        aAr: 'نعم. يدمج Wealix ممتلكات الكريبتو جنباً إلى جنب مع الأسهم التقليدية، مما يمنحك صورة كاملة لإجمالي محفظتك الاستثمارية.',
      },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market } = await params;
  const data = marketData[market];
  if (!data) return { title: 'Not Found' };
  return {
    title: data.headline,
    description: data.description,
    alternates: { canonical: `https://wealix.app/markets/${market}` },
    openGraph: {
      title: data.headline,
      description: data.description,
      url: `https://wealix.app/markets/${market}`,
      type: 'website',
      images: [{ url: 'https://wealix.app/og/og-default.png', width: 1200, height: 630 }],
    },
  };
}

export function generateStaticParams() {
  return Object.keys(marketData).map((market) => ({ market }));
}

export default async function MarketPage({ params }: Props) {
  const { market } = await params;
  const data = marketData[market];
  if (!data) notFound();
  return <MarketPageClient data={data} market={market} />;
}
