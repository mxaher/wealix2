import { getCloudflareContext } from '@opennextjs/cloudflare';

export type D1LikeDatabase = {
  prepare: (query: string) => {
    first: <T = unknown>() => Promise<T | null>;
    all: <T = unknown>() => Promise<{ results: T[] }>;
    bind: (...values: unknown[]) => {
      first: <T = unknown>() => Promise<T | null>;
      all: <T = unknown>() => Promise<{ results: T[] }>;
      run: () => Promise<unknown>;
    };
    run: () => Promise<unknown>;
  };
};

export function getD1Database(): D1LikeDatabase | null {
  try {
    const context = getCloudflareContext();
    return (context?.env as Record<string, unknown> | undefined)?.WEALIX_DB as D1LikeDatabase | null;
  } catch {
    return null;
  }
}
