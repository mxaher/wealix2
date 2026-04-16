/**
 * Bug #12 fix: Stripe webhook signature verification utility.
 *
 * The /api/webhooks/stripe route is a public route (bypasses Clerk auth by design).
 * Without signature verification, ANY actor can POST fake payment events to manipulate
 * subscription tiers, trigger false payment confirmations, etc.
 *
 * This utility MUST be called at the top of every Stripe webhook handler
 * BEFORE any business logic executes.
 *
 * USAGE:
 * @example
 * // src/app/api/webhooks/stripe/route.ts
 * import { verifyStripeWebhookSignature } from '@/lib/stripe-webhook-guard';
 *
 * export async function POST(request: NextRequest) {
 *   const { event, errorResponse } = await verifyStripeWebhookSignature(request);
 *   if (errorResponse) return errorResponse; // Reject unverified events immediately
 *
 *   switch (event.type) {
 *     case 'checkout.session.completed': ...
 *   }
 * }
 */
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set.');
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2025-03-31.basil',
      typescript: true,
    });
  }
  return _stripe;
}

type WebhookVerificationResult =
  | { event: Stripe.Event; errorResponse: null }
  | { event: null; errorResponse: NextResponse<{ error: string }> };

/**
 * Reads the raw request body and verifies the Stripe-Signature header.
 * Returns the verified Stripe.Event on success, or an error NextResponse on failure.
 *
 * Fails closed: any missing secret, missing signature, or invalid signature
 * returns a 400 response before any event data is processed.
 */
export async function verifyStripeWebhookSignature(
  request: NextRequest
): Promise<WebhookVerificationResult> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured.');
    return {
      event: null,
      errorResponse: NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      ),
    };
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return {
      event: null,
      errorResponse: NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      ),
    };
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return {
      event: null,
      errorResponse: NextResponse.json(
        { error: 'Failed to read request body' },
        { status: 400 }
      ),
    };
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    return { event, errorResponse: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signature verification failed';
    console.error('[stripe-webhook] Signature verification failed:', message);
    return {
      event: null,
      errorResponse: NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      ),
    };
  }
}
