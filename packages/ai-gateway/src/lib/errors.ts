export namespace TypedError {
  export class Fetch extends Error {
    readonly type = "gateway-fetch-error";
  }

  export class Parse extends Error {
    readonly type = "gateway-parse-error";
  }

  export class NotFound extends Error {
    readonly type = "gateway-not-found-error";
  }

  export class VerificationFailed extends Error {
    readonly type = "gateway-verification-failed-error";
  }

  export type Type = Fetch | NotFound | Parse | VerificationFailed;
}
