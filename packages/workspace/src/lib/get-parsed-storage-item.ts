import { err, ok, ResultAsync } from "neverthrow";
import superjson from "superjson";
import { type Storage } from "unstorage";
import { z } from "zod";

import { TypedError } from "./errors";

export function getParsedStorageItem<T>(
  key: string,
  schema: z.ZodType<T>,
  storage: Storage,
  { signal }: { signal?: AbortSignal } = {},
) {
  return ResultAsync.fromPromise(
    storage.getItemRaw<unknown>(key, { signal }),
    (error) => new TypedError.Storage("Storage error", { cause: error }),
  ).andThen((rawItem) => {
    if (!rawItem) {
      return err(new TypedError.NotFound(`Item ${key} not found`));
    }

    let jsonString: string;

    if (typeof rawItem === "string") {
      jsonString = rawItem;
    } else if (Buffer.isBuffer(rawItem)) {
      jsonString = rawItem.toString();
    } else {
      return err(new TypedError.Parse(`Item ${key} is not a string or buffer`));
    }

    let parsed: unknown;
    try {
      parsed = superjson.parse(jsonString);
    } catch (error) {
      return err(
        new TypedError.Parse("Failed to parse JSON", { cause: error }),
      );
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      return err(
        new TypedError.Parse(z.prettifyError(result.error), {
          cause: result.error,
        }),
      );
    }

    return ok(result.data);
  });
}
