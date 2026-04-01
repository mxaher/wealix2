import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';

  const blogSlugs = [
    'how-to-track-investment-portfolio',
    'fire-number-calculator-mena',
    'ai-financial-advisor-vs-human',
    'net-worth-tracking-guide',
    'portfolio-rebalancing-guide',
    'best-investment-apps-saudi-arabia',
  ];

  const competitors = ['empower', 'mint', 'wealthica', 'spreadsheet'];
  const markets = ['saudi-arabia', 'uae', 'global'];

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...blogSlugs.map((slug) => ({
      url: `${siteUrl}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${siteUrl}/vs`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    ...competitors.map((c) => ({
      url: `${siteUrl}/vs/${c}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${siteUrl}/markets`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    ...markets.map((m) => ({
      url: `${siteUrl}/markets/${m}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
