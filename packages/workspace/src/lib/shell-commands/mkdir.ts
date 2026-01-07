import fs from "node:fs/promises";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { createError, createSuccess, type FileOperationResult } from "./types";

export async function mkdirCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return createError(
      "mkdir command requires at least 1 argument: mkdir [-p] <directory> [<directory> ...]",
    );
  }

  let recursive = false;
  let directoryPaths: string[];

  if (args[0] === "-p") {
    if (args.length < 2) {
      return createError(
        "mkdir -p command requires at least 1 path argument: mkdir -p <directory> [<directory> ...]",
      );
    }
    recursive = true;
    directoryPaths = args.slice(1);
  } else {
    directoryPaths = args;
  }

  if (directoryPaths.length === 0 || directoryPaths.some((p) => !p)) {
    return createError("mkdir command requires valid path arguments");
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
      return createError(
        `mkdir command failed for '${directoryPath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const pathsStr = directoryPaths.join(" ");
  const command = recursive ? `mkdir -p ${pathsStr}` : `mkdir ${pathsStr}`;
  return createSuccess(command);
}
