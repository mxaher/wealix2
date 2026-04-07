import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const reportsMetadata: Metadata = {
  title: 'Financial Reports & Analytics Dashboard — Wealix',
  description:
    'Detailed financial reports: income vs expense trends, savings rate, investment performance, and net worth history. Export-ready for Saudi, UAE & Egyptian investors.',
  keywords: [
    'financial reports app',
    'wealth analytics dashboard',
    'investment performance report',
    'تقارير مالية',
    'savings rate tracker',
    'personal finance analytics',
  ],
  alternates: { canonical: `${siteUrl}/reports` },
  openGraph: {
    title: 'Financial Reports & Analytics — Wealix',
    description: 'Detailed wealth analytics: income trends, savings rate, and investment performance.',
    url: `${siteUrl}/reports`,
    type: 'website',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'Wealix Financial Reports' }],
  },
};
