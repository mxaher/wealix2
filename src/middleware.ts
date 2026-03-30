import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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
]);
const isOnboarding = createRouteMatcher(['/onboarding(.*)']);
const isRoot = createRouteMatcher(['/']);

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedApiRoute(req)) {
      await auth.protect();
      return;
    }

    const { userId, sessionClaims } = await auth();

    if (!userId) {
      if (isAppRoute(req) || isOnboarding(req)) {
        const signInUrl = new URL('https://accounts.wealix.app/sign-in');
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
      }
      return;
    }

    const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
    const hasPaid = meta.subscriptionTier === 'core' || meta.subscriptionTier === 'pro';
    const hasTrial =
      meta.trialStatus === 'active' &&
      typeof meta.trialEndsAt === 'string' &&
      new Date(meta.trialEndsAt as string).getTime() > Date.now();
    const hasAccess = hasPaid || hasTrial;

    if (isRoot(req)) {
      return NextResponse.redirect(new URL(hasAccess ? '/app' : '/onboarding', req.url));
    }

    if (isAppRoute(req) && !hasAccess) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    if (isOnboarding(req) && hasAccess) {
      return NextResponse.redirect(new URL('/app', req.url));
    }
  },
  (req) => ({
    isSatellite: true,
    domain: req.nextUrl.host,
    signInUrl: 'https://accounts.wealix.app/sign-in',
    signUpUrl: 'https://accounts.wealix.app/sign-up',
  })
);

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
