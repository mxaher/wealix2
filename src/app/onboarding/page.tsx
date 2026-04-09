import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import OnboardingClient from '@/app/onboarding/OnboardingClient';

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  // Check DB record — if onboarding is already completed, go straight to /app
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { onboardingDone: true },
  });

  if (dbUser?.onboardingDone) {
    // Backfill the cookie for existing users who completed onboarding
    // before the cookie-based gate existed (prevents middleware redirect loop)
    const cookieStore = await cookies();
    cookieStore.set('onboarding_done', '1', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
    redirect('/app');
  }

  return <OnboardingClient />;
}
