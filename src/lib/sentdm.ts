import { getCloudflareEmailEnv, getPublicAppEnv, getSentDmEnv } from '@/lib/env';
import type { NotificationPreferences } from '@/store/useAppStore';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';
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
  route: '/budget-planning' | '/portfolio' | '/fire' | '/reports';
  email?: string | null;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  preferences: NotificationPreferences;
}

type MessageTarget = {
  channel: NotificationChannel;
  to: string;
};

type DeliveryDependencies = {
  sendEmail?: (target: MessageTarget, message: BudgetPlanningMessage) => Promise<unknown>;
  sendSentDm?: (target: MessageTarget, message: BudgetPlanningMessage) => Promise<unknown>;
};

function getChannelTargets(message: BudgetPlanningMessage, emailConfigured: boolean) {
  const targets: MessageTarget[] = [];
  const resolvedWhatsAppNumber = message.preferences.useSamePhoneNumberForWhatsApp
    ? message.phoneNumber?.trim()
    : message.whatsappNumber?.trim();

  if (emailConfigured && message.preferences.email && message.email?.trim()) {
    targets.push({ channel: 'email', to: message.email.trim() });
  }

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

async function sendViaSentDm(target: MessageTarget, message: BudgetPlanningMessage) {
  const env = getSentDmEnv();
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
}

async function sendViaCloudflareEmail(target: MessageTarget, message: BudgetPlanningMessage) {
  const env = getCloudflareEmailEnv();
  if (!env) {
    throw new Error('Cloudflare email is not configured.');
  }

  const appUrl = getPublicAppEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const destinationUrl = `${appUrl}${message.route}`;
  const escapedBody = message.body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_EMAIL_ACCOUNT_ID}/email/sending/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_EMAIL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          address: env.CLOUDFLARE_EMAIL_FROM,
          name: env.CLOUDFLARE_EMAIL_FROM_NAME,
        },
        to: [target.to],
        reply_to: env.CLOUDFLARE_EMAIL_REPLY_TO
          ? {
              address: env.CLOUDFLARE_EMAIL_REPLY_TO,
              name: env.CLOUDFLARE_EMAIL_FROM_NAME,
            }
          : undefined,
        subject: message.title,
        text: `${message.body}\n\nOpen Wealix: ${destinationUrl}`,
        html: `<p>${escapedBody}</p><p><a href="${destinationUrl}">Open in Wealix</a></p>`,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare email request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json().catch(() => null);
  return {
    channel: target.channel,
    to: target.to,
    payload,
  };
}

export async function sendBudgetPlanningMessage(message: BudgetPlanningMessage, deps: DeliveryDependencies = {}) {
  if (!isMessageTypeEnabled(message.type, message.preferences)) {
    return { delivered: false, reason: 'notification-type-disabled' as const, results: [] };
  }

  const emailConfigured = Boolean(deps.sendEmail) || Boolean(getCloudflareEmailEnv());
  const targets = getChannelTargets(message, emailConfigured);
  if (!targets.length) {
    return { delivered: false, reason: 'no-supported-channel' as const, results: [] };
  }

  const sendEmail = deps.sendEmail ?? sendViaCloudflareEmail;
  const sendSentDm = deps.sendSentDm ?? sendViaSentDm;
  const results = await Promise.all(
    targets.map((target) => {
      if (target.channel === 'email') {
        return sendEmail(target, message);
      }

      return sendSentDm(target, message);
    })
  );

  return { delivered: true, reason: null, results };
}
