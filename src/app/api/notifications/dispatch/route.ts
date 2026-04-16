import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserPrimaryEmail, requireAuthenticatedUser } from '@/lib/server-auth';
import { sendBudgetPlanningMessage } from '@/lib/sentdm';

const dispatchSchema = z.object({
  type: z.enum(['planning_update', 'status_change', 'reminder', 'budget_alert']),
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(240),
  route: z.enum(['/budget-planning', '/portfolio', '/fire', '/reports']),
  phoneNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
  preferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
    whatsapp: z.boolean(),
    priceAlerts: z.boolean(),
    budgetAlerts: z.boolean(),
    planningUpdates: z.boolean(),
    statusChanges: z.boolean(),
    reminders: z.boolean(),
    weeklyDigest: z.boolean(),
    preferredChannel: z.enum(['push', 'email', 'sms', 'whatsapp']),
    phoneNumber: z.string(),
    useSamePhoneNumberForWhatsApp: z.boolean(),
    whatsappNumber: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth.error) {
    return auth.error;
  }

  const payload = dispatchSchema.safeParse(await request.json());
  if (!payload.success || !auth.userId) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const email = await getUserPrimaryEmail(auth.userId).catch(() => null);
  const result = await sendBudgetPlanningMessage({
    userId: auth.userId,
    type: payload.data.type,
    title: payload.data.title,
    body: payload.data.body,
    route: payload.data.route,
    email,
    phoneNumber: payload.data.phoneNumber ?? payload.data.preferences.phoneNumber,
    whatsappNumber: payload.data.whatsappNumber ?? payload.data.preferences.whatsappNumber,
    preferences: payload.data.preferences,
  });

  return NextResponse.json(result);
}
