import type { NextRequest } from 'next/server';
import type { BillingMetadata } from '@/lib/billing-state';

export const E2E_AUTH_COOKIE_NAME = 'wealix_e2e_auth';

export type E2ETestUser = {
  id: string;
  email: string;
  name: string;
  imageUrl: string | null;
  subscriptionTier: 'core' | 'pro';
  publicMetadata: BillingMetadata;
};

function parseBooleanEnv(value: string | undefined) {
  return value === '1' || value === 'true';
}

export function isE2EAuthEnabled() {
  // CRITICAL: E2E auth bypass is NEVER allowed in production regardless of env vars.
  // This is a hard security boundary — do not remove this guard.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return parseBooleanEnv(process.env.NEXT_PUBLIC_E2E_AUTH_ENABLED);
}

export function getE2EAuthSecret() {
  // No default fallback — secret must be explicitly set in the environment.
  // A missing or weak secret (< 32 chars) disables the bypass system entirely.
  const secret = process.env.E2E_AUTH_SECRET ?? '';
  if (secret.length < 32) {
    return '';
  }
  return secret;
}

export function getE2EStorageDir() {
  return process.env.E2E_STORAGE_DIR ?? '.e2e/.runtime';
}

export function getE2ETestUser(): E2ETestUser {
  const tier = process.env.E2E_AUTH_SUBSCRIPTION_TIER === 'core' ? 'core' : 'pro';

  return {
    id: process.env.E2E_AUTH_USER_ID ?? 'e2e-user',
    email: process.env.E2E_AUTH_USER_EMAIL ?? 'e2e@wealix.local',
    name: process.env.E2E_AUTH_USER_NAME ?? 'Wealix E2E',
    imageUrl: null,
    subscriptionTier: tier,
    publicMetadata: {
      plan: tier,
      subscriptionTier: tier,
      subscriptionStatus: 'active',
      paymentAdded: true,
      trialActive: false,
      trialStatus: 'none',
      trialPlan: tier,
    },
  };
}

export function isValidE2EAuthCookie(value: string | null | undefined) {
  // Double production guard — belt and suspenders.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  if (!isE2EAuthEnabled()) {
    return false;
  }

  const expectedSecret = getE2EAuthSecret();

  // Both the stored secret and the provided cookie value must be non-empty and match exactly.
  if (!expectedSecret || !value) {
    return false;
  }

  return value === expectedSecret;
}

export function isE2ERequestAuthenticated(request: NextRequest) {
  return isValidE2EAuthCookie(request.cookies.get(E2E_AUTH_COOKIE_NAME)?.value);
}

export function isE2ECookieStoreAuthenticated(
  cookieStore: { get: (name: string) => { value?: string } | undefined }
) {
  return isValidE2EAuthCookie(cookieStore.get(E2E_AUTH_COOKIE_NAME)?.value);
}

export function hasE2EAuthCookie() {
  if (!isE2EAuthEnabled() || typeof document === 'undefined') {
    return false;
  }

  return document.cookie.split(';').some((part) => part.trim().startsWith(`${E2E_AUTH_COOKIE_NAME}=`));
}
