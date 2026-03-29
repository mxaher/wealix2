import { type NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { clerkClient } from '@clerk/nextjs/server';

// Stripe price IDs — set these in Cloudflare Pages environment variables
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

export async function POST(req: NextRequest) {
  const authResult = await requireAuthenticatedUser();
  if (authResult.error || !authResult.userId) {
    return authResult.error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables.' },
      { status: 503 }
    );
  }

  const body = await req.json() as { plan?: string; cycle?: string };
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

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(authResult.userId);
  const email = user.emailAddresses[0]?.emailAddress;

  // Reuse existing Stripe customer or create one
  let customerId = user.privateMetadata?.stripeCustomerId as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
      metadata: { clerkUserId: authResult.userId },
    });
    customerId = customer.id;
    await clerk.users.updateUserMetadata(authResult.userId, {
      privateMetadata: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wealix.app';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?success=true&plan=${plan}`,
    cancel_url: `${appUrl}/settings/billing?canceled=true`,
    allow_promotion_codes: true,
    metadata: { clerkUserId: authResult.userId, plan, cycle },
    subscription_data: {
      metadata: { clerkUserId: authResult.userId, plan },
    },
  });

  return NextResponse.json({ url: session.url });
}
