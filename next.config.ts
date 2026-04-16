import type { NextConfig } from "next";
import path from "path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // NOTE: Do NOT set output: 'standalone' — it breaks @opennextjs/cloudflare
  turbopack: {},
  poweredByHeader: false,
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
        source: '/(app|dashboard|settings|onboarding|sign-in|sign-up|admin)/:path*',
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
      // Demo-capable feature pages — public shells, indexable.
      {
        source: '/(advisor|budget|expenses|income|portfolio|reports|net-worth|fire|retirement)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      {
        source: '/(planning|budget-planning)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ];
  },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
