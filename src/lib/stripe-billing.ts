export type StripePlanId = 'core' | 'pro';
export type StripeBillingCycle = 'monthly' | 'annual';

export const PRICE_IDS: Record<StripePlanId, Record<StripeBillingCycle, string | undefined>> = {
  core: {
    monthly: process.env.STRIPE_PRICE_CORE_MONTHLY,
    annual: process.env.STRIPE_PRICE_CORE_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
};

export function getPriceId(plan: StripePlanId, cycle: StripeBillingCycle) {
  return PRICE_IDS[plan][cycle];
}

export function getCatalogPriceIds() {
  return (Object.values(PRICE_IDS) as Array<Record<StripeBillingCycle, string | undefined>>)
    .flatMap((entry) => [entry.monthly, entry.annual])
    .filter((value): value is string => Boolean(value));
}

export function getPlanFromPriceId(priceId: string | null | undefined): StripePlanId | null {
  if (!priceId) {
    return null;
  }

  for (const [plan, cycles] of Object.entries(PRICE_IDS) as Array<
    [StripePlanId, Record<StripeBillingCycle, string | undefined>]
  >) {
    if (cycles.monthly === priceId || cycles.annual === priceId) {
      return plan;
    }
  }

  return null;
}

export function getCycleFromPriceId(priceId: string | null | undefined): StripeBillingCycle | null {
  if (!priceId) {
    return null;
  }

  for (const cycles of Object.values(PRICE_IDS) as Array<Record<StripeBillingCycle, string | undefined>>) {
    if (cycles.monthly === priceId) {
      return 'monthly';
    }
    if (cycles.annual === priceId) {
      return 'annual';
    }
  }

  return null;
}
