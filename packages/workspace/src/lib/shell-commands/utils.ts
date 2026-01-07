import { ok } from "neverthrow";

import { createError } from "./types";

export function validateArgCount(
  command: string,
  args: string[],
  expectedCount: number,
  usage: string,
) {
  if (args.length !== expectedCount) {
    return createError(
      `${command} command requires exactly ${expectedCount} argument${expectedCount > 1 ? "s" : ""}: ${usage}`,
    );
  }

  const nonEmptyArgs = args.filter(Boolean);
  if (nonEmptyArgs.length !== expectedCount) {
    return createError(
      `${command} command requires exactly ${expectedCount} argument${expectedCount > 1 ? "s" : ""}: ${usage}`,
    );
  }

  return ok(args);
}
