import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/portfolio(.*)',
  '/analytics(.*)',
  '/advisor(.*)',
  '/settings(.*)',
  '/onboarding(.*)',
  '/api/(?!webhooks)(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing(.*)',
  '/api/webhooks/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Block all non-app paths immediately — do not process with Clerk
  const blockedPaths = [
    '/wp-admin',
    '/wp-login',
    '/xmlrpc',
    '/.env',
    '/.git',
    '/admin',
    '/phpmyadmin',
  ];

  if (blockedPaths.some((p) => pathname.startsWith(p))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|icons|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)',
  ],
};
