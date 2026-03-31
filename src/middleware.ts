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
  const hasPaid =
    (meta.subscriptionTier === 'core' || meta.subscriptionTier === 'pro') &&
    meta.subscriptionStatus === 'active';
  const hasSelectedPlan =
    (meta.subscriptionTier === 'core' || meta.subscriptionTier === 'pro') ||
    meta.trialPlan === 'core' ||
    meta.trialPlan === 'pro';
  const hasTrial =
    (meta.trialPlan === 'core' || meta.trialPlan === 'pro') &&
    meta.trialStatus === 'active' &&
    typeof meta.trialEndsAt === 'string' &&
    new Date(meta.trialEndsAt as string).getTime() > Date.now();
  const hasStandardAccess = hasPaid || hasTrial;

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
