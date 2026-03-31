export type PlanTier = 'none' | 'core' | 'pro';
export type NormalizedSubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid';

export type BillingMetadata = {
  plan?: unknown;
  subscriptionTier?: unknown;
  subscriptionStatus?: unknown;
  trialActive?: unknown;
  trialStatus?: unknown;
  trialPlan?: unknown;
  trialEnd?: unknown;
  trialEndsAt?: unknown;
  paymentAdded?: unknown;
  stripeCustomerId?: unknown;
  stripeSubscriptionId?: unknown;
  trialWillEndSoon?: unknown;
};

export type BillingState = {
  selectedPlan: PlanTier;
  subscriptionTier: PlanTier;
  subscriptionStatus: NormalizedSubscriptionStatus;
  trialPlan: PlanTier;
  trialActive: boolean;
  trialEndsAt: string | null;
  paymentAdded: boolean;
  hasPaidAccess: boolean;
  hasStandardAccess: boolean;
};

export function normalizePlanTier(value: unknown): PlanTier {
  return value === 'core' || value === 'pro' ? value : 'none';
}

export function normalizeSubscriptionStatus(value: unknown): NormalizedSubscriptionStatus {
  if (
    value === 'trialing' ||
    value === 'active' ||
    value === 'past_due' ||
    value === 'canceled' ||
    value === 'incomplete' ||
    value === 'unpaid'
  ) {
    return value;
  }

  return 'none';
}

function normalizeTrialEnd(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? value : null;
}

function isFutureIsoDate(value: string | null) {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() > Date.now();
}

export function getBillingState(metadata?: BillingMetadata): BillingState {
  const subscriptionTier = normalizePlanTier(metadata?.subscriptionTier ?? metadata?.plan);
  const trialPlan = normalizePlanTier(metadata?.trialPlan);
  const selectedPlan = subscriptionTier !== 'none' ? subscriptionTier : trialPlan;
  const subscriptionStatus = normalizeSubscriptionStatus(metadata?.subscriptionStatus);
  const trialEndsAt = normalizeTrialEnd(metadata?.trialEndsAt ?? metadata?.trialEnd);
  const paymentAdded = metadata?.paymentAdded === true;

  const trialMarkedActive =
    metadata?.trialActive === true || metadata?.trialStatus === 'active' || subscriptionStatus === 'trialing';
  const trialActive = trialMarkedActive && trialPlan !== 'none' && isFutureIsoDate(trialEndsAt);

  const hasPaidAccess =
    selectedPlan !== 'none' &&
    paymentAdded &&
    (subscriptionStatus === 'active' || subscriptionStatus === 'trialing');

  return {
    selectedPlan,
    subscriptionTier,
    subscriptionStatus,
    trialPlan,
    trialActive,
    trialEndsAt,
    paymentAdded,
    hasPaidAccess,
    hasStandardAccess: hasPaidAccess || trialActive,
  };
}
