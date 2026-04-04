'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { MarketingNav } from '@/components/landing/MarketingNav';

const comparisons = [
  {
    slug: 'empower',
    name: 'Empower (Personal Capital)',
    nameAr: 'Empower (Personal Capital)',
    desc: 'US-focused wealth tracker',
    descAr: 'أداة تتبع ثروة أمريكية',
  },
  {
    slug: 'mint',
    name: 'Mint',
    nameAr: 'Mint',
    desc: 'Budget and expense tracking',
    descAr: 'تتبع الميزانية والمصروفات',
  },
  {
    slug: 'wealthica',
    name: 'Wealthica',
    nameAr: 'Wealthica',
    desc: 'Multi-account aggregator',
    descAr: 'مجمّع حسابات متعدد',
  },
  {
    slug: 'spreadsheet',
    name: 'Excel / Google Sheets',
    nameAr: 'Excel / Google Sheets',
    desc: 'Manual portfolio tracking',
    descAr: 'تتبع المحفظة يدوياً',
  },
];

export function VsIndexPageClient() {
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';

  return (
    <>
      <MarketingNav />
      <main className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          {isArabic ? 'Wealix مقابل البدائل' : 'Wealix vs. The Alternatives'}
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          {isArabic
            ? 'قارنّا Wealix بكل أداة مالية شخصية رئيسية متاحة للمستثمرين حول العالم. إليك التقييم الصادق.'
            : 'We compared Wealix to every major personal finance tool available to investors worldwide. Here is the honest breakdown.'}
        </p>
        <div className="grid gap-4">
          {comparisons.map((c) => (
            <Link
              key={c.slug}
              href={`/vs/${c.slug}`}
              className="flex items-center justify-between border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
            >
              <div>
                <p className="font-semibold text-foreground">{isArabic ? c.nameAr : c.name}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? c.descAr : c.desc}</p>
              </div>
              <span className="text-primary text-sm font-medium shrink-0">
                {isArabic ? 'قارن ←' : 'Compare →'}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
    </>
  );
}
