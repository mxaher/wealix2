import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Wealix vs. Alternatives — Compare Investment Tracking Apps',
  description:
    'See how Wealix compares to other personal finance and investment tracking tools. Honest, feature-by-feature comparisons for MENA investors.',
  alternates: { canonical: 'https://wealix.app/vs' },
};

const comparisons = [
  { slug: 'empower', name: 'Empower (Personal Capital)', desc: 'US-focused wealth tracker' },
  { slug: 'mint', name: 'Mint', desc: 'Budget and expense tracking' },
  { slug: 'wealthica', name: 'Wealthica', desc: 'Multi-account aggregator' },
  { slug: 'spreadsheet', name: 'Excel / Google Sheets', desc: 'Manual portfolio tracking' },
];

export default function VsIndexPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-foreground mb-4">Wealix vs. The Alternatives</h1>
        <p className="text-lg text-muted-foreground mb-10">
          We compared Wealix to every major personal finance tool available to MENA investors. Here
          is the honest breakdown.
        </p>
        <div className="grid gap-4">
          {comparisons.map((c) => (
            <Link
              key={c.slug}
              href={`/vs/${c.slug}`}
              className="flex items-center justify-between border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
            >
              <div>
                <p className="font-semibold text-foreground">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
              <span className="text-primary text-sm font-medium">Compare →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
