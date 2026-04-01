import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ slug: string }> };

const articles: Record<
  string,
  {
    title: string;
    description: string;
    date: string;
    readTime: string;
    tag: string;
    content: string;
    faq: { q: string; a: string }[];
  }
> = {
  'how-to-track-investment-portfolio': {
    title: 'How to Track Your Investment Portfolio in 2025 (The Right Way)',
    description:
      'Most investors check their brokerage app and call it tracking. That is not tracking — that is hoping. Here is how to build a real-time view of every asset you own.',
    date: '2025-03-15',
    readTime: '8 min read',
    tag: 'Portfolio',
    content: `
## The Problem With How Most People Track Investments

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

Wealix consolidates every account, applies real-time pricing, calculates true XIRR, flags concentration risk automatically, and shows FIRE progress without any manual data entry after initial setup. The AI advisor then tells you specifically what to do — not generic advice, but recommendations based on your actual holdings.
    `,
    faq: [
      {
        q: 'What is the best way to track a multi-asset investment portfolio?',
        a: 'Use a platform that aggregates all accounts in one place and calculates true time-weighted returns (XIRR). Manual spreadsheets work short-term but break down as your portfolio grows. Wealix provides automated multi-account aggregation with real-time data.',
      },
      {
        q: 'How often should I check my investment portfolio?',
        a: 'For long-term investors, weekly is sufficient. Daily checking increases anxiety and impulsive decisions without improving outcomes. Set alerts for significant moves (±5% on a position) and let automated tools do the daily monitoring for you.',
      },
      {
        q: 'What metrics matter most in portfolio tracking?',
        a: 'XIRR (actual return accounting for timing of contributions), sector allocation percentage, geographic exposure, and progress-to-goal are the four most important. Raw balance and daily P&L are vanity metrics that distract from long-term thinking.',
      },
    ],
  },
  'fire-number-calculator-mena': {
    title: 'Your FIRE Number Explained — And Why It Is Different in the Gulf',
    description:
      'The classic 4% rule was built for US markets. Gulf investors face a different reality. Here is what to use instead.',
    date: '2025-03-22',
    readTime: '10 min read',
    tag: 'FIRE',
    content: `
## What Is the FIRE Number?

The FIRE (Financial Independence, Retire Early) number is the portfolio size at which your investment returns sustainably cover your living expenses forever — without working.

The classic formula: **Annual Expenses × 25 = FIRE Number**

This is based on the 4% safe withdrawal rate, derived from the Trinity Study using US market data from 1926 to 1995.

## Why Gulf Investors Need a Different Calculation

Three structural differences make the US-derived 4% rule unreliable for Saudi and Gulf investors:

**1. No income tax** — Your withdrawal rate does not need to cover a 25–37% tax haircut. This actually helps you — your effective withdrawal rate can be slightly higher.

**2. Currency peg stability** — SAR is pegged to USD at 3.75, which removes currency risk for USD-denominated investments. This reduces sequence-of-return risk compared to floating currencies.

**3. Healthcare cost structure** — Government healthcare access and lower private healthcare costs in Saudi Arabia mean the US assumption of $15,000–$25,000 annual healthcare in retirement does not apply.

## The MENA-Adjusted FIRE Calculation

For Gulf investors, a 3.5% safe withdrawal rate is more conservative and appropriate — especially for early retirees (retiring before 50) with longer time horizons.

**MENA FIRE Formula:** Annual Expenses (post-tax equivalent) × 28.5 = FIRE Number

Wealix applies this calculation automatically and adjusts for your currency, location, and spending profile.
    `,
    faq: [
      {
        q: 'What is the FIRE number for someone living in Saudi Arabia?',
        a: 'Multiply your annual expenses by 25–28.5 depending on your planned retirement age. Gulf investors benefit from no income tax, which lowers the required withdrawal rate. A Saudi-based investor spending SAR 200,000/year needs a portfolio of SAR 5M–5.7M to retire.',
      },
      {
        q: 'Does the 4% rule apply in Saudi Arabia and the Gulf?',
        a: 'The 4% rule was derived from US market data and does not account for Gulf-specific advantages like no income tax and SAR/USD peg stability. A modified 3.5–4% rate is appropriate depending on your investment mix and retirement horizon.',
      },
      {
        q: 'How do I track my FIRE progress automatically?',
        a: 'Wealix calculates your FIRE number based on your actual spending, investment returns, and target retirement date — updating in real time as your portfolio grows.',
      },
    ],
  },
  'best-investment-apps-saudi-arabia': {
    title: 'Best Investment Tracking Apps in Saudi Arabia (2025 Honest Review)',
    description:
      'We tested 12 apps available to Saudi investors. Here are the ones actually worth your time.',
    date: '2025-04-25',
    readTime: '12 min read',
    tag: 'Reviews',
    content: `
## The Problem With Most Investment Apps in Saudi Arabia

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

Wealix was built specifically to fill this gap — a personal wealth OS designed for MENA investors, with native Arabic support, Gulf-calibrated FIRE planning, AI portfolio analysis, and multi-account aggregation including Tadawul assets.
    `,
    faq: [
      {
        q: 'What is the best investment tracking app in Saudi Arabia?',
        a: 'No single app does everything well for Saudi investors. Wealix is built specifically for MENA investors with native Arabic support, SAR/multi-currency tracking, Tadawul integration, and Gulf-calibrated FIRE planning.',
      },
      {
        q: 'Can I track my Tadawul portfolio with an app?',
        a: 'Yes. Wealix supports Tadawul stock tracking alongside international equities, giving you a consolidated view of your entire portfolio in one place.',
      },
      {
        q: 'Are there Arabic investment apps with AI features?',
        a: 'Wealix offers a bilingual (Arabic/English) AI financial advisor that analyzes your portfolio and provides actionable recommendations tailored to Gulf investors.',
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

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map((item) => ({
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
      <article className="max-w-3xl mx-auto px-4 py-20">
        <Link
          href="/blog"
          className="text-sm text-muted-foreground hover:text-primary mb-8 inline-block"
        >
          ← Back to Blog
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
            {article.tag}
          </span>
          <span className="text-sm text-muted-foreground">{article.date}</span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{article.readTime}</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">{article.title}</h1>
        <p className="text-lg text-muted-foreground mb-10 border-b border-border pb-8">
          {article.description}
        </p>
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br/>') }}
        />

        {/* FAQ Section */}
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {article.faq.map((item, i) => (
              <div key={i} className="border border-border rounded-lg p-5">
                <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                <p className="text-muted-foreground text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <p className="font-semibold text-foreground mb-2">Track your portfolio with Wealix</p>
          <p className="text-sm text-muted-foreground mb-4">
            AI-powered personal finance built for MENA investors. Free to start.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Start free — no credit card
          </Link>
        </div>
      </article>
    </main>
  );
}
