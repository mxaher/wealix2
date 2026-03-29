import { type NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server-auth';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(_req: NextRequest) {
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

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(authResult.userId);
  const customerId = user.privateMetadata?.stripeCustomerId as string | undefined;

  if (!customerId) {
    return NextResponse.json(
      { error: 'No Stripe customer found. Please subscribe first.' },
      { status: 404 }
    );
  }

  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wealix.app';

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
