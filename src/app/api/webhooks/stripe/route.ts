import { type NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import type Stripe from 'stripe';
import { getD1Database } from '@/lib/d1';
import { getRequiredEnv } from '@/lib/env';
import { getCycleFromPriceId, getPlanFromPriceId } from '@/lib/stripe-billing';

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
    const plan = getPlanFromPriceId(priceId);
    if (plan) {
      return plan;
    }
  }
  return getPlanFromMetadata(subscription);
}

async function ensureWebhookEventsTable() {
  const db = getD1Database();
  if (!db) {
    return null;
  }

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      event_id TEXT PRIMARY KEY,
      processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  return db;
}

async function markWebhookEventProcessed(eventId: string, dbOverride?: Awaited<ReturnType<typeof ensureWebhookEventsTable>>) {
  const db = dbOverride ?? await ensureWebhookEventsTable();
  if (!db) {
    return { duplicate: false };
  }

  const existing = await db
    .prepare('SELECT event_id FROM stripe_webhook_events WHERE event_id = ? LIMIT 1')
    .bind(eventId)
    .first<{ event_id: string }>();

  if (existing?.event_id) {
    return { duplicate: true };
  }

  await db
    .prepare('INSERT INTO stripe_webhook_events (event_id) VALUES (?)')
    .bind(eventId)
    .run();

  return { duplicate: false };
}

function getMissingStripeSignatureResponse(signature: string | null) {
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  return null;
}

async function updateUserFromSubscription(
  clerkUserId: string,
  subscription: Stripe.Subscription,
  fallbackCustomerId?: string | null
) {
  const clerk  = await clerkClient();
  const plan   = getPlanFromSubscription(subscription) ?? 'core';
  const cycle =
    subscription.metadata?.cycle === 'annual' || subscription.metadata?.cycle === 'monthly'
      ? subscription.metadata.cycle
      : (getCycleFromPriceId(subscription.items.data[0]?.price.id ?? null) ?? 'monthly');
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
      cycle,
      subscriptionCycle: cycle,
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
    const signatureError = getMissingStripeSignatureResponse(sig);
    if (signatureError) {
      return signatureError;
    }
    const signature = sig as string;

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error) {
      console.warn('[stripe/webhook] signature verification failed', error);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    const replayCheck = await markWebhookEventProcessed(event.id);
    if (replayCheck.duplicate) {
      return NextResponse.json({ received: true, duplicate: true });
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
          try {
            const expanded = await stripe.subscriptions.retrieve(subscription.id, {
              expand: ['default_payment_method'],
            });
            await updateUserFromSubscription(clerkUserId, expanded);
          } catch (error) {
            console.error('[stripe/webhook] failed to process subscription.updated', error);
          }
        }
        break;
      }

      // ── Trial ending soon warning ────────────────────────────────────────────
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkUserId  = subscription.metadata?.clerkUserId;
        if (clerkUserId) {
          try {
            const clerk = await clerkClient();
            await clerk.users.updateUserMetadata(clerkUserId, {
              publicMetadata: { trialWillEndSoon: true },
            });
          } catch (error) {
            console.error('[stripe/webhook] failed to process trial_will_end', error);
          }
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
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const clerkUserId  = subscription.metadata?.clerkUserId;
            if (clerkUserId) {
              const clerk = await clerkClient();
              await clerk.users.updateUserMetadata(clerkUserId, {
                publicMetadata: { subscriptionStatus: 'past_due', paymentAdded: true },
              });
            }
          } catch (error) {
            console.error('[stripe/webhook] failed to process invoice.payment_failed', error);
          }
        }
        break;
      }

      // ── Subscription cancelled ───────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkUserId  = subscription.metadata?.clerkUserId;
        if (clerkUserId) {
          try {
            const clerk = await clerkClient();
            const plan  = getPlanFromSubscription(subscription);
            await clerk.users.updateUserMetadata(clerkUserId, {
              publicMetadata: {
                ...(plan ? { plan, subscriptionTier: plan, trialPlan: plan } : {}),
                subscriptionStatus: 'canceled',
                stripeSubscriptionId: null,
                cycle: null,
                subscriptionCycle: null,
                paymentAdded: false,
                trialActive: false,
                trialStatus: 'expired',
                trialWillEndSoon: false,
              },
            });
          } catch (error) {
            console.error('[stripe/webhook] failed to process subscription.deleted', error);
          }
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
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
