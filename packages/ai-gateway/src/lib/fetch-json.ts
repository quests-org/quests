import { type AsyncResult, Result } from "typescript-result";

import { getCachedResult, setCachedResult } from "./cache";
import { TypedError } from "./errors";

// Multiple open tabs in the Studio can fire concurrent requests to the same URL.
const inFlightRequests = new Map<
  string,
  AsyncResult<unknown, TypedError.Fetch | TypedError.Parse>
>();

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
    const cachedData = getCachedResult<object>(cacheKey);
    if (cachedData !== undefined) {
      return Result.ok(cachedData);
    }
  }

  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = Result.gen(function* () {
    try {
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
        setCachedResult(cacheKey, data as object);
      }

      return data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  });

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
