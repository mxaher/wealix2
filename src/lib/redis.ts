// src/lib/redis.ts
// Upstash Redis — Edge & Cloudflare Worker compatible (no Node.js net module)
import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error('[Redis] UPSTASH_REDIS_REST_URL environment variable is not set.');
}
if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('[Redis] UPSTASH_REDIS_REST_TOKEN environment variable is not set.');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
