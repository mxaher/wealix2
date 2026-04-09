import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
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
    redirect('/app');
  }

  return <OnboardingClient />;
}
