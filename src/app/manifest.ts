import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wealix — AI Wealth OS',
    short_name: 'Wealix',
    description:
      'Track your net worth, portfolio, FIRE progress and expenses with AI. Built for MENA investors.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      {
        src: '/brand/logo-fav-icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/wealix-apple-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    categories: ['finance', 'productivity'],
    lang: 'en',
    dir: 'ltr',
  };
}
