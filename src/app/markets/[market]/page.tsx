import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarketPageClient } from './MarketPageClient';
import { marketData } from '../data';

type Props = { params: Promise<{ market: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market } = await params;
  const data = marketData[market];
  if (!data) return { title: 'Not Found' };
  const seoTitles: Record<string, string> = {
    global: 'Global Portfolio Tracker | Wealix',
    'saudi-arabia': 'Portfolio Tracking for Saudi Investors | Wealix',
    uae: 'Portfolio Tracking for UAE Investors | Wealix',
  };
  return {
    title: seoTitles[market] ?? data.headline,
    description: data.description,
    alternates: { canonical: `https://wealix.app/markets/${market}` },
    openGraph: {
      title: data.headline,
      description: data.description,
      url: `https://wealix.app/markets/${market}`,
      type: 'website',
      images: [{ url: 'https://wealix.app/og-default.svg', width: 1200, height: 630 }],
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
