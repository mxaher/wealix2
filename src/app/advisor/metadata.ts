import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const advisorMetadata: Metadata = {
  title: 'AI Financial Advisor for MENA Investors — Wealix',
  description:
    'Get AI-powered financial guidance tailored to your portfolio, FIRE goals, and cash flow. Turn your financial data into actionable decisions. Not a licensed advisor — for planning and analysis only.',
  keywords: [
    'AI financial advisor Saudi Arabia',
    'AI wealth advisor MENA',
    'مستشار مالي ذكي',
    'AI portfolio advisor',
    'financial planning AI app',
    'wealth advisor app MENA',
    'AI investment advisor Saudi',
  ],
  alternates: {
    canonical: `${siteUrl}/advisor`,
  },
  openGraph: {
    title: 'AI Financial Advisor for MENA Investors — Wealix',
    description:
      'AI-powered financial guidance based on your actual data. Portfolio analysis, FIRE readiness, savings optimization — all in one chat.',
    url: `${siteUrl}/advisor`,
    type: 'website',
    images: [{ url: '/og/og-advisor.png', width: 1200, height: 630, alt: 'Wealix AI Financial Advisor' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Financial Advisor for MENA Investors — Wealix',
    description: 'Turn your numbers into decisions with AI-powered financial guidance.',
    images: ['/og/og-advisor.png'],
  },
};
