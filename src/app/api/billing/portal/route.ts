import { type NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getPublicEnv, getRequiredEnv } from '@/lib/env';

async function withTimeout<T>(label: string, action: Promise<T>, timeoutMs = 12_000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([action, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function POST(_req: NextRequest) {
  let userId: string | null = null;
  let customerId: string | undefined;

  try {
    const authResult = await auth();
    userId = authResult.userId;
    const sessionClaims = authResult.sessionClaims;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY');
    const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;

    customerId =
      typeof (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)?.stripeCustomerId === 'string'
        ? ((sessionClaims?.publicMetadata as Record<string, unknown>).stripeCustomerId as string)
        : undefined;

    if (!customerId) {
      const clerk = await clerkClient();
      const user = await withTimeout('clerk.users.getUser', clerk.users.getUser(userId));
      customerId =
        (user.privateMetadata?.stripeCustomerId as string | undefined) ||
        (user.publicMetadata?.stripeCustomerId as string | undefined);
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please add a payment method first.' },
        { status: 404 }
      );
    }

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeSecretKey);

    const session = await withTimeout(
      'stripe.billingPortal.sessions.create',
      stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/settings/billing`,
      })
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/portal] failed', {
      userId,
      hasCustomerId: Boolean(customerId),
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Unable to open Stripe billing portal: ${error.message}`
            : 'Unable to open Stripe billing portal.',
      },
      { status: 502 }
    );
  }
}
