import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const incomeMetadata: Metadata = {
  title: 'Income Tracker — Salary, Freelance & Dividend Management | Wealix',
  description:
    'Track all income streams: salary, freelance, dividends, and passive income. Manage recurring income and analyze monthly trends. Built for Saudi Arabia, UAE & MENA.',
  keywords: [
    'income tracker app',
    'تتبع الدخل',
    'salary tracker Saudi',
    'dividend income tracker',
    'freelance income management',
    'passive income tracker MENA',
  ],
  alternates: { canonical: `${siteUrl}/income` },
  openGraph: {
    title: 'Income Tracker — Salary, Freelance & Dividends | Wealix',
    description: 'Track all income streams in one place. Salary, dividends, freelance — Saudi Arabia & MENA.',
    url: `${siteUrl}/income`,
    type: 'website',
    images: [{ url: '/og/og-default.png', width: 1200, height: 630, alt: 'Wealix Income Tracker' }],
  },
};
