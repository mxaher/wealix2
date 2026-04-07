import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogSlugClient } from './BlogSlugClient';
import { articles } from '../data';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) return { title: 'Not Found' };

  const seoTitles: Record<string, string> = {
    'how-to-track-investment-portfolio': 'How to Track Your Investment Portfolio in 2025',
    'fire-number-calculator-mena': 'Your FIRE Number for Gulf Investors',
    'ai-financial-advisor-vs-human': 'AI Financial Advisor vs Human Advisor',
    'net-worth-tracking-guide': 'Net Worth Tracking Guide for Real Progress',
    'portfolio-rebalancing-guide': 'Portfolio Rebalancing Guide for Long-Term Investors',
    'best-investment-apps-saudi-arabia': 'Best Investment Tracking Apps in Saudi Arabia',
  };

  return {
    title: `${seoTitles[slug] ?? article.title} | Wealix Blog`,
    description: article.description,
    alternates: { canonical: `https://wealix.app/blog/${slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `https://wealix.app/blog/${slug}`,
      type: 'article',
      images: [{ url: 'https://wealix.app/og-default.svg', width: 1200, height: 630 }],
    },
  };
}

export function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) notFound();
  return <BlogSlugClient article={article} slug={slug} />;
}
