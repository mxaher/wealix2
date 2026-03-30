import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
  core: {
    monthly: process.env.STRIPE_PRICE_CORE_MONTHLY,
    annual: process.env.STRIPE_PRICE_CORE_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
};

function getPublicMetadataValue(
  sessionClaims: Awaited<ReturnType<typeof auth>>['sessionClaims'],
  key: string
) {
  const publicMetadata = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  return publicMetadata[key];
}

async function withTimeout<T>(label: string, action: Promise<T>, timeoutMs = 12_000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([action, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables.' },
      { status: 503 }
    );
  }

  const body = (await req.json()) as { plan?: string; cycle?: string };
  const { plan, cycle } = body;

  if (!plan || !['core', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan. Must be "core" or "pro".' }, { status: 400 });
  }
  if (!cycle || !['monthly', 'annual'].includes(cycle)) {
    return NextResponse.json({ error: 'Invalid cycle. Must be "monthly" or "annual".' }, { status: 400 });
  }

  const priceId = PRICE_IDS[plan]?.[cycle];
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID not configured. Add STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()} to environment variables.` },
      { status: 503 }
    );
  }

  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const customerId =
    typeof getPublicMetadataValue(sessionClaims, 'stripeCustomerId') === 'string'
      ? (getPublicMetadataValue(sessionClaims, 'stripeCustomerId') as string)
      : undefined;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wealix.app';
  const trialActive =
    getPublicMetadataValue(sessionClaims, 'trialStatus') === 'active' &&
    typeof getPublicMetadataValue(sessionClaims, 'trialEndsAt') === 'string' &&
    new Date(getPublicMetadataValue(sessionClaims, 'trialEndsAt') as string).getTime() > Date.now();

  try {
    const session = await withTimeout(
      'stripe.checkout.sessions.create',
      stripe.checkout.sessions.create({
        ...(customerId ? { customer: customerId } : {}),
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/settings/billing?success=true&plan=${plan}`,
        cancel_url: `${appUrl}/settings/billing?canceled=true`,
        allow_promotion_codes: true,
        client_reference_id: userId,
        ...(!trialActive && {
          payment_method_collection: 'if_required' as const,
          subscription_data: {
            trial_period_days: 14,
            metadata: { clerkUserId: userId, plan },
          },
        }),
        ...(trialActive && {
          subscription_data: {
            metadata: { clerkUserId: userId, plan },
          },
        }),
        metadata: { clerkUserId: userId, plan, cycle },
      })
    );

    if (!session.url) {
      console.error('[billing/checkout] Stripe session created without URL', { userId, plan, cycle });
      return NextResponse.json({ error: 'Stripe checkout URL was not returned.' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/checkout] failed', {
      userId,
      plan,
      cycle,
      hasCustomerId: Boolean(customerId),
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Unable to start Stripe checkout: ${error.message}`
            : 'Unable to start Stripe checkout.',
      },
      { status: 502 }
    );
  }
}
