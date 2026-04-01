import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const budgetMetadata: Metadata = {
  title: 'Smart Budget Tracker for Saudi Arabia & MENA — Wealix',
  description:
    'Create and manage monthly budgets by category. Track spending against limits with visual progress bars and over-budget alerts. Designed for SAR, EGP & AED users.',
  keywords: [
    'budget tracker Saudi Arabia',
    'budgeting app MENA',
    'تتبع الميزانية',
    'تطبيق الميزانية السعودية',
    'monthly budget app',
    'personal budget Saudi',
    'spending tracker UAE',
  ],
  alternates: { canonical: `${siteUrl}/budget` },
  openGraph: {
    title: 'Smart Budget Tracker for Saudi Arabia — Wealix',
    description: 'Category-based monthly budgets with visual progress and alerts. Built for SAR, EGP & AED.',
    url: `${siteUrl}/budget`,
    type: 'website',
    images: [{ url: '/og/og-default.png', width: 1200, height: 630, alt: 'Wealix Budget Tracker' }],
  },
};
