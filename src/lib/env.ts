import { z } from 'zod';

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

let cachedPublicAppEnv: z.infer<typeof publicAppEnvSchema> | null = null;
let cachedPublicClerkEnv: z.infer<typeof publicClerkEnvSchema> | null = null;
let cachedSentDmEnv: z.infer<typeof sentDmEnvSchema> | null = null;

export function getPublicAppEnv() {
  if (cachedPublicAppEnv) {
    return cachedPublicAppEnv;
  }

  cachedPublicAppEnv = publicAppEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app',
  });

  return cachedPublicAppEnv;
}

export function getPublicClerkEnv() {
  if (cachedPublicClerkEnv) {
    return cachedPublicClerkEnv;
  }

  cachedPublicClerkEnv = publicClerkEnvSchema.parse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });

  return cachedPublicClerkEnv;
}

export function getSentDmEnv() {
  if (cachedSentDmEnv) {
    return cachedSentDmEnv;
  }

  cachedSentDmEnv = sentDmEnvSchema.parse({
    SENTDM_API_KEY: process.env.SENTDM_API_KEY,
    SENTDM_SENDER_ID: process.env.SENTDM_SENDER_ID,
    SENTDM_BASE_URL: process.env.SENTDM_BASE_URL || 'https://api.sent.dm',
    SENTDM_WEBHOOK_SIGNING_SECRET: process.env.SENTDM_WEBHOOK_SIGNING_SECRET,
  });

  return cachedSentDmEnv;
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required but was not provided.`);
  }
  return value;
}
