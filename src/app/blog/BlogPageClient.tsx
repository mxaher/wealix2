'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { posts as PostsType } from './page';

type Post = (typeof PostsType)[number];

type Props = {
  posts: Post[];
};

export function BlogPageClient({ posts }: Props) {
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';

  return (
    <main className="min-h-screen bg-background">
      <section className="max-w-4xl mx-auto px-4 py-20">
        <Link
          href="/app"
          className="text-sm text-muted-foreground hover:text-primary mb-8 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {isArabic ? 'العودة إلى الرئيسية' : 'Back to Home'}
        </Link>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          {isArabic ? 'مدونة Wealix' : 'Wealix Blog'}
        </h1>
        <p className="text-lg text-muted-foreground mb-12">
          {isArabic
            ? 'أدلة عملية وموضوعية حول التمويل الشخصي وإدارة المحفظة وتخطيط FIRE والاستثمار بالذكاء الاصطناعي — مكتوبة للمستثمرين في السعودية ومنطقة الشرق الأوسط وشمال أفريقيا.'
            : 'Practical, opinionated guides on personal finance, portfolio management, FIRE planning, and AI-powered investing — written for investors in Saudi Arabia and the MENA region.'}
        </p>
        <div className="grid gap-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {isArabic ? post.tagAr : post.tag}
                </span>
                <span className="text-sm text-muted-foreground">{post.date}</span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">{isArabic ? post.readTimeAr : post.readTime}</span>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {isArabic ? post.titleAr : post.title}
                </Link>
              </h2>
              <p className="text-muted-foreground">{isArabic ? post.descriptionAr : post.description}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline"
              >
                {isArabic ? 'اقرأ المقال ←' : 'Read article →'}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
