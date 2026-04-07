import type { Metadata } from 'next';
import { VsIndexPageClient } from './VsIndexPageClient';

export const metadata: Metadata = {
  title: 'Compare Wealix to Alternatives',
  description:
    'See how Wealix compares to other personal finance and investment tracking tools. Honest, feature-by-feature comparisons for investors worldwide.',
  alternates: { canonical: 'https://wealix.app/vs' },
};

export default function VsIndexPage() {
  return <VsIndexPageClient />;
}
