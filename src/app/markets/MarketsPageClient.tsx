'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { MarketingNav } from '@/components/landing/MarketingNav';
import type { MarketSummary } from './data';

type Props = {
  markets: MarketSummary[];
};

export function MarketsPageClient({ markets }: Props) {
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';

  return (
    <>
      <MarketingNav />
      <main className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <Link
          href="/"
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
            ? 'Wealix مبني للمستثمرين في جميع أنحاء العالم — من الأسواق الإقليمية إلى البورصات الدولية الكبرى. اختر سوقك لترى كيف ندعمه.'
            : 'Wealix is built for investors worldwide — from regional exchanges to major international markets. Find your market to see how we support it.'}
        </p>
        <div className="mb-10 rounded-2xl border border-border bg-card/60 p-6">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {isArabic ? 'لماذا أنشأنا هذه الصفحات' : 'Why these pages exist'}
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {isArabic
              ? 'لكل سوق احتياجات مختلفة: العملات، البورصات المحلية، الضرائب، وهيكل تكلفة المعيشة. توضح الصفحات التالية كيف يتعامل Wealix مع هذه الاختلافات حتى لا تعتمد على أداة صُممت لسوق واحد فقط.'
              : 'Every market has different needs around currencies, local exchanges, taxes, and cost-of-living assumptions. The pages below explain how Wealix handles those differences so you are not forced into a tool designed for only one market.'}
          </p>
        </div>
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
    </>
  );
}
