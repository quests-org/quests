import { type GitError } from "dugite";

export namespace TypedError {
  const PREFIX = "workspace";
  export type Type =
    | Conflict
    | DependencyInstall
    | FileSystem
    | Git
    | NoChanges
    | NotFound
    | Parse
    | ShimNotFound
    | Storage
    | Unknown;

  export class Conflict extends Error {
    readonly type = `${PREFIX}-conflict-error`;
  }

  export class DependencyInstall extends Error {
    readonly type = `${PREFIX}-dependency-install-error`;
  }

  export class FileSystem extends Error {
    readonly type = `${PREFIX}-filesystem-error`;
  }

  export class Git extends Error {
    readonly dugiteCode?: GitError;
    readonly type = `${PREFIX}-git-error`;

    constructor(
      message: string,
      options?: { cause?: unknown; dugiteCode?: GitError },
    ) {
      super(message, { cause: options?.cause });
      this.dugiteCode = options?.dugiteCode;
    }
  }

  export class NoChanges extends Error {
    readonly type = `${PREFIX}-no-changes-error`;
  }

  export class NotFound extends Error {
    readonly type = `${PREFIX}-not-found-error`;
  }

  export class Parse extends Error {
    readonly type = `${PREFIX}-parse-error`;
  }

  export class ShimNotFound extends Error {
    readonly type = `${PREFIX}-shim-not-found-error`;
  }

  export class Storage extends Error {
    readonly type = `${PREFIX}-storage-error`;
  }

  export class Unknown extends Error {
    readonly type = `${PREFIX}-unknown-error`;
  }
}
