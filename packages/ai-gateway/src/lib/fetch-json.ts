import { LRUCache } from "lru-cache";
import { Result } from "typescript-result";

import { TypedError } from "./errors";

const globalCache = new LRUCache<string, object>({
  max: 1000,
  ttl: 60 * 60 * 1000, // 1 hour TTL
});

export function fetchJson({
  cache = true,
  headers,
  url,
}: {
  cache?: boolean;
  headers: Headers;
  url: string;
}) {
  return Result.gen(function* () {
    const cacheKey = cache ? createCacheKey(url, headers) : "";

    if (cache) {
      const cachedData = globalCache.get(cacheKey);
      if (cachedData !== undefined) {
        return cachedData;
      }
    }

    const response = yield* Result.try(
      () => fetch(url, { headers, method: "GET" }),
      (error) =>
        new TypedError.Fetch(`Failed to fetch from ${url}`, {
          cause: error,
        }),
    );

    if (!response.ok) {
      return Result.error(
        new TypedError.Fetch(
          `Failed to fetch from ${url}: ${response.status} ${response.statusText}`,
        ),
      );
    }

    const data: unknown = yield* Result.try(
      () => response.json(),
      (error) =>
        new TypedError.Parse(`Failed to parse JSON from ${url}`, {
          cause: error,
        }),
    );

    if (cache) {
      globalCache.set(cacheKey, data as object);
    }

    return data;
  });
}

function createCacheKey(url: string, headers: Headers): string {
  const sortedHeaders: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    sortedHeaders[key.toLowerCase()] = value;
  }
  return `${url}:${JSON.stringify(sortedHeaders)}`;
}
