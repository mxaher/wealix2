import type { SubscriptionTier } from '@/store/useAppStore';

const TRIAL_PLAN_STORAGE_KEY = 'wealix-preferred-trial-plan';

export type TrialPlan = Exclude<SubscriptionTier, 'free'>;

export function setPreferredTrialPlan(plan: TrialPlan) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TRIAL_PLAN_STORAGE_KEY, plan);
}

export function getPreferredTrialPlan(): TrialPlan {
  if (typeof window === 'undefined') {
    return 'pro';
  }

  const value = window.localStorage.getItem(TRIAL_PLAN_STORAGE_KEY);
  return value === 'core' ? 'core' : 'pro';
}

export function clearPreferredTrialPlan() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(TRIAL_PLAN_STORAGE_KEY);
}
