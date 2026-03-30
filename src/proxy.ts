import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedApiRoute = createRouteMatcher(['/api(.*)']);
const isAppRoute = createRouteMatcher(['/app(.*)', '/settings(.*)', '/advisor(.*)', '/budget(.*)', '/expenses(.*)', '/income(.*)', '/portfolio(.*)', '/reports(.*)', '/net-worth(.*)', '/fire(.*)', '/retirement(.*)']);
const isOnboarding = createRouteMatcher(['/onboarding(.*)']);
const isRoot = createRouteMatcher(['/']);

export default clerkMiddleware(async (auth, req) => {
  // Protect all API routes
  if (isProtectedApiRoute(req)) {
    await auth.protect();
    return;
  }

  const { userId, sessionClaims } = await auth();

  // Not signed in — protect app routes
  if (!userId) {
    if (isAppRoute(req) || isOnboarding(req)) {
      const signInUrl = new URL('https://accounts.wealix.app/sign-in');
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
    return;
  }

  // Signed in — check if they have a plan or active trial
  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  const hasPaid = meta.subscriptionTier === 'core' || meta.subscriptionTier === 'pro';
  const hasTrial =
    meta.trialStatus === 'active' &&
    typeof meta.trialEndsAt === 'string' &&
    new Date(meta.trialEndsAt as string).getTime() > Date.now();
  const hasAccess = hasPaid || hasTrial;

  // Redirect root to /app if already has access, or /onboarding if new user
  if (isRoot(req)) {
    return NextResponse.redirect(new URL(hasAccess ? '/app' : '/onboarding', req.url));
  }

  // If accessing app routes without a plan, send to onboarding
  if (isAppRoute(req) && !hasAccess) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // If on onboarding but already has access, skip to app
  if (isOnboarding(req) && hasAccess) {
    return NextResponse.redirect(new URL('/app', req.url));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
