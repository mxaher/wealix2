import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const netWorthMetadata: Metadata = {
  title: 'Net Worth Tracker for MENA — Track Assets, Investments & Liabilities | Wealix',
  description:
    'Calculate and track your total net worth including real estate, investments, savings, and liabilities. Automatic updates from TASI & NASDAQ prices. Built for Saudi Arabia, UAE & Egypt.',
  keywords: [
    'net worth tracker Saudi Arabia',
    'net worth calculator MENA',
    'حاسبة صافي الثروة',
    'تتبع صافي الثروة',
    'wealth tracker app',
    'personal finance Saudi',
    'asset tracker UAE',
    'net worth app MENA',
  ],
  alternates: {
    canonical: `${siteUrl}/net-worth`,
  },
  openGraph: {
    title: 'Net Worth Tracker for MENA — Wealix',
    description:
      'Track your total wealth: investments, real estate, savings, and liabilities in one unified dashboard. Auto-updated with live market prices.',
    url: `${siteUrl}/net-worth`,
    type: 'website',
    images: [{ url: '/og/og-networth.png', width: 1200, height: 630, alt: 'Wealix Net Worth Tracker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Net Worth Tracker for MENA — Wealix',
    description: 'Your complete wealth picture — assets, investments & liabilities in one place.',
    images: ['/og/og-networth.png'],
  },
};
