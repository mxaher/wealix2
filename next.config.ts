import type { NextConfig } from "next";
import path from "path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.wealix.app https://*.wealix.app https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data: https://clerk.wealix.app https://*.wealix.app;
  connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://clerk.wealix.app https://*.wealix.app https://challenges.cloudflare.com https://www.datalab.to https://app.sahmk.sa https://api.twelvedata.com;
  frame-src https://*.clerk.com https://*.clerk.accounts.dev https://clerk.wealix.app https://*.wealix.app https://challenges.cloudflare.com https://accounts.wealix.app;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.wealix.app https://*.wealix.app;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(process.cwd()),
    resolveAlias: {
      // sharp is a native binary — not compatible with Cloudflare Workers.
      // Alias it to an empty shim so Turbopack never emits a require() for it.
      sharp: './scripts/sharp-shim.js',
    },
  },
  reactStrictMode: true,
  // Reduce Cloudflare Worker bundle size by replacing heavy animation/chart
  // libraries with lightweight server stubs. The real libraries are still
  // shipped as client-side JS chunks — they just don't get SSR'd.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack(config: any, { isServer }: { isServer: boolean }) {
    if (isServer) {
      const cwd = process.cwd();
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias as Record<string, string>),
        // framer-motion: replaces ~3-5 MB from the worker bundle
        'framer-motion': path.resolve(cwd, 'scripts/framer-motion-stub.js'),
        // recharts: replaces ~3-5 MB from the worker bundle
        'recharts': path.resolve(cwd, 'scripts/recharts-stub.js'),
        // @vercel/og is pulled in by Next.js internals even when unused
        '@vercel/og': path.resolve(cwd, 'scripts/sharp-shim.js'),
        'next/dist/compiled/@vercel/og': path.resolve(cwd, 'scripts/sharp-shim.js'),
      };
    }
    return config;
  },
  async headers() {
    return [
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
