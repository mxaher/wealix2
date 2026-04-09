import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import AppEntryClient from './AppEntryClient';

/**
 * Server Component entry point for /app.
 * Checks if the authenticated user has completed onboarding.
 * If not, redirects to /onboarding.
 * If yes, renders the client shell which then navigates to the correct page.
 */
export default async function AppEntryPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { onboardingDone: true },
  });

  // New user or incomplete onboarding — send to wizard
  if (!dbUser?.onboardingDone) {
    redirect('/onboarding');
  }

  // Onboarding complete — render the client entry shell
  return <AppEntryClient />;
}
