import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/onboarding/backfill-cookie
 *
 * Sets the onboarding_done cookie for users who completed onboarding before
 * the cookie-based middleware gate was introduced.
 * Redirects to /app after setting the cookie.
 *
 * This is a Route Handler (not a Server Component), so cookies CAN be set here.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app'));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app';
  const response = NextResponse.redirect(new URL('/app', appUrl));

  response.cookies.set('onboarding_done', '1', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });

  return response;
}
