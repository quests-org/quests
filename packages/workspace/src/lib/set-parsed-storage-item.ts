import { err, ResultAsync } from "neverthrow";
import superjson from "superjson";
import { type Storage } from "unstorage";
import { z } from "zod";

export function setParsedStorageItem<T>(
  key: string,
  value: T,
  schema: z.ZodType<T>,
  storage: Storage,
  { signal }: { signal?: AbortSignal } = {},
) {
  const result = schema.safeParse(value);
  if (!result.success) {
    return err({
      message: z.prettifyError(result.error),
      type: "schema-error" as const,
    });
  }

  const serialized = superjson.stringify(result.data);

  return ResultAsync.fromPromise(
    storage.setItemRaw(key, serialized, { signal }),
    () => ({ message: "Storage error", type: "storage-error" as const }),
  ).map(() => result.data);
}
