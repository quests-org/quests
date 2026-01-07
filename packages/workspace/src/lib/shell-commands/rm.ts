import fs from "node:fs/promises";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { pathExists } from "../path-exists";
import { createError, createSuccess, type FileOperationResult } from "./types";

export async function rmCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return createError(
      "rm command requires at least 1 argument: rm [-r] <file|directory> [<file|directory> ...]",
    );
  }

  let recursive = false;
  let targetPaths: string[];

  if (args[0] === "-r") {
    if (args.length < 2) {
      return createError(
        "rm -r command requires at least 1 path argument: rm -r <directory> [<directory> ...]",
      );
    }
    recursive = true;
    targetPaths = args.slice(1);
  } else {
    targetPaths = args;
  }

  if (targetPaths.length === 0 || targetPaths.some((p) => !p)) {
    return createError("rm command requires valid path arguments");
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
      return createError(
        `rm: cannot remove '${targetPath}': No such file or directory`,
      );
    }

    try {
      const stats = await fs.stat(absolutePath);

      if (stats.isDirectory()) {
        if (!recursive) {
          return createError(
            `rm: cannot remove '${targetPath}': Is a directory`,
          );
        }

        await fs.rm(absolutePath, { force: true, recursive: true });
      } else {
        await fs.unlink(absolutePath);
      }
    } catch (error) {
      return createError(
        `rm command failed for '${targetPath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const pathsStr = targetPaths.join(" ");
  const command = recursive ? `rm -r ${pathsStr}` : `rm ${pathsStr}`;
  return createSuccess(command);
}
