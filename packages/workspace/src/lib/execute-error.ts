import { err } from "neverthrow";

export type ExecuteError =
  | { code: ExecuteErrorCodes; message: string; type: "execute-error" }
  | { message: string; type: "execute-error" };

type ExecuteErrorCodes = "no-image-generation-provider";

export function executeError(
  errorOrMessage: string | { code: ExecuteErrorCodes; message: string },
) {
  if (typeof errorOrMessage === "string") {
    return err({ message: errorOrMessage, type: "execute-error" as const });
  }
  return err({ ...errorOrMessage, type: "execute-error" as const });
}
