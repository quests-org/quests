import fs from "node:fs/promises";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { executeError } from "../execute-error";
import { type FileOperationResult } from "./types";
import { shellSuccess, validateNoGlobs } from "./utils";

const USAGE = "usage: mkdir [-p] directory_name ...";

export const MKDIR_COMMAND = {
  description: USAGE,
  examples: ["mkdir src/utils", "mkdir -p src/components/ui/buttons"],
};

export async function mkdirCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return executeError(`mkdir command requires at least 1 argument\n${USAGE}`);
  }

  let recursive = false;
  let directoryPaths: string[];

  if (args[0] === "-p") {
    if (args.length < 2) {
      return executeError(
        `mkdir -p command requires at least 1 path argument\n${USAGE}`,
      );
    }
    recursive = true;
    directoryPaths = args.slice(1);
  } else {
    directoryPaths = args;
  }

  if (directoryPaths.length === 0 || directoryPaths.some((p) => !p)) {
    return executeError(
      `mkdir command requires valid path arguments\n${USAGE}`,
    );
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
