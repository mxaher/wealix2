import type { NextConfig } from "next";
import path from "path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://www.datalab.to https://app.sahmk.sa https://api.twelvedata.com;
  frame-src https://*.clerk.com https://*.clerk.accounts.dev;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self' https://*.clerk.com https://*.clerk.accounts.dev;
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
