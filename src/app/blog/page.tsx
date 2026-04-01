import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — Personal Finance & Investment Insights | Wealix',
  description:
    'Expert guides on portfolio tracking, FIRE planning, net-worth growth, and AI-powered investing for MENA investors. Learn how to take control of your financial future.',
  alternates: { canonical: 'https://wealix.app/blog' },
  openGraph: {
    title: 'Wealix Blog — Personal Finance & Investment Insights',
    description:
      'Expert guides on portfolio tracking, FIRE planning, and AI-powered investing for MENA investors.',
    url: 'https://wealix.app/blog',
    type: 'website',
    images: [{ url: 'https://wealix.app/og/og-default.png', width: 1200, height: 630 }],
  },
};

const posts = [
  {
    slug: 'how-to-track-investment-portfolio',
    title: 'How to Track Your Investment Portfolio in 2025 (The Right Way)',
    description:
      'Most investors check their brokerage app and call it tracking. That is not tracking — that is hoping. Here is how to build a real-time view of every asset you own.',
    date: '2025-03-15',
    readTime: '8 min read',
    tag: 'Portfolio',
  },
  {
    slug: 'fire-number-calculator-mena',
    title: 'Your FIRE Number Explained — And Why It Is Different in the Gulf',
    description:
      'The classic 4% rule was built for US markets. Gulf investors face a different reality: no income tax, different inflation baselines, and SAR/AED pegging. Here is what to use instead.',
    date: '2025-03-22',
    readTime: '10 min read',
    tag: 'FIRE',
  },
  {
    slug: 'ai-financial-advisor-vs-human',
    title: 'AI Financial Advisor vs. Human Advisor — Which One Actually Makes You Richer?',
    description:
      'The honest answer is: it depends on what question you are asking. Humans win on tax strategy and estate planning. AI wins on real-time data, 24/7 availability, and zero emotional bias.',
    date: '2025-04-01',
    readTime: '7 min read',
    tag: 'AI',
  },
  {
    slug: 'net-worth-tracking-guide',
    title: 'Net Worth Tracking — The One Number That Tells You If You Are Actually Getting Wealthier',
    description:
      'Income is vanity, net worth is sanity. Learn how to calculate, track, and grow your net worth using a system that updates automatically every day.',
    date: '2025-04-10',
    readTime: '6 min read',
    tag: 'Net Worth',
  },
  {
    slug: 'portfolio-rebalancing-guide',
    title: 'Portfolio Rebalancing: When to Do It, How Often, and What AI Gets Right',
    description:
      'Rebalancing too often destroys returns through transaction costs. Rebalancing too rarely lets you drift into dangerous concentration. There is a sweet spot, and AI found it.',
    date: '2025-04-18',
    readTime: '9 min read',
    tag: 'Investing',
  },
  {
    slug: 'best-investment-apps-saudi-arabia',
    title: 'Best Investment Tracking Apps in Saudi Arabia (2025 Honest Review)',
    description:
      'We tested 12 apps available to Saudi investors. Most look great and do almost nothing useful. Here are the ones actually worth your time — and why Wealix was built because none were good enough.',
    date: '2025-04-25',
    readTime: '12 min read',
    tag: 'Reviews',
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Wealix Blog
        </h1>
        <p className="text-lg text-muted-foreground mb-12">
          Practical, opinionated guides on personal finance, portfolio management, FIRE planning,
          and AI-powered investing — written for investors in Saudi Arabia and the MENA region.
        </p>

        <div className="grid gap-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {post.tag}
                </span>
                <span className="text-sm text-muted-foreground">{post.date}</span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">{post.readTime}</span>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="text-muted-foreground">{post.description}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline"
              >
                Read article →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
