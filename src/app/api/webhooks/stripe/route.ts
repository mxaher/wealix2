// BUG #011 FIX — Stripe webhook with full side effects and idempotency
import { NextRequest, NextResponse } from 'next/server';
import { verifyStripeWebhookSignature } from '@/lib/stripe-webhook-guard';
import { clerkClient } from '@clerk/nextjs/server';
import { getD1Database } from '@/lib/d1';

const CLERK_METADATA_KEY = 'stripe_webhook_processed';

/**
 * Idempotency guard: prevents duplicate processing of the same Stripe event.
 * Uses D1 to store processed event IDs with timestamps.
 */
async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  try {
    const db = await getD1Database();
    if (!db) return false;
    const stmt = db.prepare('SELECT 1 FROM stripe_webhook_events WHERE event_id = ? LIMIT 1').bind(eventId);
    const result = await stmt.first<{ 1: number }>();
    return !!result;
  } catch {
    return false;
  }
}

/**
 * Mark an event as processed in D1 for idempotency tracking.
 */
async function markEventAsProcessed(
  eventId: string,
  eventType: string,
  customerId: string | null,
  subscriptionId: string | null
): Promise<void> {
  try {
    const db = await getD1Database();
    if (!db) return;
    await db
      .prepare(
        `INSERT OR REPLACE INTO stripe_webhook_events (event_id, event_type, customer_id, subscription_id, processed_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(eventId, eventType, customerId, subscriptionId, Date.now())
      .run();
  } catch (error) {
    console.error('[stripe-webhook] Failed to record event for idempotency:', error);
  }
}

/**
 * Syncs Stripe subscription state to Clerk metadata.
 * Extracted logic from /api/billing/sync for webhook use.
 */
async function syncSubscriptionToClerk(
  userId: string,
  subscription: import('stripe').Stripe.Subscription
): Promise<void> {
  const clerk = await clerkClient();

  const currentPriceId = subscription.items.data[0]?.price.id ?? null;
  const metaPlan = subscription.metadata?.plan;
  const plan: 'core' | 'pro' =
    metaPlan === 'core' || metaPlan === 'pro' ? metaPlan : 'core';
  const cycle =
    subscription.metadata?.cycle === 'annual' || subscription.metadata?.cycle === 'monthly'
      ? subscription.metadata.cycle
      : 'monthly';

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const resolvedCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as { id: string } | null)?.id ?? null;

  let paymentAdded = Boolean(subscription.default_payment_method);
  if (!paymentAdded && resolvedCustomerId) {
    try {
      const stripe = await import('@/lib/stripe').then((m) => m.getStripe());
      const pms = await stripe.customers.listPaymentMethods(resolvedCustomerId, { limit: 1 });
      paymentAdded = pms.data.length > 0;
    } catch {
      paymentAdded = false;
    }
  }

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: {
      plan,
      subscriptionTier: plan,
      subscriptionStatus: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: resolvedCustomerId,
      cycle,
      subscriptionCycle: cycle,
      paymentAdded,
      trialActive: subscription.status === 'trialing' && !paymentAdded,
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
}

/**
 * Extracts Clerk user ID from Stripe subscription metadata or customer lookup.
 */
async function extractUserIdFromSubscription(
  subscription: import('stripe').Stripe.Subscription
): Promise<string | null> {
  // Priority 1: clerkUserId in subscription metadata
  if (subscription.metadata?.clerkUserId) {
    return subscription.metadata.clerkUserId;
  }

  // Priority 2: Lookup via customer ID from Clerk
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as { id: string } | null)?.id;

  if (!customerId) return null;

  try {
    const clerk = await clerkClient();
    const response = await clerk.users.getUserList({ limit: 100 });
    const users = response.data || [];
    for (const user of users) {
      const meta = user.publicMetadata || user.privateMetadata;
      if (
        (meta?.stripeCustomerId as string | undefined) === customerId ||
        (meta?.stripeCustomerId as string | undefined) === customerId
      ) {
        return user.id;
      }
    }
  } catch {
    // Non-fatal — just can't resolve user
  }

  return null;
}

export async function POST(req: NextRequest) {
  const verification = await verifyStripeWebhookSignature(req);
  if (verification.errorResponse) {
    return verification.errorResponse;
  }
  const { event } = verification;

  // Idempotency guard — skip if already processed
  if (await isEventAlreadyProcessed(event.id)) {
    console.log('[stripe-webhook] Skipping already-processed event:', event.id);
    return NextResponse.json({ received: true, skipped: 'already_processed' }, { status: 200 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as { id: string } | null)?.id;

        if (subscriptionId) {
          const stripe = await import('@/lib/stripe').then((m) => m.getStripe());
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['default_payment_method'],
          });

          const userId = session.client_reference_id || (await extractUserIdFromSubscription(subscription));
          if (userId) {
            await syncSubscriptionToClerk(userId, subscription);
            console.log('[stripe-webhook] checkout.session.completed: synced user', userId);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as import('stripe').Stripe.Subscription;
        const userId = await extractUserIdFromSubscription(subscription);
        if (userId) {
          await syncSubscriptionToClerk(userId, subscription);
          console.log('[stripe-webhook] customer.subscription.updated: synced user', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as import('stripe').Stripe.Subscription;
        const clerk = await clerkClient();
        const userId = await extractUserIdFromSubscription(subscription);

        if (userId) {
          await clerk.users.updateUserMetadata(userId, {
            publicMetadata: {
              subscriptionStatus: 'canceled',
              subscriptionTier: 'none',
              plan: 'none',
              trialActive: false,
              trialStatus: 'inactive',
            },
            privateMetadata: {
              stripeSubscriptionId: null,
            },
          });
          console.log('[stripe-webhook] customer.subscription.deleted: cleared billing for user', userId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
        if (customerId) {
          // Mark payment as added for this customer
          const clerk = await clerkClient();
          const response = await clerk.users.getUserList({ limit: 100 });
          const users = response.data || [];
          for (const user of users) {
            const meta = user.publicMetadata || user.privateMetadata;
            if ((meta?.stripeCustomerId as string | undefined) === customerId) {
              await clerk.users.updateUserMetadata(user.id, {
                publicMetadata: { paymentAdded: true },
              });
              console.log('[stripe-webhook] invoice.payment_succeeded: marked paymentAdded for user', user.id);
              break;
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
        if (subscriptionId) {
          const stripe = await import('@/lib/stripe').then((m) => m.getStripe());
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = await extractUserIdFromSubscription(subscription);
          if (userId) {
            await clerkClient().then((c) =>
              c.users.updateUserMetadata(userId, {
                publicMetadata: {
                  subscriptionStatus: 'past_due',
                },
              })
            );
            console.log('[stripe-webhook] invoice.payment_failed: marked past_due for user', userId);
          }
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }

    // Record event as processed for idempotency
    const subscriptionId =
      event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted'
        ? (event.data.object as import('stripe').Stripe.Subscription).id
        : null;
    const customerId =
      event.type === 'checkout.session.completed'
        ? (event.data.object as import('stripe').Stripe.Checkout.Session).customer as string | null
        : null;

    await markEventAsProcessed(event.id, event.type, customerId, subscriptionId);

    return NextResponse.json({ received: true, processed: event.type }, { status: 200 });
  } catch (error) {
    console.error('[stripe-webhook] Processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
