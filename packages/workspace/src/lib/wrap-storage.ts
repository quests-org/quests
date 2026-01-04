import { ResultAsync } from "neverthrow";
import { type Storage } from "unstorage";

import { TypedError } from "./errors";

export interface WrappedStorage {
  dispose: Storage["dispose"];
  getItemRaw: <T = unknown>(
    key: string,
    options?: { signal?: AbortSignal },
  ) => ResultAsync<null | T, TypedError.Storage>;
  getKeys: (
    base?: string,
    options?: { signal?: AbortSignal },
  ) => ResultAsync<string[], TypedError.Storage>;
  removeItem: (
    key: string,
    options?: { signal?: AbortSignal },
  ) => ResultAsync<void, TypedError.Storage>;
  setItemRaw: (
    key: string,
    value: unknown,
    options?: { signal?: AbortSignal },
  ) => ResultAsync<void, TypedError.Storage>;
}

// Expose return values as neverthrow ResultAsync instead of Promise
export function wrapStorage(storage: Storage): WrappedStorage {
  return {
    dispose: storage.dispose.bind(storage),
    getItemRaw: (key, options) =>
      ResultAsync.fromPromise(
        storage.getItemRaw(key, options),
        (error: unknown) =>
          new TypedError.Storage(
            error instanceof Error
              ? error.message
              : "Failed to get storage item",
            { cause: error },
          ),
      ),
    getKeys: (base, options) =>
      ResultAsync.fromPromise(
        storage.getKeys(base, options),
        (error: unknown) =>
          new TypedError.Storage(
            error instanceof Error
              ? error.message
              : "Failed to get storage keys",
            { cause: error },
          ),
      ),
    removeItem: (key, options) =>
      ResultAsync.fromPromise(
        storage.removeItem(key, options),
        (error: unknown) =>
          new TypedError.Storage(
            error instanceof Error
              ? error.message
              : "Failed to remove storage item",
            { cause: error },
          ),
      ),
    setItemRaw: (key, value, options) =>
      ResultAsync.fromPromise(
        storage.setItemRaw(key, value, options),
        (error: unknown) =>
          new TypedError.Storage(
            error instanceof Error
              ? error.message
              : "Failed to set storage item",
            { cause: error },
          ),
      ),
  };
}
