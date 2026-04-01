import { type NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import stripe from '@/lib/stripe';

export const dynamic = 'force-dynamic';

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

    // 1. Try existing subscription ID
    if (stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      } catch {
        subscription = null;
      }
    }

    // 2. Try by customer ID
    if (!subscription && stripeCustomerId) {
      const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        limit: 5,
        status: 'all',
      });
      // Prefer active/trialing, fallback to most recent
      subscription =
        subs.data.find((s) => s.status === 'active' || s.status === 'trialing') ??
        subs.data[0] ??
        null;
    }

    // 3. Search latest checkout sessions by client_reference_id (userId)
    if (!subscription) {
      const sessions = await stripe.checkout.sessions.list({
        limit: 10,
      });
      const session = sessions.data.find(
        (s) => s.client_reference_id === userId && s.subscription
      );
      if (session?.subscription) {
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
        try {
          subscription = await stripe.subscriptions.retrieve(subId);
        } catch {
          subscription = null;
        }
      }
    }

    if (!subscription) {
      return NextResponse.json({ synced: false, message: 'No subscription found in Stripe' });
    }

    // Resolve plan
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

    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        plan,
        subscriptionTier: plan,
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: resolvedCustomerId,
        paymentAdded: Boolean(
          subscription.default_payment_method || resolvedCustomerId
        ),
        trialActive: subscription.status === 'trialing',
        trialStatus:
          subscription.status === 'trialing'
            ? 'active'
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
    });
  } catch (error) {
    console.error('[billing/sync] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
