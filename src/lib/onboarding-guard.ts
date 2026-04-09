import { getBillingState } from '@/lib/billing-state';

export const ONBOARDING_DONE_COOKIE = 'onboarding_done';

/**
 * Returns the post-onboarding redirect target.
 *
 * Decision tree:
 *  1. User has an active subscription / trial → go to /app (full access)
 *  2. User has selected a plan but hasn't activated it yet → go to /settings/billing to complete payment
 *  3. All other cases (free tier, no plan selected, brand-new users) → go to /app
 *
 * NOTE: This function must NEVER return null.  A null return causes
 * OnboardingClient to call router.push(null), which throws a runtime error
 * and triggers the "Something went wrong" error boundary.
 */
export function getOnboardingRedirectTarget(metadata: Record<string, unknown>): string {
  const billingState = getBillingState(metadata);

  if (billingState.hasStandardAccess) {
    return '/app';
  }

  // User picked a plan during onboarding but hasn't paid / activated trial yet
  if (billingState.selectedPlan !== 'none') {
    return '/settings/billing';
  }

  // Free tier or no billing metadata — always safe to go to /app
  return '/app';
}

export function hasCompletedOnboardingCookie(value: string | undefined | null) {
  return value === '1';
}

export function getOnboardingDoneCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  };
}
