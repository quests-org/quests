import { GIT_AUTHOR } from "../../constants";

export namespace GitCommands {
  export function addAll() {
    return ["add", "."];
  }

  export function checkoutFiles(ref: string) {
    return ["checkout", ref, "--", "."];
  }

  export function commitEmptyWithAuthor(message: string) {
    return [
      "commit",
      "--allow-empty",
      "-m",
      message,
      "--author",
      `${GIT_AUTHOR.name} <${GIT_AUTHOR.email}>`,
    ];
  }

  export function commitWithAuthor(message: string) {
    return [
      "commit",
      "-m",
      message,
      "--author",
      `${GIT_AUTHOR.name} <${GIT_AUTHOR.email}>`,
    ];
  }

  export function diffCached() {
    return ["diff", "--cached"];
  }

  export function diffNumstat(ref: string) {
    return ["diff", "--numstat", `${ref}~1`, ref];
  }

  export function diffStat(ref: string) {
    return ["diff", "--stat", `${ref}~1`, ref];
  }

  export function getCommitMessage(ref: string) {
    return ["log", "--format=%s", "-n", "1", ref];
  }

  export function init() {
    return ["init"];
  }

  export function logWithDetails(limit?: number) {
    const args = ["log", "--pretty=format:%H|%an|%ae|%at|%s"];
    if (limit) {
      args.push("-n", String(limit));
    }
    return args;
  }

  export function revList(ref: string) {
    return ["rev-list", "--count", ref];
  }

  export function revParse(ref: string) {
    return ["rev-parse", ref];
  }

  export function showNumstat(ref: string) {
    return ["show", "--numstat", "--format=", ref];
  }

  export function status() {
    return ["status", "--porcelain"];
  }

  export function verifyCommitRef(ref: string) {
    // ^commit is necessary to ensure it identifies a commit
    return ["rev-parse", "--verify", `${ref}^{commit}`];
  }
}
