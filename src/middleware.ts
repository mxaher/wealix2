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
const isPremiumRoute = createRouteMatcher([
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
const isLocalAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);
const isRoot = createRouteMatcher(['/']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedApiRoute(req)) {
    await auth.protect();
    return;
  }

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    if (isAppRoute(req) || isOnboarding(req)) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
    return;
  }

  if (isRoot(req)) {
    return NextResponse.redirect(new URL('/app', req.url));
  }

  if (isLocalAuthRoute(req)) {
    return NextResponse.redirect(new URL('/app', req.url));
  }

  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  const hasPaid = meta.subscriptionTier === 'core' || meta.subscriptionTier === 'pro';
  const hasTrial =
    (meta.trialPlan === 'core' || meta.trialPlan === 'pro') &&
    meta.trialStatus === 'active' &&
    typeof meta.trialEndsAt === 'string' &&
    new Date(meta.trialEndsAt as string).getTime() > Date.now();

  if (isPremiumRoute(req) && !hasPaid && !hasTrial) {
    return NextResponse.redirect(new URL('/settings/billing', req.url));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
