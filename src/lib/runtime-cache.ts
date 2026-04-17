type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();

function isExpired(entry: CacheEntry<unknown>) {
  return entry.expiresAt <= Date.now();
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  const entry = cacheStore.get(key);
  if (!entry) {
    return null;
  }

  if (isExpired(entry)) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value as T;
}

export async function setCachedValue<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function deleteCachedValue(key: string): Promise<void> {
  cacheStore.delete(key);
}
