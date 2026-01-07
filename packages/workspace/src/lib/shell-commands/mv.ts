import fs from "node:fs/promises";
import path from "node:path";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { executeError } from "../execute-error";
import { pathExists } from "../path-exists";
import { type FileOperationResult } from "./types";
import { shellSuccess, validateNoGlobs } from "./utils";

const USAGE = "usage: mv source target\n       mv source ... directory";

export const MV_COMMAND = {
  description: USAGE,
  examples: ["mv src/old.ts src/new.ts", "mv file1.txt file2.txt dest-dir/"],
};

export async function mvCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length < 2) {
    return executeError(`mv command requires at least 2 arguments\n${USAGE}`);
  }

  const sourcePaths = args.slice(0, -1);
  const destPath = args.at(-1) ?? "";

  if (sourcePaths.length === 0 || !destPath) {
    return executeError(
      `mv command requires valid source and destination path arguments\n${USAGE}`,
    );
  }

  const allPaths = [...sourcePaths, destPath];
  const globValidation = validateNoGlobs(allPaths, "mv");
  if (globValidation.isErr()) {
    return globValidation;
  }

  const fixedDestResult = ensureRelativePath(destPath);
  if (fixedDestResult.isErr()) {
    return fixedDestResult;
  }

  const absoluteDestPath = absolutePathJoin(
    appConfig.appDir,
    fixedDestResult.value,
  );

  let destIsDirectory = false;
  try {
    const destStats = await fs.stat(absoluteDestPath);
    destIsDirectory = destStats.isDirectory();
  } catch {
    destIsDirectory = false;
  }

  if (sourcePaths.length > 1 && !destIsDirectory) {
    return executeError(`mv: target '${destPath}' is not a directory`);
  }

  for (const sourcePath of sourcePaths) {
    const fixedSourceResult = ensureRelativePath(sourcePath);
    if (fixedSourceResult.isErr()) {
      return fixedSourceResult;
    }

    const absoluteSourcePath = absolutePathJoin(
      appConfig.appDir,
      fixedSourceResult.value,
    );

    const sourceExists = await pathExists(absoluteSourcePath);
    if (!sourceExists) {
      return executeError(
        `mv: cannot stat '${sourcePath}': No such file or directory`,
      );
    }

    const finalDestPath = destIsDirectory
      ? path.join(absoluteDestPath, path.basename(absoluteSourcePath))
      : absoluteDestPath;

    const destDir = path.dirname(finalDestPath);
    try {
      await fs.access(destDir);
    } catch {
      return executeError(
        `mv: cannot move '${sourcePath}' to '${destPath}': No such file or directory`,
      );
    }

    if (absoluteSourcePath === finalDestPath) {
      continue;
    }

    try {
      await fs.rename(absoluteSourcePath, finalDestPath);
    } catch (error) {
      return executeError(
        `mv command failed for '${sourcePath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const pathsStr = [...sourcePaths, destPath].join(" ");
  return shellSuccess(`mv ${pathsStr}`);
}
