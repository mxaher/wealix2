import { z } from 'zod';
import { readRuntimeEnv } from '@/lib/runtime-env';

const publicAppEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('https://wealix.app'),
});

const publicClerkEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),
});

const sentDmEnvSchema = z.object({
  SENTDM_API_KEY: z.string().min(1, 'SENTDM_API_KEY is required'),
  SENTDM_SENDER_ID: z.string().min(1, 'SENTDM_SENDER_ID is required'),
  SENTDM_BASE_URL: z.string().url().default('https://api.sent.dm'),
  SENTDM_WEBHOOK_SIGNING_SECRET: z.string().min(1, 'SENTDM_WEBHOOK_SIGNING_SECRET is required'),
});

const cloudflareEmailEnvSchema = z.object({
  CLOUDFLARE_EMAIL_ACCOUNT_ID: z.string().min(1, 'CLOUDFLARE_EMAIL_ACCOUNT_ID is required'),
  CLOUDFLARE_EMAIL_API_TOKEN: z.string().min(1, 'CLOUDFLARE_EMAIL_API_TOKEN is required'),
  CLOUDFLARE_EMAIL_FROM: z.string().email('CLOUDFLARE_EMAIL_FROM must be a valid email address'),
  CLOUDFLARE_EMAIL_FROM_NAME: z.string().min(1).default('Wealix'),
  CLOUDFLARE_EMAIL_REPLY_TO: z.string().email('CLOUDFLARE_EMAIL_REPLY_TO must be a valid email address').optional(),
});

let cachedPublicAppEnv: z.infer<typeof publicAppEnvSchema> | null = null;
let cachedPublicClerkEnv: z.infer<typeof publicClerkEnvSchema> | null = null;
let cachedSentDmEnv: z.infer<typeof sentDmEnvSchema> | null = null;
let cachedCloudflareEmailEnv: z.infer<typeof cloudflareEmailEnvSchema> | null | undefined;

export function getPublicAppEnv() {
  if (cachedPublicAppEnv) {
    return cachedPublicAppEnv;
  }

  cachedPublicAppEnv = publicAppEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: readRuntimeEnv('NEXT_PUBLIC_APP_URL') || 'https://wealix.app',
  });

  return cachedPublicAppEnv;
}

export function getPublicClerkEnv() {
  if (cachedPublicClerkEnv) {
    return cachedPublicClerkEnv;
  }

  cachedPublicClerkEnv = publicClerkEnvSchema.parse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: readRuntimeEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
  });

  return cachedPublicClerkEnv;
}

export function getSentDmEnv() {
  if (cachedSentDmEnv) {
    return cachedSentDmEnv;
  }

  cachedSentDmEnv = sentDmEnvSchema.parse({
    SENTDM_API_KEY: readRuntimeEnv('SENTDM_API_KEY'),
    SENTDM_SENDER_ID: readRuntimeEnv('SENTDM_SENDER_ID'),
    SENTDM_BASE_URL: readRuntimeEnv('SENTDM_BASE_URL') || 'https://api.sent.dm',
    SENTDM_WEBHOOK_SIGNING_SECRET: readRuntimeEnv('SENTDM_WEBHOOK_SIGNING_SECRET'),
  });

  return cachedSentDmEnv;
}

export function getCloudflareEmailEnv() {
  if (cachedCloudflareEmailEnv !== undefined) {
    return cachedCloudflareEmailEnv;
  }

  const hasAnyEmailConfig = Boolean(
    readRuntimeEnv('CLOUDFLARE_EMAIL_ACCOUNT_ID') ||
      readRuntimeEnv('CLOUDFLARE_EMAIL_API_TOKEN') ||
      readRuntimeEnv('CLOUDFLARE_EMAIL_FROM')
  );

  if (!hasAnyEmailConfig) {
    cachedCloudflareEmailEnv = null;
    return cachedCloudflareEmailEnv;
  }

  cachedCloudflareEmailEnv = cloudflareEmailEnvSchema.parse({
    CLOUDFLARE_EMAIL_ACCOUNT_ID: readRuntimeEnv('CLOUDFLARE_EMAIL_ACCOUNT_ID'),
    CLOUDFLARE_EMAIL_API_TOKEN: readRuntimeEnv('CLOUDFLARE_EMAIL_API_TOKEN'),
    CLOUDFLARE_EMAIL_FROM: readRuntimeEnv('CLOUDFLARE_EMAIL_FROM'),
    CLOUDFLARE_EMAIL_FROM_NAME: readRuntimeEnv('CLOUDFLARE_EMAIL_FROM_NAME') || 'Wealix',
    CLOUDFLARE_EMAIL_REPLY_TO: readRuntimeEnv('CLOUDFLARE_EMAIL_REPLY_TO') || undefined,
  });

  return cachedCloudflareEmailEnv;
}

export function getRequiredEnv(name: string) {
  const value = readRuntimeEnv(name);
  if (!value || !value.trim()) {
    throw new Error(`${name} is required but was not provided.`);
  }
  return value;
}
