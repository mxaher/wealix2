import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicApiRoute = createRouteMatcher(['/api/webhooks/stripe(.*)']);
const isProtectedApiRoute = createRouteMatcher(['/api(.*)']);
const isAppRoute = createRouteMatcher([
  '/app(.*)',
  '/settings(.*)',
  '/advisor(.*)',
  '/budget(.*)',
  '/expenses(.*)',
  '/income(.*)',
  '/portfolio(.*)',
  '/reports(.*)',
  '/net-worth(.*)',
  '/fire(.*)',
  '/retirement(.*)',
  '/onboarding(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // 1. Security: Block scanner paths
  const blockedPaths = ['/wp-admin', '/wp-login', '/xmlrpc', '/.env', '/.git', '/admin', '/phpmyadmin'];
  if (blockedPaths.some((p) => pathname.startsWith(p))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 2. Public API
  if (isPublicApiRoute(req)) return;

  // 3. Protected API
  if (isProtectedApiRoute(req)) {
    await auth.protect();
    return;
  }

  // 4. Protect App Routes
  if (isAppRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|icons|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)',
    '/(api|trpc)(.*)',
  ],
};
