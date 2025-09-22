import { LRUCache } from "lru-cache";

const globalCache = new LRUCache<string, object>({
  max: 1000,
  ttl: 60 * 60 * 1000, // 1 hour TTL
});

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function getCachedResult<T>(key: string): T | undefined {
  return globalCache.get(key) as T | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function setCachedResult<T extends object>(key: string, value: T): void {
  globalCache.set(key, value);
}
