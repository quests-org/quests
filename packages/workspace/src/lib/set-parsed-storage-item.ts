import { err, ResultAsync } from "neverthrow";
import superjson from "superjson";
import { type Storage } from "unstorage";
import { z } from "zod";

import { TypedError } from "./errors";

export function setParsedStorageItem<T>(
  key: string,
  value: T,
  schema: z.ZodType<T>,
  storage: Storage,
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

  return ResultAsync.fromPromise(
    storage.setItemRaw(key, serialized, { signal }),
    (error) => new TypedError.Storage("Storage error", { cause: error }),
  ).map(() => result.data);
}
