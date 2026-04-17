import { getCloudflareContext } from '@opennextjs/cloudflare';

export type WealixEnv = Env;

export async function getCloudflareEnv(): Promise<Partial<WealixEnv>> {
  const context = await getCloudflareContext();
  return context.env as Partial<WealixEnv>;
}

export async function getOptionalStorageBucket() {
  const env = await getCloudflareEnv();
  return env.WEALIX_STORAGE;
}
