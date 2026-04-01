import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const retirementMetadata: Metadata = {
  title: 'Retirement Planning Calculator for Saudi Arabia & MENA — Wealix',
  description:
    'Plan your retirement with inflation-adjusted projections and compound interest models. Calculate monthly savings needed for your retirement goal. For Saudi residents, expats & MENA investors.',
  keywords: [
    'retirement planning Saudi Arabia',
    'retirement calculator MENA',
    'retirement planning expat Saudi',
    'تخطيط التقاعد السعودية',
    'pension calculator UAE',
    'compound interest retirement',
    'retirement savings MENA',
  ],
  alternates: {
    canonical: `${siteUrl}/retirement`,
  },
  openGraph: {
    title: 'Retirement Planning Calculator for Saudi Arabia — Wealix',
    description:
      'Inflation-adjusted retirement projections with compound growth models. Know exactly how much to save monthly to retire on your terms.',
    url: `${siteUrl}/retirement`,
    type: 'website',
    images: [{ url: '/og/og-retirement.png', width: 1200, height: 630, alt: 'Wealix Retirement Planner' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Retirement Planning Calculator for Saudi Arabia — Wealix',
    description: 'Know exactly how much to save monthly to retire on your terms.',
    images: ['/og/og-retirement.png'],
  },
};
