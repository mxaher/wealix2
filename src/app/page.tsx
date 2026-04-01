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
  alternates: {
    canonical: siteUrl,
  },
};

// FAQPage schema — injected at page level so it's specific to the homepage
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What do I get in the 14-day trial?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'After you choose Core or Pro, the 14-day trial unlocks the standard app experience for that plan. AI features and reports stay locked until payment is completed.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Wealix a licensed bank, broker, or financial advisor?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Wealix is a personal wealth management and analysis platform, not a SAMA-licensed bank, brokerage, or regulated investment advisory firm. It does not hold custody of assets or execute trades for you.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is my data stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Signed-in workspace data is persisted in Cloudflare D1, and some supporting processors such as AI, OCR, email, and monitoring vendors may handle limited data outside Saudi Arabia depending on the feature you use.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the AI Advisor use my financial data?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'When you use AI features, Wealix sends only the financial context needed for that request to the active AI processors. The Privacy Policy explains processing and retention in more detail.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do live market prices work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Saudi holdings are refreshed through SAHMK. EGX and US coverage can be expanded through additional market providers. The portfolio page always labels the active source and whether data is live, delayed, or demo.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I review OCR results before they become expenses?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Receipt OCR is review-first. The extracted merchant, amount, date, category, and raw text are shown for confirmation and editing before anything is saved into your expenses.',
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <>
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
        <h1>Master your wealth with intelligent insights — Wealix AI Wealth OS</h1>
        <p>
          Wealix combines budgeting, investing, FIRE planning, OCR-powered expense capture,
          and AI analysis into one calm operating system for personal wealth.
        </p>
        <section aria-label="Features">
          <h2>Everything you need in one place</h2>
          <ul>
            <li>Financial Command Center — Track income, expenses, assets, liabilities, and net worth from one clear operating layer.</li>
            <li>Portfolio Intelligence — Import holdings, review allocation, and get AI-guided decisions for hold, trim, add, or diversify.</li>
            <li>Receipt Capture &amp; OCR — Scan or upload receipts, review extracted fields, then approve corrected data into expenses.</li>
            <li>FIRE Planning — Model financial independence progress and connect day-to-day budgeting with long-term freedom.</li>
            <li>AI Wealth Advisor — Turn your current numbers into practical guidance, summaries, and next-best actions.</li>
            <li>Secure User Accounts — Each signed-in user gets an isolated workspace with clean live data and a safe demo experience for guests.</li>
          </ul>
        </section>
        <section aria-label="Pricing">
          <h2>Choose your plan, then start a 14-day trial</h2>
          <p>Core plan from $10/month. Pro plan from $15/month. Annual billing saves up to 20%.</p>
        </section>
        <section aria-label="Blog and Resources">
          <nav>
            <a href="/blog">Financial Insights Blog</a>
            <a href="/vs/mint">Wealix vs Mint</a>
            <a href="/vs/personal-capital">Wealix vs Personal Capital</a>
            <a href="/markets/saudi-arabia">Saudi Arabia Market Insights</a>
            <a href="/markets/egypt">Egypt Market Insights</a>
          </nav>
        </section>
      </div>

      {/* Interactive landing page — client-side hydration */}
      <LandingPageClient />
    </>
  );
}
