import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ competitor: string }> };

type CompetitorData = {
  name: string;
  tagline: string;
  description: string;
  features: { label: string; wealix: boolean | string; them: boolean | string }[];
  verdict: string;
  faq: { q: string; a: string }[];
};

const competitors: Record<string, CompetitorData> = {
  empower: {
    name: 'Empower (Personal Capital)',
    tagline: 'Wealix vs. Empower — Which Is Better for MENA Investors?',
    description:
      'Empower (formerly Personal Capital) is a strong US wealth management tool. But if you invest in Saudi Arabia, the UAE, or anywhere in MENA, it has a fundamental problem: it was not built for you.',
    features: [
      { label: 'Arabic Language Support', wealix: true, them: false },
      { label: 'SAR / AED Currency', wealix: true, them: false },
      { label: 'Tadawul Stock Tracking', wealix: true, them: false },
      { label: 'FIRE Planning', wealix: true, them: true },
      { label: 'AI Portfolio Analysis', wealix: true, them: false },
      { label: 'Net Worth Tracking', wealix: true, them: true },
      { label: 'Gulf-Calibrated Calculations', wealix: true, them: false },
      { label: 'Free Tier Available', wealix: true, them: true },
    ],
    verdict:
      'Empower is excellent for US-based investors. For MENA investors, it is a square peg in a round hole. No Arabic, no SAR, no Tadawul — it fundamentally cannot serve the region. Wealix was built from scratch for Gulf investors.',
    faq: [
      {
        q: 'Is Empower Personal Capital available in Saudi Arabia?',
        a: 'Empower is technically accessible but not designed for MENA users. It lacks Arabic language support, SAR currency handling, Tadawul integration, and Gulf-specific financial calculations.',
      },
      {
        q: 'What is the best Empower alternative for MENA investors?',
        a: 'Wealix is built specifically for the MENA region with native Arabic support, SAR/AED currency, Tadawul tracking, and Gulf-calibrated FIRE planning.',
      },
    ],
  },
  mint: {
    name: 'Mint',
    tagline: 'Wealix vs. Mint — A Fairer Tool for MENA Personal Finance',
    description:
      'Mint was a good budgeting app — until Intuit shut it down in 2024. But even when it was alive, it was a US-only product that never supported international users properly.',
    features: [
      { label: 'Currently Active', wealix: true, them: false },
      { label: 'Arabic Language Support', wealix: true, them: false },
      { label: 'Investment Portfolio Tracking', wealix: true, them: '⚠️ Basic only' },
      { label: 'AI Financial Advisor', wealix: true, them: false },
      { label: 'FIRE Planning', wealix: true, them: false },
      { label: 'Multi-Currency Support', wealix: true, them: false },
    ],
    verdict:
      'Mint no longer exists. If you were a Mint user looking for an alternative that actually works for MENA, Wealix is the answer — built for the region, with investment tracking and AI analysis that Mint never had.',
    faq: [
      {
        q: 'What replaced Mint for international users?',
        a: 'Mint was shut down in January 2024. For MENA users, Wealix is the best replacement — with investment tracking, FIRE planning, and AI analysis that Mint never offered.',
      },
      {
        q: 'Is there a Mint alternative for Saudi Arabia?',
        a: 'Wealix is the closest equivalent for Saudi users, with Arabic support, SAR currency, budget tracking, and investment portfolio management in one platform.',
      },
    ],
  },
  wealthica: {
    name: 'Wealthica',
    tagline: 'Wealix vs. Wealthica — MENA-First vs. Canada-First',
    description:
      'Wealthica is a solid Canadian portfolio aggregator with good multi-broker support. But "global" for Wealthica means Canadian and US brokers. MENA is an afterthought.',
    features: [
      { label: 'Arabic Language Support', wealix: true, them: false },
      { label: 'MENA Broker Integration', wealix: true, them: false },
      { label: 'AI Portfolio Analysis', wealix: true, them: false },
      { label: 'FIRE Planning', wealix: true, them: '⚠️ Plugin only' },
      { label: 'Multi-Account Aggregation', wealix: true, them: true },
      { label: 'Free Core Features', wealix: true, them: false },
    ],
    verdict:
      'Wealthica works well if you invest through Canadian or US brokers. If your investments are in Tadawul, regional funds, or GCC brokers, it simply cannot connect. Wealix was built for this exact gap.',
    faq: [
      {
        q: 'Does Wealthica work in Saudi Arabia?',
        a: 'Wealthica has limited MENA broker support. For Saudi investors, Wealix provides native integration with Gulf-based brokers and Tadawul.',
      },
    ],
  },
  spreadsheet: {
    name: 'Excel / Google Sheets',
    tagline: 'Wealix vs. Spreadsheets — Why Your Excel Portfolio Tracker Will Eventually Fail',
    description:
      'Spreadsheets are how most serious investors start. They give you control, flexibility, and a false sense of accuracy. The problem is not the spreadsheet — it is what happens after 12 months.',
    features: [
      { label: 'Automatic Price Updates', wealix: true, them: false },
      { label: 'Multi-Account Aggregation', wealix: true, them: '⚠️ Manual' },
      { label: 'AI Portfolio Analysis', wealix: true, them: false },
      { label: 'FIRE Progress Tracking', wealix: true, them: '⚠️ Build yourself' },
      { label: 'Mobile Access', wealix: true, them: '⚠️ Limited' },
      { label: 'Alerts & Notifications', wealix: true, them: false },
      { label: 'Error-Free Data', wealix: true, them: false },
    ],
    verdict:
      'Spreadsheets are the best tool for investors who enjoy building them. For everyone else, they are a time sink that gets abandoned. Wealix gives you the control of a spreadsheet with the automation of a platform built by engineers who also invest.',
    faq: [
      {
        q: 'Why should I replace my investment spreadsheet?',
        a: 'Spreadsheets require manual price updates, break when brokers change formats, and have no mobile push alerts. Wealix automates everything while giving you the same level of control over your data.',
      },
      {
        q: 'Can I import my existing spreadsheet data into Wealix?',
        a: 'Yes. Wealix supports CSV import for historical transactions and positions, so you can migrate your spreadsheet history without losing data.',
      },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competitor } = await params;
  const data = competitors[competitor];
  if (!data) return { title: 'Not Found' };
  return {
    title: `${data.tagline} | Wealix`,
    description: data.description,
    alternates: { canonical: `https://wealix.app/vs/${competitor}` },
    openGraph: {
      title: data.tagline,
      description: data.description,
      url: `https://wealix.app/vs/${competitor}`,
      type: 'website',
      images: [{ url: 'https://wealix.app/og/og-default.png', width: 1200, height: 630 }],
    },
  };
}

export function generateStaticParams() {
  return Object.keys(competitors).map((competitor) => ({ competitor }));
}

export default async function VsPage({ params }: Props) {
  const { competitor } = await params;
  const data = competitors[competitor];
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
        <Link href="/vs" className="text-sm text-muted-foreground hover:text-primary mb-8 inline-block">
          ← All Comparisons
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-4">{data.tagline}</h1>
        <p className="text-lg text-muted-foreground mb-10">{data.description}</p>

        {/* Feature Comparison Table */}
        <div className="overflow-x-auto mb-12">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Feature</th>
                <th className="text-center py-3 px-4 text-primary font-semibold text-sm">Wealix</th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium text-sm">{data.name}</th>
              </tr>
            </thead>
            <tbody>
              {data.features.map((f, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm text-foreground">{f.label}</td>
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

        <div className="bg-muted/30 border border-border rounded-xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-foreground mb-2">The Verdict</h2>
          <p className="text-muted-foreground">{data.verdict}</p>
        </div>

        {/* FAQ */}
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
          <p className="font-semibold text-foreground mb-2">Try Wealix free today</p>
          <p className="text-sm text-muted-foreground mb-4">
            No credit card required. Set up your portfolio in under 5 minutes.
          </p>
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
