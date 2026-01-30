import { err } from "neverthrow";

export interface ExecuteError {
  message: string;
  type: "execute-error";
}

export function executeError(errorOrMessage: string) {
  const error: ExecuteError = {
    message: errorOrMessage,
    type: "execute-error",
  };
  return err(error);
}
