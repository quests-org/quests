import fs from "node:fs/promises";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { executeError } from "../execute-error";
import { pathExists } from "../path-exists";
import { type FileOperationResult } from "./types";
import { shellSuccess, validateNoGlobs } from "./utils";

const USAGE = "usage: rm [-f] [-r] file ...";

export const RM_COMMAND = {
  description: USAGE,
  examples: [
    "rm src/temp.json",
    "rm -r build/",
    "rm file1.txt file2.txt file3.txt",
    "rm -rf dist/ build/",
  ],
};

export async function rmCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return executeError(`rm command requires at least 1 argument\n${USAGE}`);
  }

  let recursive = false;
  let force = false;
  const targetPaths: string[] = [];

  for (const arg of args) {
    switch (arg) {
      case "-f": {
        force = true;

        break;
      }
      case "-fr":
      case "-rf": {
        recursive = true;
        force = true;

        break;
      }
      case "-r": {
        recursive = true;

        break;
      }
      default: {
        targetPaths.push(arg);
      }
    }
  }

  if (targetPaths.length === 0) {
    return executeError(
      `rm command requires at least 1 path argument after flags\n${USAGE}`,
    );
  }

  if (targetPaths.some((p) => !p)) {
    return executeError(`rm command requires valid path arguments\n${USAGE}`);
  }

  const globValidation = validateNoGlobs(targetPaths, "rm");
  if (globValidation.isErr()) {
    return globValidation;
  }

  for (const targetPath of targetPaths) {
    const fixedPathResult = ensureRelativePath(targetPath);
    if (fixedPathResult.isErr()) {
      return fixedPathResult;
    }

    const absolutePath = absolutePathJoin(
      appConfig.appDir,
      fixedPathResult.value,
    );

    const exists = await pathExists(absolutePath);
    if (!exists) {
      if (force) {
        continue;
      }
      return executeError(
        `rm: cannot remove '${targetPath}': No such file or directory`,
      );
    }

    try {
      const stats = await fs.stat(absolutePath);

      if (stats.isDirectory()) {
        if (!recursive) {
          return executeError(
            `rm: cannot remove '${targetPath}': Is a directory`,
          );
        }

        await fs.rm(absolutePath, { force: true, recursive: true });
      } else {
        await fs.unlink(absolutePath);
      }
    } catch (error) {
      if (force) {
        continue;
      }
      return executeError(
        `rm command failed for '${targetPath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const pathsStr = targetPaths.join(" ");
  const flags = [];
  if (recursive) {
    flags.push("-r");
  }
  if (force) {
    flags.push("-f");
  }
  const flagsStr = flags.length > 0 ? `${flags.join(" ")} ` : "";
  const command = `rm ${flagsStr}${pathsStr}`;
  return shellSuccess({ command });
}
