import type { Metadata } from 'next';
import { MarketsPageClient } from './MarketsPageClient';
import { markets } from './data';

export const metadata: Metadata = {
  title: 'Markets We Support | Wealix',
  description:
    'Wealix supports investors worldwide. Track portfolios across regional and international markets — including Saudi Arabia, UAE, US equities, ETFs, and more.',
  alternates: { canonical: 'https://wealix.app/markets' },
};

export default function MarketsPage() {
  return <MarketsPageClient markets={markets} />;
}
