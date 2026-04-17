import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import { isE2ERequestAuthenticated } from '@/lib/e2e-auth';
import { verifyOnboardingCookieValue, ONBOARDING_DONE_COOKIE } from '@/lib/onboarding-guard';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';
const APP_ORIGIN = new URL(APP_URL);
const APP_HOSTNAME = APP_ORIGIN.hostname.toLowerCase();

// Bug #020 fix: no hardcoded fallback — WEALIX_ADMIN_PANEL_HOST must be set in env.
// A missing value disables admin panel routing entirely rather than exposing a known URL.
const ADMIN_PANEL_HOST = (process.env.WEALIX_ADMIN_PANEL_HOST ?? '').toLowerCase();

// Bug #17 fix: CLERK_EXPECTED_KID must be set explicitly in env — no hardcoded fallback.
// If not set, the stale handshake check is skipped (safer than accepting any kid).
const VALID_KID = process.env.CLERK_EXPECTED_KID ?? null;

// Bug #021 fix: warn at startup if security-critical env vars are absent.
if (!VALID_KID) {
  console.warn('[Security] CLERK_EXPECTED_KID not set — stale handshake protection disabled');
}
if (!ADMIN_PANEL_HOST) {
  console.warn('[Security] WEALIX_ADMIN_PANEL_HOST not set — admin panel routing disabled');
}

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/help(.*)',
  '/contact(.*)',
  '/blog(.*)',
  '/brand(.*)',
  '/vs(.*)',
  '/markets(.*)',
  '/samples(.*)',
  '/api/webhooks/stripe(.*)',
]);
const isProtectedApiRoute = createRouteMatcher(['/api(.*)']);
const isAdminPanelRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/v1/admin(.*)',
  '/api/admin-panel(.*)',
]);
const isAppRoute = createRouteMatcher([
  '/app(.*)',
  '/dashboard(.*)',
  '/settings(.*)',
  '/onboarding(.*)',
]);
const isDemoFeatureRoute = createRouteMatcher([
  '/advisor(.*)',
  '/budget(.*)',
  '/expenses(.*)',
  '/income(.*)',
  '/portfolio(.*)',
  '/reports(.*)',
  '/net-worth(.*)',
  '/fire(.*)',
  '/retirement(.*)',
  '/planning(.*)',
  '/budget-planning(.*)',
]);

function extractJwtKid(token: string): string | null {
  try {
    const seg = token.split('.')[0] ?? '';
    if (!seg) return null;
    const padded = seg + '==='.slice(0, (4 - (seg.length & 3)) & 3);
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const header = JSON.parse(decoded) as unknown;
    if (
      typeof header === 'object' &&
      header !== null &&
      'kid' in header &&
      typeof (header as Record<string, unknown>).kid === 'string'
    ) {
      return (header as Record<string, string>).kid;
    }
    return null;
  } catch {
    return null;
  }
}

const CLERK_COOKIES = [
  '__session',
  '__client_uat',
  '__clerk_db_jwt',
  '__clerk_handshake',
  '__clerk_redirect_count',
];

function isAllowedHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === APP_HOSTNAME || normalized.endsWith(`.${APP_HOSTNAME}`);
}

function getSafeHostname(hostname: string) {
  return isAllowedHost(hostname) ? hostname : APP_ORIGIN.hostname;
}

function buildSafeUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.protocol = APP_ORIGIN.protocol;
  url.host = getSafeHostname(url.hostname);
  return url;
}

function buildCookieDomains(hostname: string) {
  const parts = hostname.split('.').filter(Boolean);
  const domains = new Set<string>([hostname]);
  for (let index = 1; index < parts.length - 1; index += 1) {
    domains.add(`.${parts.slice(index).join('.')}`);
  }
  return [...domains];
}

function nukeCookies(response: NextResponse, hostname: string) {
  const domains = buildCookieDomains(hostname);
  for (const name of CLERK_COOKIES) {
    for (const domain of domains) {
      response.cookies.set(name, '', {
        maxAge: 0,
        path: '/',
        domain,
        sameSite: 'lax',
        secure: true,
        httpOnly: true,
      });
    }
  }
}

function handleStaleHandshake(req: NextRequest): NextResponse | null {
  const handshake = req.nextUrl.searchParams.get('__clerk_handshake');
  if (!handshake) return null;
  if (!VALID_KID) return null;

  const kid = extractJwtKid(handshake);
  if (!kid || kid !== VALID_KID) {
    const cleanUrl = buildSafeUrl(req);
    cleanUrl.searchParams.delete('__clerk_handshake');
    cleanUrl.searchParams.delete('__clerk_db_jwt');
    cleanUrl.searchParams.delete('__clerk_redirect_count');
    const res = NextResponse.redirect(cleanUrl, { status: 302 });
    nukeCookies(res, getSafeHostname(req.nextUrl.hostname));
    return res;
  }
  return null;
}

function buildContentSecurityPolicy(nonce: string) {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}'
      https://*.clerk.com
      https://clerk.wealix.app
      https://accounts.wealix.app
      https://challenges.cloudflare.com
      https://www.googletagmanager.com
      https://www.google-analytics.com;
    style-src 'self' 'nonce-${nonce}'
      https://*.clerk.com
      https://clerk.wealix.app
      https://accounts.wealix.app;
    img-src 'self' data: blob:
      https://*.clerk.com
      https://clerk.wealix.app
      https://accounts.wealix.app
      https://img.clerk.com
      https://www.google-analytics.com
      https://www.googletagmanager.com;
    font-src 'self' data: https://clerk.wealix.app https://accounts.wealix.app;
    connect-src 'self'
      https://*.clerk.com
      https://api.clerk.com
      https://clerk.wealix.app
      https://accounts.wealix.app
      https://*.wealix.app
      https://challenges.cloudflare.com
      https://www.datalab.to
      https://app.sahmk.sa
      https://api.twelvedata.com
      https://www.google-analytics.com
      https://analytics.google.com
      https://region1.google-analytics.com
      https://www.googletagmanager.com;
    frame-src
      https://*.clerk.com
      https://clerk.wealix.app
      https://accounts.wealix.app
      https://challenges.cloudflare.com;
    object-src 'none';
    base-uri 'self';
    frame-ancestors 'none';
    form-action 'self' https://*.clerk.com https://clerk.wealix.app https://accounts.wealix.app;
    upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();
}

function applySecurityHeaders(response: Response, pathname: string, nonce: string) {
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set(
    'Permissions-Policy',
    pathname.startsWith('/expenses')
      ? 'camera=(self), microphone=(), geolocation=()'
      : 'camera=(), microphone=(), geolocation=()'
  );
  response.headers.set('x-nonce', nonce);
  return response;
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', buildContentSecurityPolicy(nonce));

  const { pathname } = req.nextUrl;
  const hostname = req.nextUrl.hostname.toLowerCase();

  const blockedPaths = [
    '/wp-admin', '/wp-login', '/xmlrpc', '/.env', '/.git', '/phpmyadmin',
    '/vendor/', '/node_modules/', '/.DS_Store', '/backup/', '/dump/',
    '/.well-known/acme-challenge',
  ];
  if (blockedPaths.some((p) => pathname.startsWith(p))) {
    return applySecurityHeaders(new NextResponse('Not Found', { status: 404 }), pathname, nonce);
  }

  if (isAdminPanelRoute(req)) {
    if (hostname !== ADMIN_PANEL_HOST) {
      const isAdminApiRoute = pathname.startsWith('/api/v1/admin') || pathname.startsWith('/api/admin-panel');
      const status = isAdminApiRoute ? 403 : 404;
      return applySecurityHeaders(
        new NextResponse(isAdminApiRoute ? 'Forbidden' : 'Not Found', { status }),
        pathname,
        nonce
      );
    }
    return applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), pathname, nonce);
  }

  const staleResponse = handleStaleHandshake(req);
  if (staleResponse) return applySecurityHeaders(staleResponse, pathname, nonce);

  const clerkHandler = clerkMiddleware(async (auth, request) => {
    if (request.nextUrl.pathname === '/') {
      const { userId } = await auth();
      if (userId) {
        return NextResponse.redirect(new URL('/app', request.url));
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (isPublicRoute(request)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (isE2ERequestAuthenticated(request)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (isProtectedApiRoute(request)) {
      const method = request.method.toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const origin = request.headers.get('origin');
        if (origin) {
          let allowed = false;
          try {
            allowed = isAllowedHost(new URL(origin).hostname);
          } catch {
            allowed = false;
          }
          if (!allowed) {
            return applySecurityHeaders(
              new NextResponse('Forbidden', { status: 403 }),
              pathname,
              nonce
            );
          }
        }
      }
      await auth.protect();
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (isAppRoute(request)) {
      const { userId } = await auth.protect();

      if (!request.nextUrl.pathname.startsWith('/onboarding')) {
        const onboardingDone = request.cookies.get(ONBOARDING_DONE_COOKIE)?.value;
        if (!(await verifyOnboardingCookieValue(onboardingDone, userId))) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
      }

      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (isDemoFeatureRoute(request)) {
      const { userId } = await auth();

      if (userId) {
        const onboardingDone = request.cookies.get(ONBOARDING_DONE_COOKIE)?.value;
        if (!(await verifyOnboardingCookieValue(onboardingDone, userId))) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
        requestHeaders.set('x-demo-mode', 'false');
        requestHeaders.set('x-user-id', userId);
      } else {
        requestHeaders.set('x-demo-mode', 'true');
      }

      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  });

  const response = clerkHandler(req, event) ?? NextResponse.next({ request: { headers: requestHeaders } });
  return Promise.resolve(response).then((resolvedResponse) =>
    applySecurityHeaders(
      resolvedResponse ?? NextResponse.next({ request: { headers: requestHeaders } }),
      pathname,
      nonce
    )
  );
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|icons|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)',
    '/(api|trpc)(.*)',
  ],
};

export {
  buildContentSecurityPolicy,
  buildCookieDomains,
  extractJwtKid,
  handleStaleHandshake,
};
