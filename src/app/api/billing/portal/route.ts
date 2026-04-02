import { type NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getPublicAppEnv } from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { getCatalogPriceIds } from '@/lib/stripe-billing';

export const dynamic = 'force-dynamic';
// NOTE: Do NOT set runtime = 'edge' — OpenNext Cloudflare handles all routes as Workers already

let cachedPortalConfigurationId: string | null = null;

async function getPortalConfigurationId(stripe: ReturnType<typeof getStripe>, appUrl: string) {
  if (process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID) {
    return process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
  }

  if (cachedPortalConfigurationId) {
    return cachedPortalConfigurationId;
  }

  const priceObjects = await Promise.all(
    getCatalogPriceIds().map((priceId) => stripe.prices.retrieve(priceId, { expand: ['product'] }))
  );

  const products = new Map<string, string[]>();
  for (const price of priceObjects) {
    const productId = typeof price.product === 'string' ? price.product : price.product?.id;
    if (!productId) {
      continue;
    }

    const knownPrices = products.get(productId) ?? [];
    knownPrices.push(price.id);
    products.set(productId, Array.from(new Set(knownPrices)));
  }

  const features = {
    customer_update: {
      enabled: true,
      allowed_updates: ['email', 'name'] as Array<'email' | 'name'>,
    },
    invoice_history: {
      enabled: true,
    },
    payment_method_update: {
      enabled: true,
    },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end' as const,
      proration_behavior: 'none' as const,
      cancellation_reason: {
        enabled: true,
      },
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price'] as Array<'price'>,
      billing_cycle_anchor: 'unchanged' as const,
      proration_behavior: 'always_invoice' as const,
      trial_update_behavior: 'continue_trial' as const,
      products: Array.from(products.entries()).map(([product, prices]) => ({
        product,
        prices,
      })),
    },
  };

  const configurations = await stripe.billingPortal.configurations.list({ limit: 20 });
  const existing = configurations.data.find((configuration) => configuration.metadata?.app === 'wealix');

  if (existing) {
    const updated = await stripe.billingPortal.configurations.update(existing.id, {
      default_return_url: `${appUrl}/settings/billing`,
      features,
      metadata: { ...existing.metadata, app: 'wealix' },
    });
    cachedPortalConfigurationId = updated.id;
    return updated.id;
  }

  const created = await stripe.billingPortal.configurations.create({
    name: 'Wealix Billing Portal',
    default_return_url: `${appUrl}/settings/billing`,
    features,
    metadata: { app: 'wealix' },
  });
  cachedPortalConfigurationId = created.id;
  return created.id;
}

export async function POST(_req: NextRequest) {
  let userId: string | null = null;
  let customerId: string | undefined;

  try {
    const authResult = await auth();
    userId = authResult.userId;
    const sessionClaims = authResult.sessionClaims;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripe();
    const appUrl = getPublicAppEnv().NEXT_PUBLIC_APP_URL;

    customerId =
      typeof (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)?.stripeCustomerId === 'string'
        ? ((sessionClaims?.publicMetadata as Record<string, unknown>).stripeCustomerId as string)
        : undefined;

    if (!customerId) {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      customerId =
        (user.privateMetadata?.stripeCustomerId as string | undefined) ||
        (user.publicMetadata?.stripeCustomerId as string | undefined);
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please add a payment method first.' },
        { status: 404 }
      );
    }

    const configuration = await getPortalConfigurationId(stripe, appUrl);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      configuration,
      return_url: `${appUrl}/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/portal] failed', {
      userId,
      hasCustomerId: Boolean(customerId),
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json(
      {
        error: error instanceof Error
          ? `Unable to open Stripe billing portal: ${error.message}`
          : 'Unable to open Stripe billing portal.',
      },
      { status: 502 }
    );
  }
}
