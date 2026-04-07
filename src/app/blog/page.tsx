import type { Metadata } from 'next';
import { BlogPageClient } from './BlogPageClient';
import { posts } from './data';

export const metadata: Metadata = {
  title: 'Wealix Blog | Personal Finance and Investing',
  description:
    'Expert guides on portfolio tracking, FIRE planning, net-worth growth, and AI-powered investing for MENA investors. Learn how to take control of your financial future.',
  alternates: { canonical: 'https://wealix.app/blog' },
  openGraph: {
    title: 'Wealix Blog | Personal Finance and Investing',
    description:
      'Expert guides on portfolio tracking, FIRE planning, and AI-powered investing for MENA investors.',
    url: 'https://wealix.app/blog',
    type: 'website',
    images: [{ url: 'https://wealix.app/og-default.svg', width: 1200, height: 630 }],
  },
};

export default function BlogPage() {
  return <BlogPageClient posts={posts} />;
}
