import { err, ok, ResultAsync } from "neverthrow";
import superjson from "superjson";
import { type Storage } from "unstorage";
import { z } from "zod";

export function getParsedStorageItem<T>(
  key: string,
  schema: z.ZodType<T>,
  storage: Storage,
  { signal }: { signal?: AbortSignal } = {},
) {
  return ResultAsync.fromPromise(
    storage.getItemRaw<unknown>(key, { signal }),
    () => ({ message: "Storage error", type: "storage-error" as const }),
  ).andThen((rawItem) => {
    if (!rawItem) {
      return err({
        message: `Item ${key} not found`,
        type: "not-found" as const,
      });
    }

    let jsonString: string;

    if (typeof rawItem === "string") {
      jsonString = rawItem;
    } else if (Buffer.isBuffer(rawItem)) {
      jsonString = rawItem.toString();
    } else {
      return err({
        message: `Item ${key} is not a string or buffer`,
        type: "parse-error" as const,
      });
    }

    let parsed: unknown;
    try {
      parsed = superjson.parse(jsonString);
    } catch {
      return err({
        message: "Failed to parse JSON",
        type: "parse-error" as const,
      });
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      return err({
        message: z.prettifyError(result.error),
        type: "parse-error" as const,
      });
    }

    return ok(result.data);
  });
}
