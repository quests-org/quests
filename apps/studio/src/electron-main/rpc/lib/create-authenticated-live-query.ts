import { apiQueryClient } from "@/electron-main/api/client";
import { hasToken } from "@/electron-main/api/utils";
import { publisher } from "@/electron-main/rpc/publisher";
import {
  type QueryKey,
  QueryObserver,
  type QueryObserverOptions,
} from "@tanstack/query-core";
import { isEqual } from "radashi";

/**
 * Creates an async generator for ORPC that yields TanStack Query data and reacts
 * to authentication state changes. When the auth token is added, the query is
 * enabled and invalidated to fetch fresh data. When the token is removed, the
 * query is disabled and its cache is cleared, yielding null to clients.
 */
export async function* createAuthenticatedLiveQuery<TData>({
  getOptions,
  queryKey,
  signal,
}: {
  getOptions: (enabled: boolean) => QueryObserverOptions<TData>;
  queryKey: QueryKey;
  signal: AbortSignal | undefined;
}): AsyncGenerator<null | TData, void, unknown> {
  const observer = new QueryObserver(apiQueryClient, getOptions(hasToken()));

  let resolveNext: (() => void) | undefined;
  let lastYieldedData: unknown;

  const observerUnsubscribe = observer.subscribe((queryResult) => {
    if (
      resolveNext &&
      (queryResult.error || !isEqual(queryResult.data, lastYieldedData))
    ) {
      const resolve = resolveNext;
      resolveNext = undefined;
      resolve();
    }
  });

  void (async () => {
    try {
      for await (const _ of publisher.subscribe(
        "session.apiBearerToken.updated",
        { signal },
      )) {
        const currentHasToken = hasToken();
        if (currentHasToken) {
          observer.setOptions(getOptions(true));
          await apiQueryClient.invalidateQueries({ queryKey });
        } else {
          apiQueryClient.removeQueries({ queryKey });
          observer.setOptions(getOptions(false));
        }
      }
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      throw error;
    }
  })();

  const cleanup = () => {
    observerUnsubscribe();
    if (resolveNext) {
      resolveNext();
      resolveNext = undefined;
    }
  };

  signal?.addEventListener("abort", cleanup);

  const initialResult = observer.getCurrentResult();
  if (initialResult.error) {
    throw initialResult.error;
  }
  const initialData = initialResult.data ?? null;
  lastYieldedData = initialData;
  yield initialData;

  while (true) {
    await new Promise<void>((resolve) => {
      resolveNext = resolve;
    });

    if (signal?.aborted) {
      cleanup();
      return;
    }

    const currentResult = observer.getCurrentResult();
    if (currentResult.error) {
      throw currentResult.error;
    }
    const newData = currentResult.data ?? null;
    if (!isEqual(newData, lastYieldedData)) {
      lastYieldedData = newData;
      yield newData;
    }
  }
}
