'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import type { Article } from './page';

type Props = {
  article: Article;
  slug: string;
};

export function BlogSlugClient({ article }: Props) {
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map((item) => ({
      '@type': 'Question',
      name: isArabic ? item.qAr : item.q,
      acceptedAnswer: { '@type': 'Answer', text: isArabic ? item.aAr : item.a },
    })),
  };

  const rawContent = isArabic ? article.contentAr : article.content;
  const htmlContent = rawContent.replace(/\n/g, '<br/>');

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <article className="max-w-3xl mx-auto px-4 py-20">
        <Link
          href="/blog"
          className="text-sm text-muted-foreground hover:text-primary mb-8 inline-block"
        >
          {isArabic ? '← العودة إلى المدونة' : '← Back to Blog'}
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
            {isArabic ? article.tagAr : article.tag}
          </span>
          <span className="text-sm text-muted-foreground">{article.date}</span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{isArabic ? article.readTimeAr : article.readTime}</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          {isArabic ? article.titleAr : article.title}
        </h1>
        <p className="text-lg text-muted-foreground mb-10 border-b border-border pb-8">
          {isArabic ? article.descriptionAr : article.description}
        </p>
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        <section className="mt-16 border-t border-border pt-10">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
          </h2>
          <div className="space-y-6">
            {article.faq.map((item, i) => (
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

        <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <p className="font-semibold text-foreground mb-2">
            {isArabic ? 'تتبع محفظتك مع Wealix' : 'Track your portfolio with Wealix'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {isArabic
              ? 'تمويل شخصي مدعوم بالذكاء الاصطناعي لمستثمري الشرق الأوسط وشمال أفريقيا. ابدأ مجاناً.'
              : 'AI-powered personal finance built for MENA investors. Free to start.'}
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isArabic ? 'ابدأ مجاناً — لا تطلب بطاقة ائتمان' : 'Start free — no credit card'}
          </Link>
        </div>
      </article>
    </main>
  );
}
