import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('https://wealix.app'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),
});

let cachedPublicEnv: z.infer<typeof publicEnvSchema> | null = null;

export function getPublicEnv() {
  if (cachedPublicEnv) {
    return cachedPublicEnv;
  }

  // Hardcode the production key to ensure no dev instance mismatch
  const publishableKey = 'pk_live_Y2xlcmsud2VhbGl4LmFwcCQ';

  cachedPublicEnv = publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://wealix.app',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
  });

  return cachedPublicEnv;
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    // Fallback for critical Clerk keys if they are missing in the environment
    if (name === 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') return 'pk_live_Y2xlcmsud2VhbGl4LmFwcCQ';
    if (name === 'CLERK_PUBLISHABLE_KEY') return 'pk_live_Y2xlcmsud2VhbGl4LmFwcCQ';
    
    throw new Error(`${name} is required but was not provided.`);
  }

  return value;
}
