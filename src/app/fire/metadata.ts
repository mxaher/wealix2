import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const fireMetadata: Metadata = {
  title: 'FIRE Calculator for Saudi Arabia, UAE & Egypt — Track Your Financial Independence',
  description:
    'Calculate your FIRE number using the 4% rule. Track Financial Independence progress across TASI, EGX & NASDAQ. Built for MENA investors. Free 14-day trial on Wealix.',
  keywords: [
    'FIRE calculator Saudi Arabia',
    'financial independence MENA',
    'FIRE number calculator',
    'retire early Saudi Arabia',
    'FIRE planning UAE',
    'حاسبة الاستقلال المالي السعودية',
    'تخطيط التقاعد المبكر',
    'retirement planning Saudi',
    '4% rule MENA',
    'FIRE tracker app',
  ],
  alternates: {
    canonical: `${siteUrl}/fire`,
  },
  openGraph: {
    title: 'FIRE Calculator for Saudi Arabia — Wealix',
    description:
      'Calculate your Financial Independence number. Track FIRE progress across TASI, EGX & US markets. Plan your early retirement with AI-powered projections.',
    url: `${siteUrl}/fire`,
    type: 'website',
    images: [{ url: '/og/og-fire.png', width: 1200, height: 630, alt: 'Wealix FIRE Tracker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FIRE Calculator for Saudi Arabia — Wealix',
    description: 'Track Financial Independence progress across TASI, EGX & US markets.',
    images: ['/og/og-fire.png'],
  },
};
