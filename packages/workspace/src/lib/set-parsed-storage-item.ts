import { err } from "neverthrow";
import superjson from "superjson";
import { z } from "zod";

import { TypedError } from "./errors";
import { type WrappedStorage } from "./wrap-storage";

export function setParsedStorageItem<T>(
  key: string,
  value: T,
  schema: z.ZodType<T>,
  storage: WrappedStorage,
  { signal }: { signal?: AbortSignal } = {},
) {
  const result = schema.safeParse(value);
  if (!result.success) {
    return err(
      new TypedError.Parse(z.prettifyError(result.error), {
        cause: result.error,
      }),
    );
  }

  const serialized = superjson.stringify(result.data);

  return storage.setItemRaw(key, serialized, { signal }).map(() => result.data);
}
