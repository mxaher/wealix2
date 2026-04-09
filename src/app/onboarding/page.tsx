import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import OnboardingClient from '@/app/onboarding/OnboardingClient';
import { getOnboardingDoneCookieOptions, ONBOARDING_DONE_COOKIE } from '@/lib/onboarding-guard';

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { onboardingDone: true },
  });

  // Already completed onboarding — go back to app
  if (dbUser?.onboardingDone) {
    const cookieStore = await cookies();
    cookieStore.set(ONBOARDING_DONE_COOKIE, '1', getOnboardingDoneCookieOptions());
    redirect('/app');
  }

  return <OnboardingClient />;
}
