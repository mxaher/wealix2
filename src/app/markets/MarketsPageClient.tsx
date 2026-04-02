'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { markets as MarketsType } from './page';

type Market = (typeof MarketsType)[number];

type Props = {
  markets: Market[];
};

export function MarketsPageClient({ markets }: Props) {
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';

  return (
    <main className="min-h-screen bg-background">
      <section className="max-w-3xl mx-auto px-4 py-20">
        <Link
          href="/app"
          className="text-sm text-muted-foreground hover:text-primary mb-8 inline-flex items-center gap-2"
        >
          <ArrowLeft className={`h-4 w-4 ${isArabic ? 'rotate-180' : ''}`} />
          {isArabic ? 'العودة إلى الرئيسية' : 'Back to Home'}
        </Link>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          {isArabic ? 'الأسواق التي ندعمها' : 'Markets We Support'}
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          {isArabic
            ? 'تم بناء Wealix للمستثمرين في جميع أنحاء منطقة الشرق الأوسط وشمال أفريقيا والعالم. ابحث عن سوقك لترى كيف ندعمه.'
            : 'Wealix is built for investors across the MENA region and globally. Find your market to see how we support it.'}
        </p>
        <div className="grid gap-4">
          {markets.map((m) => (
            <Link
              key={m.slug}
              href={`/markets/${m.slug}`}
              className="flex items-start gap-4 border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
            >
              <span className="text-3xl">{m.flag}</span>
              <div>
                <p className="font-semibold text-foreground">{isArabic ? m.nameAr : m.name}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? m.descriptionAr : m.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
