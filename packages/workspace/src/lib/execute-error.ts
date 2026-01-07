import { err } from "neverthrow";

export function executeError(message: string) {
  return err({ message, type: "execute-error" as const });
}
