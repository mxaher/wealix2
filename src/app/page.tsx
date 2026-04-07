/**
 * src/app/page.tsx  —  Server Component wrapper (SSR-safe)
 *
 * WHY THIS FILE EXISTS:
 * The original page.tsx was 100% 'use client', meaning Googlebot received
 * an empty HTML shell and had to execute JS before seeing any content.
 * This file is a Server Component that renders all static content server-side,
 * then hands off only the interactive pieces to <LandingPageClient>.
 *
 * SEO IMPACT:
 * - H1, feature descriptions, FAQ text, pricing copy → all in static HTML
 * - Google can index without JS execution
 * - LCP improves because critical text is in the initial HTML response
 */

import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/LandingPageClient';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const metadata: Metadata = {
  title: 'Wealix | AI-Powered Investment Platform for MENA Investors',
  description:
    'Wealix is a bilingual AI-powered investment platform for investors across MENA. Analyze portfolios, ask investment questions, and evaluate buy, hold, or sell decisions with clear decision support.',
  alternates: {
    canonical: siteUrl,
  },
};

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Wealix',
  url: siteUrl,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description:
    'Wealix is a bilingual personal wealth operating system for MENA investors with portfolio tracking, FIRE planning, budgeting, and AI-guided financial analysis.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Start with a 14-day free trial on Core or Pro.',
  },
  inLanguage: ['en', 'ar'],
  featureList: [
    'Investment portfolio tracking',
    'Net worth tracking',
    'FIRE planning',
    'Retirement planning',
    'Budgeting and expense tracking',
    'AI portfolio analysis',
  ],
  image: `${siteUrl}/og-default.svg`,
};

// FAQPage schema — injected at page level so it's specific to the homepage
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What does the AI Advisor do?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It lets investors ask portfolio and investment questions in natural language and returns context-aware explanations about allocations, risks, opportunities, and portfolio fit.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does portfolio analysis work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Wealix reads your holdings and surfaces allocation, diversification, concentration risk, sector mix, performance tracking, and gains or losses breakdowns so you can review the portfolio from multiple angles.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I decide whether to buy or sell?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can evaluate buy, hold, and sell scenarios inside the app, but the product is framed as decision support. It helps assess exposure, valuation, signals, and fit rather than providing regulated financial advice.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does the app support MENA markets?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The platform is built for investors across MENA and is designed to support regional markets first while remaining ready for broader global coverage.',
      },
    },
    {
      '@type': 'Question',
      name: 'Will more markets be added?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The product direction is to expand market coverage over time so investors can keep using the same workflow as new exchanges and regions are introduced.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is this financial advice?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Wealix provides analytics, portfolio context, and decision-support tools. It does not provide regulated investment advice, hold assets, or execute trades.',
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />

      {/* FAQPage schema — server-rendered, immediately visible to Googlebot */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/*
        Static SEO anchor — all critical text is in this <main> tag.
        Googlebot reads this before executing any JavaScript.
        The client component hydrates over this for interactivity.
      */}
      <div id="seo-anchor" className="sr-only" aria-hidden="true">
        <h1>Wealix is an AI-powered investment platform for MENA investors</h1>
        <p>
          Wealix helps investors across MENA analyze portfolios, ask investment questions in
          natural language, and evaluate buy, hold, or sell decisions with bilingual decision
          support.
        </p>
        <section aria-label="Features">
          <h2>Global positioning with regional relevance</h2>
          <ul>
            <li>Built for investors across MENA with expansion into additional markets over time.</li>
            <li>AI Advisor that answers investment questions in natural language with portfolio context.</li>
            <li>Portfolio analysis for allocation, diversification, concentration risk, and gains or losses breakdown.</li>
            <li>Decision-support workflows for evaluating buy, hold, and sell scenarios.</li>
            <li>Arabic and English product experience designed for RTL and LTR reading patterns.</li>
            <li>Secure signed-in workspaces for personal portfolio monitoring and analysis.</li>
          </ul>
        </section>
        <section aria-label="FAQ">
          <h2>Frequently asked questions</h2>
          <p>
            Learn what the AI Advisor does, how portfolio analysis works, whether more MENA and
            global markets will be added, and how Wealix frames decision support versus financial
            advice.
          </p>
        </section>
        <section aria-label="Blog and Resources">
          <nav>
            <a href="/blog">Financial Insights Blog</a>
            <a href="/vs/mint">Wealix vs Mint</a>
            <a href="/vs/empower">Wealix vs Empower</a>
            <a href="/markets">Regional market coverage</a>
            <a href="/contact">Contact Wealix</a>
          </nav>
        </section>
      </div>

      {/* Interactive landing page — client-side hydration */}
      <LandingPageClient />
    </>
  );
}
