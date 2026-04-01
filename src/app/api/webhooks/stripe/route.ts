import { type NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import type Stripe from 'stripe';
import { getRequiredEnv } from '@/lib/env';

const CORE_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_CORE_MONTHLY,
  process.env.STRIPE_PRICE_CORE_ANNUAL,
].filter(Boolean));

const PRO_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_PRO_MONTHLY,
  process.env.STRIPE_PRICE_PRO_ANNUAL,
].filter(Boolean));

function toIsoDate(unixSeconds: number | null | undefined) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function getPlanFromMetadata(
  source: { metadata?: Record<string, string | null> } | null | undefined
): 'core' | 'pro' | null {
  const plan = source?.metadata?.plan;
  return plan === 'core' || plan === 'pro' ? plan : null;
}

function getPlanFromSubscription(subscription: Stripe.Subscription): 'core' | 'pro' | null {
  for (const item of subscription.items.data) {
    const priceId = item.price.id;
    if (PRO_PRICE_IDS.has(priceId))  return 'pro';
    if (CORE_PRICE_IDS.has(priceId)) return 'core';
  }
  return getPlanFromMetadata(subscription);
}

async function updateUserFromSubscription(
  clerkUserId: string,
  subscription: Stripe.Subscription,
  fallbackCustomerId?: string | null
) {
  const clerk  = await clerkClient();
  const plan   = getPlanFromSubscription(subscription) ?? 'core';
  const trialEnd = toIsoDate(subscription.trial_end);

  // paymentAdded: true when there is a default PM on the subscription
  const paymentAdded = Boolean(
    subscription.default_payment_method
  );

  // When a paid subscription is active, it is always considered "payment added"
  const effectivePaymentAdded = paymentAdded || subscription.status === 'active';

  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      plan,
      subscriptionTier: plan,
      subscriptionStatus: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as { id: string } | null)?.id ?? fallbackCustomerId ?? null,
      paymentAdded: effectivePaymentAdded,
      trialActive: subscription.status === 'trialing' && !effectivePaymentAdded,
      trialStatus:
        subscription.status === 'trialing'
          ? effectivePaymentAdded ? 'converted' : 'active'
          : subscription.status === 'active'
          ? 'converted'
          : 'inactive',
      trialPlan: plan,
      trialEnd,
      trialEndsAt: trialEnd,
      trialWillEndSoon: false,
    },
    privateMetadata: {
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as { id: string } | null)?.id ?? fallbackCustomerId ?? null,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey    = getRequiredEnv('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = getRequiredEnv('STRIPE_WEBHOOK_SECRET');

    const { default: StripeSDK } = await import('stripe');
    const stripe = new StripeSDK(stripeSecretKey);

    const body = await req.text();
    const sig  = req.headers.get('stripe-signature');
    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, stripeWebhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${message}` },
        { status: 400 }
      );
    }

    switch (event.type) {

      // ── Checkout completed (subscription mode) ──────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = session.metadata?.clerkUserId;
        const stripeCustomerId =
          typeof session.customer === 'string'
            ? session.customer
            : (session.customer as { id: string } | null)?.id ?? null;

        if (clerkUserId && session.mode === 'subscription' && typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['default_payment_method'],
          });

          // Patch subscription metadata if missing (belt-and-suspenders)
          if (!subscription.metadata?.clerkUserId) {
            await stripe.subscriptions.update(subscription.id, {
              metadata: {
                clerkUserId,
                plan: session.metadata?.plan ?? 'core',
                cycle: session.metadata?.cycle ?? 'monthly',
              },
            });
          }

          await updateUserFromSubscription(clerkUserId, subscription, stripeCustomerId);
        }
        break;
      }

      // ── Setup checkout completed (add payment method to existing sub) ────────
      case 'checkout.session.async_payment_succeeded':
      case 'setup_intent.succeeded': {
        // handled via billing/sync API on redirect — no-op here
        break;
      }

      // ── Subscription updated (payment method added, trial converted, etc.) ──
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkUserId  = subscription.metadata?.clerkUserId;
        if (clerkUserId) {
          const expanded = await stripe.subscriptions.retrieve(subscription.id, {
            expand: ['default_payment_method'],
          });
          await updateUserFromSubscription(clerkUserId, expanded);
        }
        break;
      }

      // ── Trial ending soon warning ────────────────────────────────────────────
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkUserId  = subscription.metadata?.clerkUserId;
        if (clerkUserId) {
          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(clerkUserId, {
            publicMetadata: { trialWillEndSoon: true },
          });
        }
        break;
      }

      // ── Payment succeeded (trial → active conversion) ────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : (invoice.subscription as { id: string } | null)?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['default_payment_method'],
          });
          const clerkUserId = subscription.metadata?.clerkUserId;
          if (clerkUserId) {
            await updateUserFromSubscription(clerkUserId, subscription);
          }
        }
        break;
      }

      // ── Payment failed ───────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : (invoice.subscription as { id: string } | null)?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const clerkUserId  = subscription.metadata?.clerkUserId;
          if (clerkUserId) {
            const clerk = await clerkClient();
            await clerk.users.updateUserMetadata(clerkUserId, {
              publicMetadata: { subscriptionStatus: 'past_due', paymentAdded: true },
            });
          }
        }
        break;
      }

      // ── Subscription cancelled ───────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkUserId  = subscription.metadata?.clerkUserId;
        if (clerkUserId) {
          const clerk = await clerkClient();
          const plan  = getPlanFromSubscription(subscription);
          await clerk.users.updateUserMetadata(clerkUserId, {
            publicMetadata: {
              ...(plan ? { plan, subscriptionTier: plan, trialPlan: plan } : {}),
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
              paymentAdded: false,
              trialActive: false,
              trialStatus: 'expired',
              trialWillEndSoon: false,
            },
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe/webhook] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
