import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

export const expensesMetadata: Metadata = {
  title: 'Expense Tracker with OCR Receipt Scan — Wealix',
  description:
    'Track expenses by category with OCR-powered receipt scanning. Review extracted data before saving. Recurring expense management for Saudi Arabia, UAE & Egypt.',
  keywords: [
    'expense tracker Saudi Arabia',
    'OCR receipt scanner app',
    'تتبع المصروفات',
    'receipt scanner app MENA',
    'spending tracker UAE',
    'مسح الإيصالات',
    'expense management app',
  ],
  alternates: { canonical: `${siteUrl}/expenses` },
  openGraph: {
    title: 'Expense Tracker with OCR Receipt Scan — Wealix',
    description: 'Scan receipts with AI-OCR, review data, and log expenses instantly. Built for MENA.',
    url: `${siteUrl}/expenses`,
    type: 'website',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'Wealix Expense Tracker' }],
  },
};
