import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getBillingState } from '@/lib/billing-state';

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
]);
const isStandardAccessRoute = createRouteMatcher([
  '/app(.*)',
  '/budget(.*)',
  '/expenses(.*)',
  '/income(.*)',
  '/portfolio(.*)',
  '/net-worth(.*)',
  '/fire(.*)',
  '/retirement(.*)',
]);
const isPaidOnlyRoute = createRouteMatcher([
  '/advisor(.*)',
  '/reports(.*)',
]);
const isBillingRoute = createRouteMatcher(['/settings/billing(.*)']);
const isOnboarding = createRouteMatcher(['/onboarding(.*)']);
const isLocalAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);
const isRoot = createRouteMatcher(['/']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicApiRoute(req)) {
    return;
  }

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

  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  const billingState = getBillingState(meta);
  const hasSelectedPlan = billingState.selectedPlan !== 'none';
  const hasStandardAccess = billingState.hasStandardAccess;
  const hasPaid = billingState.hasPaidAccess;

  if (isRoot(req)) {
    if (!hasSelectedPlan) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    return NextResponse.redirect(new URL(hasStandardAccess ? '/app' : '/settings/billing', req.url));
  }

  if (isLocalAuthRoute(req)) {
    return NextResponse.redirect(new URL(hasStandardAccess ? '/app' : '/onboarding', req.url));
  }

  if (!hasSelectedPlan && !isOnboarding(req) && !isBillingRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  if (isOnboarding(req) && hasSelectedPlan) {
    return NextResponse.redirect(new URL(hasStandardAccess ? '/app' : '/settings/billing', req.url));
  }

  if (isStandardAccessRoute(req) && !hasStandardAccess) {
    return NextResponse.redirect(new URL('/settings/billing', req.url));
  }

  if (isPaidOnlyRoute(req) && !hasPaid) {
    return NextResponse.redirect(new URL('/settings/billing', req.url));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
