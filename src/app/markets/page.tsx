import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Markets — Investment Tracking by Region | Wealix',
  description:
    'Wealix supports investors across MENA and global markets. Find the right investment tracking setup for your market — Saudi Arabia, UAE, Egypt, and beyond.',
  alternates: { canonical: 'https://wealix.app/markets' },
};

const markets = [
  {
    slug: 'saudi-arabia',
    name: 'Saudi Arabia',
    description: 'Tadawul, nomu, local funds, and international investments from the Kingdom.',
    flag: '🇸🇦',
  },
  {
    slug: 'uae',
    name: 'United Arab Emirates',
    description: 'DFM, ADX, and multi-currency wealth management for UAE-based investors.',
    flag: '🇦🇪',
  },
  {
    slug: 'global',
    name: 'Global Investors',
    description: 'US equities, ETFs, crypto, and multi-asset portfolios tracked from anywhere.',
    flag: '🌍',
  },
];

export default function MarketsPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-foreground mb-4">Markets We Support</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Wealix is built for investors across the MENA region and globally. Find your market to
          see how we support it.
        </p>
        <div className="grid gap-4">
          {markets.map((m) => (
            <Link
              key={m.slug}
              href={`/markets/${m.slug}`}
              className="flex items-start gap-4 border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
            >
              <span className="text-3xl">{m.flag}</span>
              <div>
                <p className="font-semibold text-foreground">{m.name}</p>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
