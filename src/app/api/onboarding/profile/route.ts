import { NextResponse } from 'next/server';
import { getOnboardingDoneCookieOptions, ONBOARDING_DONE_COOKIE } from '@/lib/onboarding-guard';
import { getOnboardingProfile, saveOnboardingProfile } from '@/lib/onboarding-profile-storage';
import { requireAuthenticatedUser } from '@/lib/server-auth';

export async function GET() {
  const { userId, error } = await requireAuthenticatedUser();
  if (error || !userId) return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOnboardingProfile(userId);
  return NextResponse.json({ profile: profile ?? null });
}

export async function POST(request: Request) {
  const { userId, error } = await requireAuthenticatedUser();
  if (error || !userId) return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const {
    name,
    phone,
    notificationChannel,
    monthlyIncome,
    riskTolerance,
    preferredMarkets,
    retirementAge,
    currentAge,
    retirementGoal,
    onboardingSkipped,
  } = body;

  await saveOnboardingProfile(userId, {
    email: typeof body.email === 'string' ? body.email : null,
    name: typeof name === 'string' && name.trim() ? name.trim() : null,
    phone: typeof phone === 'string' ? phone.trim() || null : null,
    notificationChannel: typeof notificationChannel === 'string' ? notificationChannel : null,
    monthlyIncome: typeof monthlyIncome === 'number' && monthlyIncome >= 0 ? monthlyIncome : null,
    riskTolerance: typeof riskTolerance === 'string' ? riskTolerance : null,
    preferredMarkets: Array.isArray(preferredMarkets)
      ? preferredMarkets.filter((item): item is string => typeof item === 'string')
      : null,
    retirementAge: typeof retirementAge === 'number' ? Math.round(retirementAge) : null,
    currentAge: typeof currentAge === 'number' ? Math.round(currentAge) : null,
    retirementGoal: typeof retirementGoal === 'string' ? retirementGoal : null,
    onboardingDone: true,
    onboardingSkipped: onboardingSkipped === true,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(ONBOARDING_DONE_COOKIE, '1', getOnboardingDoneCookieOptions());
  return response;
}
