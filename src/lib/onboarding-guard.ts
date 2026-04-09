import { getBillingState } from '@/lib/billing-state';

export const ONBOARDING_DONE_COOKIE = 'onboarding_done';

export function getOnboardingRedirectTarget(metadata: Record<string, unknown>) {
  const billingState = getBillingState(metadata);

  if (billingState.hasStandardAccess) {
    return '/app';
  }

  if (billingState.selectedPlan !== 'none') {
    return '/settings/billing';
  }

  return null;
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
