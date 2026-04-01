import { type NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import stripe from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// Helper — resolve clerkUserId from subscription metadata or checkout session
async function resolveClerkUserId(
  subscription: import('stripe').Stripe.Subscription,
  fallbackUserId: string
): Promise<string> {
  if (subscription.metadata?.clerkUserId) {
    return subscription.metadata.clerkUserId;
  }
  return fallbackUserId;
}

export async function POST(_req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metadata = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
    const stripeCustomerId =
      typeof metadata?.stripeCustomerId === 'string' ? metadata.stripeCustomerId : null;
    const stripeSubscriptionId =
      typeof metadata?.stripeSubscriptionId === 'string' ? metadata.stripeSubscriptionId : null;

    let subscription: import('stripe').Stripe.Subscription | null = null;

    // ── Pass 1: known subscription ID
    if (stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
          expand: ['default_payment_method'],
        });
        if (sub.status !== 'canceled') subscription = sub;
      } catch {
        subscription = null;
      }
    }

    // ── Pass 2: look up by customer ID
    if (!subscription && stripeCustomerId) {
      const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        limit: 10,
        status: 'all',
        expand: ['data.default_payment_method'],
      });
      subscription =
        subs.data.find((s) => s.status === 'active') ??
        subs.data.find((s) => s.status === 'trialing') ??
        subs.data.find((s) => s.status !== 'canceled') ??
        null;
    }

    // ── Pass 3: search recent checkout sessions by client_reference_id
    if (!subscription) {
      const sessions = await stripe.checkout.sessions.list({ limit: 20 });
      const session = sessions.data.find(
        (s) => s.client_reference_id === userId && s.subscription
      );
      if (session?.subscription) {
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as { id: string }).id;
        try {
          subscription = await stripe.subscriptions.retrieve(subId, {
            expand: ['default_payment_method'],
          });
        } catch {
          subscription = null;
        }
      }
    }

    // ── Pass 4: handle setup-mode checkout (payment method collection for existing sub)
    if (!subscription) {
      // Check if there is a recently completed setup session for this user
      const setupSessions = await stripe.checkout.sessions.list({ limit: 20 });
      const setupSession = setupSessions.data.find(
        (s) =>
          s.client_reference_id === userId &&
          s.mode === 'setup' &&
          s.status === 'complete' &&
          s.metadata?.subscriptionId
      );

      if (setupSession?.metadata?.subscriptionId) {
        try {
          subscription = await stripe.subscriptions.retrieve(
            setupSession.metadata.subscriptionId,
            { expand: ['default_payment_method'] }
          );

          // Attach the payment method from the SetupIntent to the subscription
          if (setupSession.setup_intent) {
            const siId =
              typeof setupSession.setup_intent === 'string'
                ? setupSession.setup_intent
                : (setupSession.setup_intent as { id: string }).id;

            const setupIntent = await stripe.setupIntents.retrieve(siId);
            const pmId =
              typeof setupIntent.payment_method === 'string'
                ? setupIntent.payment_method
                : (setupIntent.payment_method as { id: string } | null)?.id ?? null;

            if (pmId && !subscription.default_payment_method) {
              await stripe.subscriptions.update(subscription.id, {
                default_payment_method: pmId,
                metadata: {
                  clerkUserId: userId,
                  plan: setupSession.metadata?.plan ?? 'core',
                  cycle: setupSession.metadata?.cycle ?? 'monthly',
                },
              });
              // Re-fetch with updated data
              subscription = await stripe.subscriptions.retrieve(subscription.id, {
                expand: ['default_payment_method'],
              });
            }
          }
        } catch {
          subscription = null;
        }
      }
    }

    if (!subscription) {
      return NextResponse.json({ synced: false, message: 'No subscription found in Stripe' });
    }

    // ── Resolve plan: metadata → price ID lookup → fallback 'core'
    const metaPlan = subscription.metadata?.plan;
    const plan: 'core' | 'pro' =
      metaPlan === 'core' || metaPlan === 'pro' ? metaPlan : 'core';

    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    const resolvedCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as { id: string } | null)?.id ?? null;

    // paymentAdded = true if subscription has a default PM OR customer has one on file
    let paymentAdded = Boolean(subscription.default_payment_method);
    if (!paymentAdded && resolvedCustomerId) {
      try {
        const pms = await stripe.customers.listPaymentMethods(resolvedCustomerId, { limit: 1 });
        paymentAdded = pms.data.length > 0;
      } catch {
        paymentAdded = false;
      }
    }

    // ── Patch subscription metadata if clerkUserId is missing (root cause fix)
    if (!subscription.metadata?.clerkUserId) {
      try {
        await stripe.subscriptions.update(subscription.id, {
          metadata: { clerkUserId: userId, plan, cycle: subscription.metadata?.cycle ?? 'monthly' },
        });
      } catch {
        // Non-fatal
      }
    }

    // ── Update Clerk with resolved billing state
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        plan,
        subscriptionTier: plan,
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: resolvedCustomerId,
        paymentAdded,
        trialActive: subscription.status === 'trialing' && !paymentAdded ? true : false,
        trialStatus:
          subscription.status === 'trialing'
            ? paymentAdded ? 'converted' : 'active'
            : subscription.status === 'active'
            ? 'converted'
            : 'inactive',
        trialPlan: plan,
        trialEnd,
        trialEndsAt: trialEnd,
        trialWillEndSoon: false,
      },
      privateMetadata: {
        stripeCustomerId: resolvedCustomerId,
      },
    });

    return NextResponse.json({
      synced: true,
      status: subscription.status,
      plan,
      paymentAdded,
    });
  } catch (error) {
    console.error('[billing/sync] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
