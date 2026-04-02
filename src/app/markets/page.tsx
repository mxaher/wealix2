import type { Metadata } from 'next';
import { MarketsPageClient } from './MarketsPageClient';

export const metadata: Metadata = {
  title: 'Markets — Investment Tracking by Region | Wealix',
  description:
    'Wealix supports investors across MENA and global markets. Find the right investment tracking setup for your market — Saudi Arabia, UAE, Egypt, and beyond.',
  alternates: { canonical: 'https://wealix.app/markets' },
};

export const markets = [
  {
    slug: 'saudi-arabia',
    name: 'Saudi Arabia',
    nameAr: 'المملكة العربية السعودية',
    description: 'Tadawul, nomu, local funds, and international investments from the Kingdom.',
    descriptionAr: 'تداول، نمو، الصناديق المحلية، والاستثمارات الدولية من المملكة.',
    flag: '🇸🇦',
  },
  {
    slug: 'uae',
    name: 'United Arab Emirates',
    nameAr: 'الإمارات العربية المتحدة',
    description: 'DFM, ADX, and multi-currency wealth management for UAE-based investors.',
    descriptionAr: 'سوق دبي المالي، سوق أبوظبي للأوراق المالية، وإدارة الثروات متعددة العملات للمستثمرين في الإمارات.',
    flag: '🇦🇪',
  },
  {
    slug: 'global',
    name: 'Global Investors',
    nameAr: 'المستثمرون العالميون',
    description: 'US equities, ETFs, crypto, and multi-asset portfolios tracked from anywhere.',
    descriptionAr: 'الأسهم الأمريكية، صناديق الاستثمار المتداولة، الكريبتو، والمحافظ متعددة الأصول المتبعة من أي مكان.',
    flag: '🌍',
  },
];

export default function MarketsPage() {
  return <MarketsPageClient markets={markets} />;
}
