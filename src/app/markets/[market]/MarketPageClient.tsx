'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { MarketData } from '../data';

type Props = {
  data: MarketData;
  market: string;
};

export function MarketPageClient({ data, market }: Props) {
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faq.map((item) => ({
      '@type': 'Question',
      name: isArabic ? item.qAr : item.q,
      acceptedAnswer: { '@type': 'Answer', text: isArabic ? item.aAr : item.a },
    })),
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <section className="max-w-4xl mx-auto px-4 py-20">
        <Link
          href="/markets"
          className="text-sm text-muted-foreground hover:text-primary mb-8 inline-flex items-center gap-2"
        >
          <ArrowLeft className={`h-4 w-4 ${isArabic ? 'rotate-180' : ''}`} />
          {isArabic ? 'العودة لجميع الأسواق' : 'All Markets'}
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{data.flag}</span>
          <h1 className="text-3xl font-bold text-foreground">
            {isArabic ? data.headlineAr.split('|')[0].trim() : data.headline.split('|')[0].trim()}
          </h1>
        </div>
        <p className="text-lg text-muted-foreground mb-10">
          {isArabic ? data.descriptionAr : data.description}
        </p>
        <div className="mb-12 rounded-2xl border border-border bg-card/60 p-6">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {isArabic ? 'كيف نكيّف التجربة لهذا السوق' : 'How We tailor the experience for this market'}
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {isArabic
              ? `هذه الصفحة تشرح كيف يكيّف Wealix تجربة ${data.nameAr} عبر العملة الأساسية، وتغطية السوق المحلي، وربط المحافظ العالمية، ومنطق التخطيط المالي المناسب لهذا السياق. الفكرة ليست عرض شعارات عامة، بل توضيح ما الذي يمكن للمستثمر في هذا السوق تتبعه وتحليله فعلاً داخل المنتج.`
              : `This page explains how Wealix adapts the experience for ${data.name} investors across base currency, local market coverage, global portfolio aggregation, and planning assumptions that fit this context. The goal is not generic positioning, but a clear picture of what an investor in this market can actually track and analyze inside the product.`}
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {isArabic
              ? `ما يدعمه Wealix لمستثمري ${data.nameAr}`
              : `What Wealix Supports for ${data.name} Investors`}
          </h2>
          <ul className="space-y-3">
            {(isArabic ? data.featuresAr : data.features).map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-primary mt-0.5">✓</span>
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
          </h2>
          <div className="space-y-4">
            {data.faq.map((item, i) => (
              <div key={i} className="border border-border rounded-lg p-5">
                <h3 className="font-semibold text-foreground mb-2">
                  {isArabic ? item.qAr : item.q}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {isArabic ? item.aAr : item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-border bg-muted/30 p-6">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {isArabic ? 'ما الذي يجب أن يراجعه المستثمر قبل اختيار أداة التتبع؟' : 'What investors should review before choosing a tracker'}
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {isArabic
              ? 'اختر أداة تدعم عملتك الأساسية، وتغطي البورصات التي تستثمر فيها فعلاً، وتجمع الحسابات المختلفة في رؤية واحدة، وتربط الأداء بالأهداف طويلة المدى مثل الاستقلال المالي أو التقاعد. عندما تغيب هذه العناصر تصبح الأرقام مبعثرة بين الوسطاء وجداول البيانات.'
              : 'Choose a tracker that supports your base currency, covers the exchanges you actually invest in, consolidates accounts into one view, and connects performance to long-term goals like financial independence or retirement. Without those pieces, your numbers stay scattered across brokers and spreadsheets.'}
          </p>
        </section>

        <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <p className="font-semibold text-foreground mb-2">
            {isArabic
              ? `ابدأ بتتبع محفظتك في ${data.nameAr}`
              : `Start tracking your ${data.name} portfolio`}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {isArabic ? 'مجاني للبدء. لا تطلب بطاقة ائتمان.' : 'Free to start. No credit card required.'}
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isArabic ? 'ابدأ مجاناً ←' : 'Start free →'}
          </Link>
        </div>
      </section>
    </main>
  );
}
