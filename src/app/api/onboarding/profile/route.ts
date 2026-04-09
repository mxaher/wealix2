import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/server-auth';

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

  // Build partial update — only include fields present in the request body
  const data: Record<string, unknown> = { onboardingDone: true };

  if (typeof name === 'string' && name.trim()) data.name = name.trim();
  if (typeof phone === 'string') data.phone = phone.trim() || null;
  if (typeof notificationChannel === 'string') data.notificationChannel = notificationChannel;
  if (typeof monthlyIncome === 'number' && monthlyIncome >= 0) data.monthlyIncome = monthlyIncome;
  if (typeof riskTolerance === 'string') data.riskTolerance = riskTolerance;
  if (Array.isArray(preferredMarkets)) data.preferredMarkets = JSON.stringify(preferredMarkets);
  if (typeof retirementAge === 'number') data.retirementAge = Math.round(retirementAge);
  if (typeof currentAge === 'number') data.currentAge = Math.round(currentAge);
  if (typeof retirementGoal === 'string') data.retirementGoal = retirementGoal;
  if (onboardingSkipped === true) {
    data.onboardingSkipped = true;
    data.onboardingDone = true;
  }

  await db.user.upsert({
    where: { id: userId },
    update: data,
    create: {
      id: userId,
      email: typeof body.email === 'string' ? body.email : `${userId}@unknown.local`,
      ...data,
    },
  });

  return NextResponse.json({ success: true });
}
