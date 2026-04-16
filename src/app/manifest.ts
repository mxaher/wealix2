// BUG #027 FIX — PWA start_url points to /app (not landing page)
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wealix — Intelligent Portfolio Tracker',
    short_name: 'Wealix',
    description: 'AI-powered investment portfolio tracking and financial planning',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      { name: 'Portfolio', url: '/app/portfolio', description: 'View your portfolio' },
      { name: 'FIRE Calculator', url: '/fire', description: 'Track FIRE progress' },
    ],
  };
}
