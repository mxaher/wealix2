import type { NextConfig } from "next";
import path from "path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Production-only Clerk domains
const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://clerk.wealix.app https://accounts.wealix.app https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data: https://clerk.wealix.app https://accounts.wealix.app;
  connect-src 'self' https://*.clerk.com https://api.clerk.com https://clerk.wealix.app https://accounts.wealix.app https://*.wealix.app https://challenges.cloudflare.com https://www.datalab.to https://app.sahmk.sa https://api.twelvedata.com;
  frame-src https://*.clerk.com https://clerk.wealix.app https://accounts.wealix.app https://challenges.cloudflare.com;
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
        '@vercel/og': path.resolve(cwd, 'scripts/sharp-shim.js'),
        'next/dist/compiled/@vercel/og': path.resolve(cwd, 'scripts/sharp-shim.js'),
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(app|advisor|budget|expenses|income|portfolio|reports|net-worth|fire|retirement|settings|onboarding|sign-in|sign-up)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, no-cache, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, no-cache, max-age=0, must-revalidate' },
        ],
      },
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
