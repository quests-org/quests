import { GIT_AUTHOR, GIT_TRAILERS } from "../../constants";
import { type RelativePath } from "../../schemas/paths";

export namespace GitCommands {
  export function addAll() {
    return ["add", "."];
  }

  export function addFiles(files: RelativePath[]) {
    return ["add", ...files];
  }

  export function archiveZip(outputPath: string) {
    return ["archive", "--format=zip", "--output", outputPath, "HEAD"];
  }

  export function checkoutFiles(ref: string) {
    return ["checkout", ref, "--", "."];
  }

  export function clone(repoPath: string, targetPath: string) {
    return ["clone", repoPath, targetPath];
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

  export function findInitialCommit() {
    return [
      "log",
      "--format=%H",
      `--grep=^${GIT_TRAILERS.initialCommit}: true$`,
      "--all",
      "--reverse",
      "-n",
      "1",
    ];
  }

  export function getCommitMessage(ref: string) {
    return ["log", "--format=%s", "-n", "1", ref];
  }

  export function init() {
    return ["init"];
  }

  export function logFileAllRefs(filePath: string) {
    return ["log", "--format=%H", "--reverse", "--all", "--", filePath];
  }

  export function logPathSinceCommit(commitRef: string, path: string) {
    return ["log", "--format=%H", `${commitRef}..HEAD`, "--", path];
  }

  export function logWithDetails(limit?: number) {
    const args = ["log", "--pretty=format:%H|%an|%ae|%at|%s"];
    if (limit) {
      args.push("-n", String(limit));
    }
    return args;
  }

  export function lsFiles() {
    return ["ls-files"];
  }

  export function removeRemote(remoteName: string) {
    return ["remote", "remove", remoteName];
  }

  export function revList(ref: string) {
    return ["rev-list", "--count", ref];
  }

  export function revParse(ref: string) {
    return ["rev-parse", ref];
  }

  export function showFile(ref: string, filePath: string) {
    return ["show", `${ref}:${filePath}`];
  }

  export function showNumstat(ref: string) {
    return ["show", "--numstat", "--format=", ref];
  }

  export function status() {
    return ["status", "--porcelain"];
  }

  export function statusPath(path: string) {
    return ["status", "--porcelain", "--", path];
  }

  export function verifyCommitRef(ref: string) {
    // ^commit is necessary to ensure it identifies a commit
    return ["rev-parse", "--verify", `${ref}^{commit}`];
  }
}
