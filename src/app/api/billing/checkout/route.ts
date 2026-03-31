import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getBillingState } from '@/lib/billing-state';
import { getPublicEnv, getRequiredEnv } from '@/lib/env';

const PRICE_IDS: Record<'core' | 'pro', Record<'monthly' | 'annual', string | undefined>> = {
  core: {
    monthly: process.env.STRIPE_PRICE_CORE_MONTHLY,
    annual: process.env.STRIPE_PRICE_CORE_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
};

async function withTimeout<T>(label: string, action: Promise<T>, timeoutMs = 12_000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([action, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function buildTrialConfig(
  trialEndsAt: string | null,
  hasPaymentAdded: boolean,
  trialAlreadyUsed: boolean
) {
  if (hasPaymentAdded) {
    return {};
  }

  if (trialAlreadyUsed) {
    return {};
  }

  if (trialEndsAt) {
    const unix = Math.floor(new Date(trialEndsAt).getTime() / 1000);
    if (Number.isFinite(unix) && unix > Math.floor(Date.now() / 1000)) {
      return { trial_end: unix };
    }
  }

  return { trial_period_days: 14 };
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY');
    const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;

    const body = (await req.json().catch(() => null)) as { plan?: string; cycle?: string } | null;
    const plan = body?.plan;
    const cycle = body?.cycle;

    if (plan !== 'core' && plan !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan. Must be "core" or "pro".' }, { status: 400 });
    }

    if (cycle !== 'monthly' && cycle !== 'annual') {
      return NextResponse.json({ error: 'Invalid cycle. Must be "monthly" or "annual".' }, { status: 400 });
    }

    const priceId = PRICE_IDS[plan][cycle];
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price for ${plan} ${cycle}.` },
        { status: 503 }
      );
    }

    const metadata = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
    const billingState = getBillingState(metadata);
    const trialAlreadyUsed =
      metadata.trialStatus === 'expired' || metadata.trialStatus === 'converted';
    const stripeCustomerId =
      typeof metadata?.stripeCustomerId === 'string' ? metadata.stripeCustomerId : undefined;

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeSecretKey);

    const session = await withTimeout(
      'stripe.checkout.sessions.create',
      stripe.checkout.sessions.create({
        ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/settings/billing?success=true&plan=${plan}`,
        cancel_url: `${appUrl}/settings/billing?canceled=true`,
        allow_promotion_codes: true,
        client_reference_id: userId,
        payment_method_collection: 'always',
        subscription_data: {
          ...buildTrialConfig(billingState.trialEndsAt, billingState.paymentAdded, trialAlreadyUsed),
          metadata: {
            clerkUserId: userId,
            plan,
            cycle,
          },
        },
        metadata: {
          clerkUserId: userId,
          plan,
          cycle,
        },
      })
    );

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe checkout URL was not returned.' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/checkout] failed', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to start Stripe checkout.',
      },
      { status: 502 }
    );
  }
}
