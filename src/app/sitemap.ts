// BUG #004 FIX — Only public routes in sitemap
import { MetadataRoute } from 'next';

const PUBLIC_ROUTES = ['/', '/pricing', '/about', '/blog', '/contact'];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  return PUBLIC_ROUTES.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
