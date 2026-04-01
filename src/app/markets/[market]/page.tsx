import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ market: string }> };

type MarketData = {
  name: string;
  flag: string;
  headline: string;
  description: string;
  features: string[];
  faq: { q: string; a: string }[];
};

const marketData: Record<string, MarketData> = {
  'saudi-arabia': {
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    headline: 'Investment Portfolio Tracking for Saudi Investors | Wealix',
    description:
      'Wealix is the personal wealth OS built for Saudi investors — with native Arabic support, SAR currency, Tadawul integration, and FIRE planning calibrated to the Kingdom.',
    features: [
      'Track Tadawul and Nomu stocks in real time',
      'SAR as primary currency with multi-currency support',
      'Native Arabic interface (RTL)',
      'FIRE planning calibrated to Saudi living costs (no income tax model)',
      'AI portfolio analysis with Gulf-aware risk scoring',
      'Net worth tracking including real estate and local funds',
    ],
    faq: [
      {
        q: 'Is there an investment tracking app for Saudi Arabia in Arabic?',
        a: 'Wealix is built natively in Arabic with full RTL support, SAR currency, and Tadawul stock tracking. It is one of the few personal finance platforms built specifically for Saudi investors.',
      },
      {
        q: 'Can I track my Tadawul portfolio automatically?',
        a: 'Yes. Wealix connects to Tadawul (Saudi Stock Exchange) data and updates your portfolio positions in real time without manual entry.',
      },
      {
        q: 'Does Wealix support Islamic finance screening?',
        a: 'Wealix includes halal stock screening flags so Saudi investors can filter their portfolios by Shariah compliance.',
      },
      {
        q: 'How does FIRE planning work for Saudi investors?',
        a: 'Saudi Arabia has no income tax, which significantly changes the FIRE calculation. Wealix applies a Gulf-adjusted safe withdrawal rate and uses SAR-based cost of living to calculate your true FIRE number.',
      },
    ],
  },
  uae: {
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    headline: 'Investment Portfolio Tracking for UAE Investors | Wealix',
    description:
      'Wealix tracks DFM, ADX, and international investments for UAE-based investors — with AED support, multi-currency net worth, and AI portfolio analysis.',
    features: [
      'Track DFM and ADX listed stocks',
      'AED and multi-currency support (USD, EUR, GBP)',
      'Net worth tracking across UAE real estate, equities, and crypto',
      'AI-powered portfolio rebalancing suggestions',
      'FIRE planning for UAE expat and national investors',
      'Arabic and English bilingual interface',
    ],
    faq: [
      {
        q: 'What is the best investment tracking app in the UAE?',
        a: 'Wealix supports UAE investors with DFM/ADX stock tracking, AED currency, multi-currency net worth, and Gulf-calibrated FIRE planning in both Arabic and English.',
      },
      {
        q: 'Can I track DFM and ADX stocks with an app?',
        a: 'Yes. Wealix supports Dubai Financial Market (DFM) and Abu Dhabi Securities Exchange (ADX) stock tracking alongside international equities.',
      },
      {
        q: 'How does Wealix handle UAE expat investment tracking?',
        a: 'UAE expats often hold investments in multiple currencies and countries. Wealix aggregates all accounts with real-time FX conversion, giving a unified view of net worth in AED or any other base currency.',
      },
    ],
  },
  global: {
    name: 'Global Markets',
    flag: '🌍',
    headline: 'Global Investment Portfolio Tracker — Stocks, ETFs, Crypto | Wealix',
    description:
      'Track US equities, international ETFs, crypto, and multi-asset portfolios from anywhere in the world — with AI analysis and real-time net worth.',
    features: [
      'US equities, ETFs, and index funds (NYSE, NASDAQ)',
      'International stock markets (LSE, Euronext, TSX)',
      'Cryptocurrency portfolio tracking',
      'Real-time FX for 150+ currencies',
      'AI-powered portfolio analysis and rebalancing',
      'FIRE progress tracking with custom withdrawal rate',
    ],
    faq: [
      {
        q: 'Can I track international stocks and ETFs with Wealix?',
        a: 'Yes. Wealix supports equities from NYSE, NASDAQ, LSE, and other major exchanges alongside ETFs, mutual funds, and crypto — all in one consolidated portfolio view.',
      },
      {
        q: 'Does Wealix support multi-currency portfolios?',
        a: 'Wealix supports 150+ currencies with real-time exchange rates, allowing investors who hold assets in multiple currencies to see a unified net worth in their preferred base currency.',
      },
      {
        q: 'Can I track crypto alongside my stock portfolio?',
        a: 'Yes. Wealix integrates crypto holdings alongside traditional equities, giving you a complete picture of your total investment portfolio.',
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

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <section className="max-w-4xl mx-auto px-4 py-20">
        <Link
          href="/markets"
          className="text-sm text-muted-foreground hover:text-primary mb-8 inline-block"
        >
          ← All Markets
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{data.flag}</span>
          <h1 className="text-3xl font-bold text-foreground">{data.headline.split('|')[0].trim()}</h1>
        </div>
        <p className="text-lg text-muted-foreground mb-10">{data.description}</p>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            What Wealix Supports for {data.name} Investors
          </h2>
          <ul className="space-y-3">
            {data.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-primary mt-0.5">✓</span>
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {data.faq.map((item, i) => (
              <div key={i} className="border border-border rounded-lg p-5">
                <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                <p className="text-muted-foreground text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <p className="font-semibold text-foreground mb-2">Start tracking your {data.name} portfolio</p>
          <p className="text-sm text-muted-foreground mb-4">Free to start. No credit card required.</p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Start free →
          </Link>
        </div>
      </section>
    </main>
  );
}
