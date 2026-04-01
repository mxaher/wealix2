import type { NextConfig } from "next";
import path from "path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Production-only Clerk domains
const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval'
    https://*.clerk.com
    https://clerk.wealix.app
    https://accounts.wealix.app
    https://challenges.cloudflare.com
    https://www.googletagmanager.com
    https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https: https://www.google-analytics.com;
  font-src 'self' data: https://clerk.wealix.app https://accounts.wealix.app;
  connect-src 'self'
    https://*.clerk.com
    https://api.clerk.com
    https://clerk.wealix.app
    https://accounts.wealix.app
    https://*.wealix.app
    https://challenges.cloudflare.com
    https://www.datalab.to
    https://app.sahmk.sa
    https://api.twelvedata.com
    https://www.google-analytics.com
    https://analytics.google.com
    https://region1.google-analytics.com
    https://www.googletagmanager.com;
  frame-src
    https://*.clerk.com
    https://clerk.wealix.app
    https://accounts.wealix.app
    https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self' https://*.clerk.com https://clerk.wealix.app https://accounts.wealix.app;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  // NOTE: Do NOT set output: 'standalone' — it breaks @opennextjs/cloudflare
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  webpack(config: any, { isServer }: { isServer: boolean }) {
    if (isServer) {
      const cwd = process.cwd();
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias as Record<string, string>),
        'framer-motion': path.resolve(cwd, 'scripts/framer-motion-stub.js'),
        'recharts': path.resolve(cwd, 'scripts/recharts-stub.js'),
      };
    }
    return config;
  },
  async headers() {
    return [
      // Authenticated app routes — no caching, no indexing
      {
        source: '/(app|settings|onboarding|sign-in|sign-up)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, no-cache, max-age=0, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      // API routes — private, never indexed
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, no-cache, max-age=0, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      // Feature pages — public landing shells, indexable
      // Authenticated users see live data; guests see demo data.
      {
        source: '/(advisor|budget|expenses|income|portfolio|reports|net-worth|fire|retirement)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      // Global security headers
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Expenses page needs camera access for OCR
      {
        source: '/expenses',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
