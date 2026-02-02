import ms from "ms";
import { type AsyncResult, Result } from "typescript-result";

import { getCachedResult, setCachedResult } from "./cache";
import { TypedError } from "./errors";

// Multiple open tabs in the Studio can fire concurrent requests to the same URL.
const inFlightRequests = new Map<
  string,
  AsyncResult<unknown, TypedError.Fetch | TypedError.Parse>
>();

const ERROR_CACHE_TTL = ms("5 seconds");

export function fetchJson({
  cache = true,
  headers,
  url,
}: {
  cache?: boolean;
  headers: Headers;
  url: string;
}) {
  const cacheKey = createCacheKey(url, headers);

  if (cache) {
    const cachedData = getCachedResult<
      { error: TypedError.Fetch | TypedError.Parse } | { success: object }
    >(cacheKey);
    if (cachedData !== undefined) {
      if ("error" in cachedData) {
        return Result.error(cachedData.error);
      }
      return Result.ok(cachedData.success);
    }
  }

  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = Result.fromAsync(
    Result.fromAsyncCatching(
      async () => {
        const response = await fetch(url, { headers, method: "GET" });

        if (!response.ok) {
          throw new TypedError.Fetch(
            `Failed to fetch from ${url}: ${response.status} ${response.statusText}`,
          );
        }

        return (await response.json()) as object;
      },
      (error) =>
        new TypedError.Fetch(`Failed to fetch from ${url}`, { cause: error }),
    ).then((result) => {
      if (result.ok) {
        if (cache) {
          setCachedResult(cacheKey, { success: result.value });
        }
      } else {
        if (cache) {
          setCachedResult(
            cacheKey,
            { error: result.error },
            { ttl: ERROR_CACHE_TTL },
          );
        }
      }
      inFlightRequests.delete(cacheKey);
      return result;
    }),
  );

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

function createCacheKey(url: string, headers: Headers): string {
  const sortedHeaders: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    sortedHeaders[key.toLowerCase()] = value;
  }
  return `${url}:${JSON.stringify(sortedHeaders)}`;
}
