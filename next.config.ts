import type { NextConfig } from "next";
import path from "path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Bug #21: image optimization via Cloudflare Images resize service.
// Set NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH in env to your Cloudflare account images hash.
// Falls back to unoptimized if not configured (development/preview environments).
const isCfImagesConfigured = Boolean(process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH);

const nextConfig: NextConfig = {
  // NOTE: Do NOT set output: 'standalone' — it breaks @opennextjs/cloudflare
  turbopack: {},
  poweredByHeader: false,
  images: isCfImagesConfigured
    ? {
        loader: 'custom',
        loaderFile: './src/lib/cloudflare-image-loader.ts',
      }
    : {
        // Fallback for local dev and preview environments without CF Images configured.
        unoptimized: true,
      },
  reactStrictMode: true,
  // Bug #27: server-side stubs for animation/chart libraries.
  // WARNING: Any Server Component that imports framer-motion or recharts will silently
  // render nothing. Add 'use client' to any component using these libraries.
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
      // Bug #5 fix: apply core security headers to ALL routes including static paths
      // that bypass the middleware matcher. Defense-in-depth layer.
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
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
