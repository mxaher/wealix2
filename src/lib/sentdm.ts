import { getSentDmEnv } from '@/lib/env';
import type { NotificationPreferences } from '@/store/useAppStore';

export type SentDmChannel = 'sms' | 'whatsapp';
export type BudgetPlanningMessageType =
  | 'planning_update'
  | 'status_change'
  | 'reminder'
  | 'budget_alert';

export interface BudgetPlanningMessage {
  userId: string;
  type: BudgetPlanningMessageType;
  title: string;
  body: string;
  route: '/budget-planning' | '/obligations' | '/goals' | '/investments';
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  preferences: NotificationPreferences;
}

function getChannelTargets(message: BudgetPlanningMessage) {
  const targets: Array<{ channel: SentDmChannel; to: string }> = [];
  const resolvedWhatsAppNumber = message.preferences.useSamePhoneNumberForWhatsApp
    ? message.phoneNumber?.trim()
    : message.whatsappNumber?.trim();

  if (message.preferences.sms && message.phoneNumber?.trim()) {
    targets.push({ channel: 'sms', to: message.phoneNumber.trim() });
  }

  if (message.preferences.whatsapp && resolvedWhatsAppNumber) {
    targets.push({ channel: 'whatsapp', to: resolvedWhatsAppNumber });
  }

  return targets;
}

function isMessageTypeEnabled(type: BudgetPlanningMessageType, preferences: NotificationPreferences) {
  switch (type) {
    case 'planning_update':
      return preferences.planningUpdates;
    case 'status_change':
      return preferences.statusChanges;
    case 'reminder':
      return preferences.reminders;
    case 'budget_alert':
      return preferences.budgetAlerts;
    default:
      return false;
  }
}

export async function sendBudgetPlanningMessage(message: BudgetPlanningMessage) {
  if (!isMessageTypeEnabled(message.type, message.preferences)) {
    return { delivered: false, reason: 'notification-type-disabled' as const, results: [] };
  }

  const targets = getChannelTargets(message);
  if (!targets.length) {
    return { delivered: false, reason: 'no-supported-channel' as const, results: [] };
  }

  const env = getSentDmEnv();
  const results = await Promise.all(
    targets.map(async (target) => {
      const response = await fetch(`${env.SENTDM_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.SENTDM_API_KEY,
          'x-sender-id': env.SENTDM_SENDER_ID,
        },
        body: JSON.stringify({
          channel: target.channel,
          to: target.to,
          message: `${message.title}\n${message.body}`,
          metadata: {
            userId: message.userId,
            type: message.type,
            route: message.route,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`sent.dm ${target.channel} request failed: ${response.status} ${errorText}`);
      }

      const payload = await response.json().catch(() => null);
      return {
        channel: target.channel,
        to: target.to,
        payload,
      };
    })
  );

  return { delivered: true, reason: null, results };
}
