import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import { isE2ERequestAuthenticated } from '@/lib/e2e-auth';
import { hasCompletedOnboardingCookie, ONBOARDING_DONE_COOKIE } from '@/lib/onboarding-guard';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';
const APP_ORIGIN = new URL(APP_URL);
const APP_HOSTNAME = APP_ORIGIN.hostname.toLowerCase();
const ADMIN_PANEL_HOST = (
  process.env.WEALIX_ADMIN_PANEL_HOST || 'wealix-admin-panel.moh-zaher.workers.dev'
).toLowerCase();

// Bug #17 fix: CLERK_EXPECTED_KID must be set explicitly in env — no hardcoded fallback.
// If not set, the stale handshake check is skipped (safer than accepting any kid).
const VALID_KID = process.env.CLERK_EXPECTED_KID ?? null;

// ─── Route matchers ───────────────────────────────────────────────────────────────────────────
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

// ─── Bug #11 fix: simplified stale handshake handler ───────────────────────────────────────
// The previous hand-rolled JWT parsing checked 'kid' without verifying the token signature,
// which meant a crafted token with a matching kid could pass the check.
// Clerk's own middleware handles full session validation. We only redirect to strip
// the __clerk_handshake query param when CLERK_EXPECTED_KID is configured and
// the token's kid does not match — purely as a loop-prevention mechanism.
// Signature verification is ALWAYS delegated to Clerk's SDK, not done here.
function extractJwtKid(token: string): string | null {
  try {
    const seg = token.split('.')[0] ?? '';
    if (!seg) return null;
    const padded = seg + '==='.slice(0, (4 - (seg.length & 3)) & 3);
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const header = JSON.parse(decoded) as unknown;
    if (typeof header === 'object' && header !== null && 'kid' in header && typeof (header as Record<string, unknown>).kid === 'string') {
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

  // Bug #17 fix: if CLERK_EXPECTED_KID is not configured, skip this check entirely.
  // Never compare against a hardcoded fallback — that leaks internal identifiers.
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

// Bug #10 fix: replace 'unsafe-inline' in style-src with nonce-based directive.
// This closes the CSS injection / attribute-selector exfiltration vector.
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
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data: blob: https: https://www.google-analytics.com;
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

  const blockedPaths = ['/wp-admin', '/wp-login', '/xmlrpc', '/.env', '/.git', '/phpmyadmin'];
  if (blockedPaths.some((p) => pathname.startsWith(p))) {
    return applySecurityHeaders(new NextResponse('Not Found', { status: 404 }), pathname, nonce);
  }

  // Bug #2 fix: admin API routes on non-admin hostnames return 403, not 404.
  if (isAdminPanelRoute(req)) {
    if (hostname !== ADMIN_PANEL_HOST) {
      // Distinguish: admin-panel page routes get 404 (no information leakage),
      // but admin API routes on the wrong host get 403 (proper HTTP semantics).
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

  // Bug #3 fix: pass the real NextFetchEvent instead of '{} as any'.
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
      await auth.protect();
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (isAppRoute(request)) {
      await auth.protect();

      if (!request.nextUrl.pathname.startsWith('/onboarding')) {
        const onboardingDone = request.cookies.get(ONBOARDING_DONE_COOKIE)?.value;
        // Bug #18: cookie is a performance cache only — actual onboarding state is
        // validated server-side in the onboarding API. The cookie prevents repeated
        // redirects for users who completed onboarding, but cannot be relied upon
        // as the sole authorization gate for subscription access.
        if (!hasCompletedOnboardingCookie(onboardingDone)) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
      }

      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Bug #1 fix: demo feature routes set x-demo-mode header.
    // Authenticated users get their userId forwarded; unauthenticated users are explicitly
    // flagged as demo-mode so components NEVER attempt to fetch real user financial data.
    if (isDemoFeatureRoute(request)) {
      const { userId } = await auth();

      if (userId) {
        const onboardingDone = request.cookies.get(ONBOARDING_DONE_COOKIE)?.value;
        if (!hasCompletedOnboardingCookie(onboardingDone)) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
        requestHeaders.set('x-demo-mode', 'false');
        requestHeaders.set('x-user-id', userId);
      } else {
        // Unauthenticated: enforce demo mode — components must render with mock data only.
        requestHeaders.set('x-demo-mode', 'true');
      }

      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  });

  // Bug #3 fix: pass the real event object instead of '{} as any'.
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
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|icons|.*\.png|.*\.jpg|.*\.svg|.*\.ico).*)',
    '/(api|trpc)(.*)',
  ],
};

export {
  buildContentSecurityPolicy,
  buildCookieDomains,
  extractJwtKid,
  handleStaleHandshake,
};
