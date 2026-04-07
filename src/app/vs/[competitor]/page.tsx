import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VsCompetitorPageClient } from './VsCompetitorPageClient';

type Props = { params: Promise<{ competitor: string }> };

// Metadata-only data (English, for SEO)
const metaData: Record<string, { name: string; tagline: string; description: string }> = {
  empower: {
    name: 'Empower (Personal Capital)',
    tagline: 'Wealix vs. Empower — Which Is Better for International Investors?',
    description:
      'Empower (formerly Personal Capital) is a strong US wealth tool. But if you invest outside the US, it has a fundamental problem: it was not built for you.',
  },
  mint: {
    name: 'Mint',
    tagline: 'Wealix vs. Mint — A Fairer Tool for International Personal Finance',
    description:
      'Mint was a good budgeting app — until Intuit shut it down in 2024. It was a US-only product that never supported international users properly.',
  },
  wealthica: {
    name: 'Wealthica',
    tagline: 'Wealix vs. Wealthica — Global-First vs. Canada-First',
    description:
      'Wealthica is a solid Canadian portfolio aggregator. But "global" for Wealthica means Canadian and US brokers. International markets beyond North America are an afterthought.',
  },
  spreadsheet: {
    name: 'Excel / Google Sheets',
    tagline: 'Wealix vs. Spreadsheets — Why Your Excel Portfolio Tracker Will Eventually Fail',
    description:
      'Spreadsheets are how most serious investors start. The problem is not the spreadsheet — it is what happens after 12 months.',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competitor } = await params;
  const data = metaData[competitor];
  if (!data) return { title: 'Not Found' };
  const seoTitles: Record<string, string> = {
    empower: 'Wealix vs Empower | Better for Global Investors?',
    mint: 'Wealix vs Mint | Best Mint Alternative',
    wealthica: 'Wealix vs Wealthica | Global vs Canada-First',
    spreadsheet: 'Wealix vs Spreadsheets | Portfolio Tracking Compared',
  };
  return {
    title: seoTitles[competitor] ?? `${data.tagline} | Wealix`,
    description: data.description,
    alternates: { canonical: `https://wealix.app/vs/${competitor}` },
    openGraph: {
      title: data.tagline,
      description: data.description,
      url: `https://wealix.app/vs/${competitor}`,
      type: 'website',
      images: [{ url: 'https://wealix.app/og-default.svg', width: 1200, height: 630 }],
    },
  };
}

export function generateStaticParams() {
  return Object.keys(metaData).map((competitor) => ({ competitor }));
}

export default async function VsPage({ params }: Props) {
  const { competitor } = await params;
  if (!metaData[competitor]) notFound();
  return <VsCompetitorPageClient competitor={competitor} />;
}
