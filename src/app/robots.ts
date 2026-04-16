// BUG #004 FIX — Exclude authenticated routes from crawling
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app/',
          '/dashboard/',
          '/onboarding/',
          '/settings/',
          '/api/',
          '/sign-in/',
          '/sign-up/',
          '/samples/',
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
