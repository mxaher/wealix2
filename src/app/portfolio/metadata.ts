import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const portfolioMetadata: Metadata = {
  title: 'AI Portfolio Tracker for TASI, EGX & NASDAQ — Wealix',
  description:
    'Track and analyze your investment portfolio across Saudi Tadawul (TASI), Egyptian Exchange (EGX), NASDAQ & NYSE. Get AI-powered Buy/Hold/Sell recommendations. Free 14-day trial.',
  keywords: [
    'portfolio tracker Saudi Arabia',
    'TASI investment tracker',
    'EGX portfolio analysis',
    'Saudi stock tracker',
    'AI portfolio analysis MENA',
    'تتبع المحفظة تداول',
    'تحليل محفظة الأسهم',
    'portfolio diversification tool',
    'investment tracker MENA',
    'Tadawul portfolio app',
  ],
  alternates: {
    canonical: `${siteUrl}/portfolio`,
  },
  openGraph: {
    title: 'AI Portfolio Tracker for TASI, EGX & NASDAQ — Wealix',
    description:
      'Import holdings, review asset allocation, and get AI-guided Buy/Hold/Sell decisions for your MENA and global investments.',
    url: `${siteUrl}/portfolio`,
    type: 'website',
    images: [{ url: '/og/og-portfolio.png', width: 1200, height: 630, alt: 'Wealix Portfolio Intelligence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Portfolio Tracker for TASI, EGX & NASDAQ — Wealix',
    description: 'AI-powered portfolio analysis across Saudi, Egyptian & US markets.',
    images: ['/og/og-portfolio.png'],
  },
};
