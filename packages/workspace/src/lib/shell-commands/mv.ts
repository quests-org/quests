import fs from "node:fs/promises";
import path from "node:path";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { executeError } from "../execute-error";
import { pathExists } from "../path-exists";
import { type FileOperationResult } from "./types";
import { shellSuccess, validateNoGlobs } from "./utils";

const COMMAND_NAME = "mv";

export const MV_COMMAND = {
  description: `usage: ${COMMAND_NAME} source target\n       ${COMMAND_NAME} source ... directory`,
  examples: [
    `${COMMAND_NAME} src/old.ts src/new.ts`,
    `${COMMAND_NAME} file1.txt file2.txt dest-dir/`,
  ],
  name: COMMAND_NAME,
} as const;

export async function mvCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length < 2) {
    return executeError(
      `${MV_COMMAND.name} command requires at least 2 arguments\n${MV_COMMAND.description}`,
    );
  }

  const sourcePaths = args.slice(0, -1);
  const destPath = args.at(-1) ?? "";

  if (sourcePaths.length === 0 || !destPath) {
    return executeError(
      `${MV_COMMAND.name} command requires valid source and destination path arguments\n${MV_COMMAND.description}`,
    );
  }

  const allPaths = [...sourcePaths, destPath];
  const globValidation = validateNoGlobs(allPaths, MV_COMMAND.name);
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
    return executeError(
      `${MV_COMMAND.name}: target '${destPath}' is not a directory`,
    );
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
        `${MV_COMMAND.name}: cannot stat '${sourcePath}': No such file or directory`,
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
        `${MV_COMMAND.name}: cannot move '${sourcePath}' to '${destPath}': No such file or directory`,
      );
    }

    if (absoluteSourcePath === finalDestPath) {
      continue;
    }

    try {
      await fs.rename(absoluteSourcePath, finalDestPath);
    } catch (error) {
      return executeError(
        `${MV_COMMAND.name} command failed for '${sourcePath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const pathsStr = [...sourcePaths, destPath].join(" ");
  return shellSuccess({ command: `${MV_COMMAND.name} ${pathsStr}` });
}
