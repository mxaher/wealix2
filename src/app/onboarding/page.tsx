import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import OnboardingClient from '@/app/onboarding/OnboardingClient';
import {
  getOnboardingDoneCookieOptions,
  hasCompletedOnboardingCookie,
  ONBOARDING_DONE_COOKIE,
} from '@/lib/onboarding-guard';

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  const cookieStore = await cookies();
  const onboardingDoneCookie = cookieStore.get(ONBOARDING_DONE_COOKIE)?.value;

  if (hasCompletedOnboardingCookie(onboardingDoneCookie)) {
    redirect('/app');
  }

  try {
    const dbUser = await db.user.findUnique({
      where: { id: userId },
      select: { onboardingDone: true },
    });

    // Already completed onboarding — go back to app
    if (dbUser?.onboardingDone) {
      cookieStore.set(ONBOARDING_DONE_COOKIE, '1', getOnboardingDoneCookieOptions());
      redirect('/app');
    }
  } catch (error) {
    console.error('[app/onboarding/page] onboarding lookup failed, rendering onboarding client', error);
  }

  return <OnboardingClient />;
}
