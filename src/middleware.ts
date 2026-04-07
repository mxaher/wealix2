import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { type NextRequest, NextResponse } from 'next/server';
import { isE2ERequestAuthenticated } from '@/lib/e2e-auth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';
const APP_ORIGIN = new URL(APP_URL);
const APP_HOSTNAME = APP_ORIGIN.hostname.toLowerCase();

// ─── Route matchers ────────────────────────────────────────────────────────────
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/api/webhooks/stripe(.*)',
]);
const isProtectedApiRoute = createRouteMatcher(['/api(.*)']);
const isAppRoute = createRouteMatcher([
  '/app(.*)',
  '/dashboard(.*)',
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
  '/onboarding(.*)',
  '/planning(.*)'
]);

// ─── Clerk instance guard ──────────────────────────────────────────────────────
// Live instance: ins_3BXeeFpYvNEqGtajEpFP4w8d1q0  (production)
// Dev  instance: ins_3BTweREnZ4qiEVQJoQqgMRn5Bfg  (local dev — must never reach prod)
const VALID_KID = 'ins_3BXeeFpYvNEqGtajEpFP4w8d1q0';

function getHandshakeKid(token: string): string | null {
  try {
    const seg = token.split('.')[0];
    // restore base64url padding
    const padded = seg + '==='.slice(0, (4 - (seg.length & 3)) & 3);
    const header = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof header?.kid === 'string' ? header.kid : null;
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

// ─── Raw pre-Clerk interceptor ─────────────────────────────────────────────────
// This function runs BEFORE clerkMiddleware so a stale dev-instance handshake
// never reaches Clerk's verification logic (which would throw a 500).
function handleStaleHandshake(req: NextRequest): NextResponse | null {
  const handshake = req.nextUrl.searchParams.get('__clerk_handshake');
  if (!handshake) return null;

  const kid = getHandshakeKid(handshake);

  // If kid is missing OR belongs to the dev instance → purge and redirect clean
  if (!kid || kid !== VALID_KID) {
    const cleanUrl = buildSafeUrl(req);
    cleanUrl.searchParams.delete('__clerk_handshake');
    cleanUrl.searchParams.delete('__clerk_db_jwt');
    cleanUrl.searchParams.delete('__clerk_redirect_count');

    const res = NextResponse.redirect(cleanUrl, { status: 302 });
    nukeCookies(res, getSafeHostname(req.nextUrl.hostname));
    return res;
  }

  return null; // valid handshake — let Clerk handle it normally
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
    style-src 'self' 'unsafe-inline';
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
    pathname === '/expenses'
      ? 'camera=(self), microphone=(), geolocation=()'
      : 'camera=(), microphone=(), geolocation=()'
  );
  response.headers.set('x-nonce', nonce);
  return response;
}

// ─── Main middleware export ────────────────────────────────────────────────────
export default function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', buildContentSecurityPolicy(nonce));

  // 1. Block scanner bots before anything else
  const { pathname } = req.nextUrl;
  const blockedPaths = ['/wp-admin', '/wp-login', '/xmlrpc', '/.env', '/.git', '/admin', '/phpmyadmin'];
  if (blockedPaths.some((p) => pathname.startsWith(p))) {
    return applySecurityHeaders(new NextResponse('Not Found', { status: 404 }), pathname, nonce);
  }

  // 2. Intercept stale / dev-instance handshakes BEFORE Clerk runs
  const staleResponse = handleStaleHandshake(req);
  if (staleResponse) return applySecurityHeaders(staleResponse, pathname, nonce);

  // 3. Hand off to Clerk for all remaining requests
  const clerkHandler = clerkMiddleware(async (auth, request) => {
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
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  });
  const response = clerkHandler(req, {} as any) ?? NextResponse.next({ request: { headers: requestHeaders } });

  return Promise.resolve(response).then((resolvedResponse) => (
    applySecurityHeaders(
      resolvedResponse ?? NextResponse.next({ request: { headers: requestHeaders } }),
      pathname,
      nonce
    )
  ));
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
  getHandshakeKid,
  handleStaleHandshake,
};
