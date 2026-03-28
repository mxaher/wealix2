import { type NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const { default: StripeSDK } = await import('stripe');
  const stripe = new StripeSDK(process.env.STRIPE_SECRET_KEY);

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // constructEventAsync uses Web Crypto — compatible with Cloudflare Workers
    event = await stripe.webhooks.constructEventAsync(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const clerk = await clerkClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerkUserId;
      const plan = session.metadata?.plan;

      if (clerkUserId && (plan === 'core' || plan === 'pro')) {
        await clerk.users.updateUserMetadata(clerkUserId, {
          publicMetadata: {
            subscriptionTier: plan,
            subscriptionStatus: 'active',
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          },
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const clerkUserId = sub.metadata?.clerkUserId;
      if (clerkUserId) {
        const status: string = sub.status === 'active' ? 'active' : sub.status;
        await clerk.users.updateUserMetadata(clerkUserId, {
          publicMetadata: { subscriptionStatus: status },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const clerkUserId = sub.metadata?.clerkUserId;
      if (clerkUserId) {
        await clerk.users.updateUserMetadata(clerkUserId, {
          publicMetadata: {
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
          },
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId);
        if (!('deleted' in customer)) {
          const clerkUserId = customer.metadata?.clerkUserId;
          if (clerkUserId) {
            await clerk.users.updateUserMetadata(clerkUserId, {
              publicMetadata: { subscriptionStatus: 'past_due' },
            });
          }
        }
      }
      break;
    }

    default:
      // Unhandled event type — return 200 to acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}
