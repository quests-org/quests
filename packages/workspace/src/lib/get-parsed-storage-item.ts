import { err, ok } from "neverthrow";
import superjson from "superjson";
import { z } from "zod";

import { TypedError } from "./errors";
import { type WrappedStorage } from "./wrap-storage";

export function getParsedStorageItem<T>(
  key: string,
  schema: z.ZodType<T>,
  storage: WrappedStorage,
  { signal }: { signal?: AbortSignal } = {},
) {
  return storage.getItemRaw(key, { signal }).andThen((rawItem) => {
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
