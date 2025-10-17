export namespace TypedError {
  const PREFIX = "gateway";
  export type Type = Fetch | NotFound | Parse | VerificationFailed;

  export class Fetch extends Error {
    readonly type = `${PREFIX}-fetch-error`;
  }

  export class Parse extends Error {
    readonly type = `${PREFIX}-parse-error`;
  }

  export class NotFound extends Error {
    readonly type = `${PREFIX}-not-found-error`;
  }

  export class VerificationFailed extends Error {
    readonly type = `${PREFIX}-verification-failed-error`;
  }

  export class Unknown extends Error {
    readonly type = `${PREFIX}-unknown-error`;
  }
}
