import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getBillingState } from '@/lib/billing-state';
import { getPublicEnv } from '@/lib/env';
import stripe from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const PRICE_IDS: Record<'core' | 'pro', Record<'monthly' | 'annual', string | undefined>> = {
  core: {
    monthly: process.env.STRIPE_PRICE_CORE_MONTHLY,
    annual:  process.env.STRIPE_PRICE_CORE_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual:  process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        { error: `Missing Stripe price env var for ${plan} ${cycle}.` },
        { status: 503 }
      );
    }

    const metadata = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
    const billingState  = getBillingState(metadata);

    const stripeCustomerId =
      typeof metadata?.stripeCustomerId === 'string' ? metadata.stripeCustomerId : undefined;

    const existingSubId =
      typeof metadata?.stripeSubscriptionId === 'string' ? metadata.stripeSubscriptionId : undefined;

    // ── If user already has an active trialing subscription in Stripe, update it
    // instead of creating a duplicate checkout. This handles the case where the
    // trial was started without a payment method and the user is now paying.
    if (existingSubId) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(existingSubId);

        if (existingSub.status === 'trialing' || existingSub.status === 'active') {
          // Create a SetupIntent checkout to collect payment method and
          // attach it to the existing subscription as default_payment_method.
          const setupSession = await stripe.checkout.sessions.create({
            mode: 'setup',
            ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
            setup_intent_data: {
              metadata: { clerkUserId: userId, plan, cycle, subscriptionId: existingSubId },
            },
            success_url: `${appUrl}/settings/billing?success=true&plan=${plan}&setup=true&sub=${existingSubId}`,
            cancel_url:  `${appUrl}/settings/billing?canceled=true`,
            client_reference_id: userId,
            metadata: { clerkUserId: userId, plan, cycle, subscriptionId: existingSubId },
          });

          if (setupSession.url) {
            return NextResponse.json({ url: setupSession.url });
          }
        }
      } catch {
        // Subscription not found or expired — fall through to create new checkout
      }
    }

    // ── Standard subscription checkout (no existing sub, or existing sub is gone)
    // Always collect payment method upfront — no free trial for checkout flow.
    // Trial credit is preserved via trial_end if there are remaining days.
    const trialEnd = billingState.trialEndsAt
      ? Math.floor(new Date(billingState.trialEndsAt).getTime() / 1000)
      : null;
    const nowUnix = Math.floor(Date.now() / 1000);
    const hasRemainingTrial = trialEnd && trialEnd > nowUnix;

    const session = await stripe.checkout.sessions.create({
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=true&plan=${plan}`,
      cancel_url:  `${appUrl}/settings/billing?canceled=true`,
      allow_promotion_codes: true,
      client_reference_id: userId,
      // Always collect payment method immediately — no free pass
      payment_method_collection: 'always',
      subscription_data: {
        // Preserve remaining trial days if they exist, otherwise charge immediately
        ...(hasRemainingTrial ? { trial_end: trialEnd } : {}),
        // Ensure payment method becomes default on subscription
        trial_settings: hasRemainingTrial
          ? { end_behavior: { missing_payment_method: 'cancel' } }
          : undefined,
        metadata: { clerkUserId: userId, plan, cycle },
      },
      metadata: { clerkUserId: userId, plan, cycle },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe checkout URL was not returned.' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/checkout] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to start Stripe checkout.' },
      { status: 502 }
    );
  }
}
