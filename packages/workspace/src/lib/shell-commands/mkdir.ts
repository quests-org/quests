import fs from "node:fs/promises";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { type FileOperationResult } from "./types";
import { executeError, shellSuccess, validateNoGlobs } from "./utils";

export async function mkdirCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return executeError(
      "mkdir command requires at least 1 argument: mkdir [-p] <directory> [<directory> ...]",
    );
  }

  let recursive = false;
  let directoryPaths: string[];

  if (args[0] === "-p") {
    if (args.length < 2) {
      return executeError(
        "mkdir -p command requires at least 1 path argument: mkdir -p <directory> [<directory> ...]",
      );
    }
    recursive = true;
    directoryPaths = args.slice(1);
  } else {
    directoryPaths = args;
  }

  if (directoryPaths.length === 0 || directoryPaths.some((p) => !p)) {
    return executeError("mkdir command requires valid path arguments");
  }

  const globValidation = validateNoGlobs(directoryPaths, "mkdir");
  if (globValidation.isErr()) {
    return globValidation;
  }

  for (const directoryPath of directoryPaths) {
    const fixedPathResult = ensureRelativePath(directoryPath);
    if (fixedPathResult.isErr()) {
      return fixedPathResult;
    }

    const absolutePath = absolutePathJoin(
      appConfig.appDir,
      fixedPathResult.value,
    );

    try {
      await fs.mkdir(absolutePath, { recursive });
    } catch (error) {
      return executeError(
        `mkdir command failed for '${directoryPath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const pathsStr = directoryPaths.join(" ");
  const command = recursive ? `mkdir -p ${pathsStr}` : `mkdir ${pathsStr}`;
  return shellSuccess(command);
}
