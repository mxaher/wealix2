// BUG #011 FIX — Stripe webhook signature verification
import { NextRequest, NextResponse } from 'next/server';
import { verifyStripeWebhookSignature } from '@/lib/stripe-webhook-guard';

export async function POST(req: NextRequest) {
  const verification = await verifyStripeWebhookSignature(req);
  if (verification.errorResponse) {
    return verification.errorResponse;
  }
  const { event } = verification;

  switch (event.type) {
    case 'invoice.payment_succeeded':
      console.log('[Stripe] Payment succeeded:', event.data.object);
      break;
    case 'customer.subscription.deleted':
      console.log('[Stripe] Subscription cancelled:', event.data.object);
      break;
    default:
      console.log(`[Stripe] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
